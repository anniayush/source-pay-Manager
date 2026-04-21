const cds = require("@sap/cds");
const { SELECT, UPDATE } = cds.ql;

async function nextSequence(tx, entity, field, prefix, start) {
  const rows = await tx.run(SELECT.from(entity).columns(field));
  const max = rows.reduce((highest, row) => {
    const value = row[field];
    const match = typeof value === "string" ? value.match(/(\d+)$/) : null;
    return Math.max(highest, match ? Number(match[1]) : start - 1);
  }, start - 1);

  return `${prefix}-${new Date().getFullYear()}-${String(max + 1).padStart(4, "0")}`;
}

module.exports = cds.service.impl(function () {
  const {
    Suppliers,
    Requisitions,
    PurchaseOrders,
    Receipts,
    Invoices,
    Payments
  } = cds.entities("procureflow");

  this.before("CREATE", "Suppliers", (req) => {
    req.data.status ??= "Active";
    req.data.rating ??= 0;
  });

  this.before("CREATE", "Requisitions", (req) => {
    req.data.status ??= "Draft";
  });

  this.before("CREATE", "PurchaseOrders", async (req) => {
    const tx = cds.transaction(req);
    req.data.status ??= "Issued";
    req.data.poNumber ??= await nextSequence(tx, PurchaseOrders, "poNumber", "PO", 1001);
  });

  this.after("CREATE", "PurchaseOrders", async (data, req) => {
    if (!data.requisition_ID) return;

    const tx = cds.transaction(req);
    await tx.run(
      UPDATE(Requisitions)
        .set({ status: "Approved", purchaseOrder_ID: data.ID })
        .where({ ID: data.requisition_ID })
    );
  });

  this.before("CREATE", "Receipts", async (req) => {
    const tx = cds.transaction(req);
    req.data.status ??= "Received";
    req.data.receiptNumber ??= await nextSequence(tx, Receipts, "receiptNumber", "GRN", 5001);
  });

  this.after("CREATE", "Receipts", async (data, req) => {
    if (!data.purchaseOrder_ID) return;

    const tx = cds.transaction(req);
    await tx.run(
      UPDATE(PurchaseOrders)
        .set({ status: "Partially Received" })
        .where({ ID: data.purchaseOrder_ID })
    );
  });

  this.before("CREATE", "Invoices", async (req) => {
    const tx = cds.transaction(req);
    req.data.invoiceNumber ??= await nextSequence(tx, Invoices, "invoiceNumber", "INV", 3001);
    req.data.status ??= "Approved";
    req.data.matchStatus ??= req.data.receipt_ID ? "3-Way Match" : "2-Way Match";
  });

  this.before("CREATE", "Payments", async (req) => {
    const tx = cds.transaction(req);
    req.data.paymentReference ??= await nextSequence(tx, Payments, "paymentReference", "PAY", 9001);
    req.data.status ??= "Completed";
  });

  this.after("CREATE", "Payments", async (data, req) => {
    if (!data.invoice_ID) return;

    const tx = cds.transaction(req);
    await tx.run(
      UPDATE(Invoices)
        .set({ status: "Paid" })
        .where({ ID: data.invoice_ID })
    );
  });

  this.on("getOverview", async (req) => {
    const tx = cds.transaction(req);
    const [payments, requisitions, purchaseOrders, invoices, suppliers, supplierRows] = await Promise.all([
      tx.run(SELECT.from(Payments).columns("amount", "status")),
      tx.run(SELECT.from(Requisitions).columns("status")),
      tx.run(SELECT.from(PurchaseOrders).columns("status")),
      tx.run(SELECT.from(Invoices).columns("status")),
      tx.run(SELECT.from(Suppliers).columns("ID")),
      tx.run(SELECT.from(Suppliers).columns("ID", "category"))
    ]);

    const allInvoices = await tx.run(
      SELECT.from(Invoices).columns("ID", "supplier_ID", "invoiceNumber", "invoiceDate", "status")
    );
    const allPayments = await tx.run(SELECT.from(Payments).columns("invoice_ID", "amount", "paymentDate", "status", "paymentReference"));
    const allPos = await tx.run(SELECT.from(PurchaseOrders).columns("poNumber", "orderDate", "status"));
    const allReceipts = await tx.run(SELECT.from(Receipts).columns("receiptNumber", "receivedDate", "status"));
    const allReqs = await tx.run(SELECT.from(Requisitions).columns("title", "createdAt", "status"));

    const invoiceToSupplier = new Map(allInvoices.map((invoice) => [invoice.ID, invoice.supplier_ID]));
    const supplierById = new Map(supplierRows.map((supplier) => [supplier.ID, supplier]));
    const spendByCategoryMap = new Map();

    for (const supplier of supplierRows) {
      spendByCategoryMap.set(supplier.category, 0);
    }

    for (const payment of allPayments) {
      if (payment.status !== "Completed") continue;
      const supplierId = invoiceToSupplier.get(payment.invoice_ID);
      const supplier = supplierById.get(supplierId);
      if (!supplier) continue;
      spendByCategoryMap.set(
        supplier.category,
        Number(spendByCategoryMap.get(supplier.category) || 0) + Number(payment.amount || 0)
      );
    }

    const timeline = [
      ...allReqs.map((row) => ({
        stage: "Requisition",
        reference: row.title,
        status: row.status,
        eventDate: row.createdAt?.slice?.(0, 10) || null
      })),
      ...allPos.map((row) => ({
        stage: "Purchase Order",
        reference: row.poNumber,
        status: row.status,
        eventDate: row.orderDate
      })),
      ...allReceipts.map((row) => ({
        stage: "Receipt",
        reference: row.receiptNumber,
        status: row.status,
        eventDate: row.receivedDate
      })),
      ...allInvoices.map((row) => ({
        stage: "Invoice",
        reference: row.invoiceNumber,
        status: row.status,
        eventDate: row.invoiceDate
      })),
      ...allPayments.map((row) => ({
        stage: "Payment",
        reference: row.paymentReference,
        status: row.status,
        eventDate: row.paymentDate
      }))
    ]
      .filter((row) => row.eventDate)
      .sort((a, b) => String(b.eventDate).localeCompare(String(a.eventDate)))
      .slice(0, 12);

    return {
      metrics: {
        totalSpend: payments
          .filter((row) => row.status === "Completed")
          .reduce((sum, row) => sum + Number(row.amount || 0), 0),
        openRequisitions: requisitions.filter((row) => !["Approved", "Rejected"].includes(row.status)).length,
        activePOs: purchaseOrders.filter((row) => ["Issued", "Partially Received"].includes(row.status)).length,
        pendingInvoices: invoices.filter((row) => row.status !== "Paid").length,
        supplierCount: suppliers.length
      },
      spendByCategory: Array.from(spendByCategoryMap.entries()).map(([label, value]) => ({
        label,
        value
      })),
      timeline
    };
  });
});
