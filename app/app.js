const SERVICE_ROOT = "/odata/v4/procureflow";

const state = {
  overview: null,
  suppliers: [],
  requisitions: [],
  purchaseOrders: [],
  receipts: [],
  invoices: [],
  payments: []
};

async function odata(path, options = {}) {
  const response = await fetch(`${SERVICE_ROOT}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = payload?.error?.message || payload?.error || "Request failed.";
    throw new Error(error);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function readEntitySet(name, expand = "") {
  const suffix = expand ? `?$expand=${expand}` : "";
  const payload = await odata(`/${name}${suffix}`);
  return payload.value || [];
}

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function pill(status) {
  return `<span class="pill">${status}</span>`;
}

function createTable(containerId, columns, rows) {
  const container = document.getElementById(containerId);
  const template = document.getElementById("tableTemplate");
  const table = template.content.firstElementChild.cloneNode(true);
  const theadRow = document.createElement("tr");

  for (const column of columns) {
    const th = document.createElement("th");
    th.textContent = column.label;
    theadRow.appendChild(th);
  }

  table.querySelector("thead").appendChild(theadRow);

  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const column of columns) {
      const td = document.createElement("td");
      const value = typeof column.render === "function" ? column.render(row[column.key], row) : row[column.key];
      td.innerHTML = value ?? "";
      tr.appendChild(td);
    }
    table.querySelector("tbody").appendChild(tr);
  }

  container.innerHTML = "";
  container.appendChild(table);
}

function renderMetrics() {
  const metrics = state.overview?.metrics;
  if (!metrics) return;

  const items = [
    ["Total Spend", currency(metrics.totalSpend)],
    ["Open Requisitions", metrics.openRequisitions],
    ["Active POs", metrics.activePOs],
    ["Pending Invoices", metrics.pendingInvoices],
    ["Suppliers", metrics.supplierCount]
  ];

  document.getElementById("metricsGrid").innerHTML = items
    .map(
      ([label, value]) => `
        <article class="metric-card">
          <span class="eyebrow">${label}</span>
          <strong>${value}</strong>
        </article>
      `
    )
    .join("");
}

function renderSpendChart() {
  const chart = document.getElementById("spendChart");
  const series = state.overview?.spendByCategory || [];
  const max = Math.max(...series.map((item) => Number(item.value || 0)), 1);

  chart.innerHTML = series
    .map(
      (item) => `
        <div class="bar-row">
          <header>
            <span>${item.label}</span>
            <strong>${currency(item.value)}</strong>
          </header>
          <div class="bar-track">
            <div class="bar-fill" style="width:${(Number(item.value || 0) / max) * 100}%"></div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderTimeline() {
  const timeline = document.getElementById("timeline");
  timeline.innerHTML = (state.overview?.timeline || [])
    .map(
      (item) => `
        <article class="timeline-item">
          <span>${item.stage}</span>
          <h4>${item.reference}</h4>
          <p>${item.status} on ${item.eventDate}</p>
        </article>
      `
    )
    .join("");
}

function renderWorkflowGraph() {
  const container = document.getElementById("workflowGraph");
  const stages = [
    { label: "Suppliers", value: state.suppliers.length },
    { label: "Requisitions", value: state.requisitions.length },
    { label: "POs", value: state.purchaseOrders.length },
    { label: "Receipts", value: state.receipts.length },
    { label: "Invoices", value: state.invoices.length },
    { label: "Payments", value: state.payments.length }
  ];
  const max = Math.max(...stages.map((stage) => stage.value), 1);
  const width = 720;
  const height = 260;
  const paddingX = 46;
  const paddingY = 30;
  const stepX = (width - paddingX * 2) / (stages.length - 1);

  const points = stages.map((stage, index) => {
    const x = paddingX + stepX * index;
    const y = height - paddingY - (stage.value / max) * (height - paddingY * 2);
    return { ...stage, x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
  const gridLines = Array.from({ length: 4 }, (_, index) => {
    const value = Math.round((max / 4) * (4 - index));
    const y = paddingY + ((height - paddingY * 2) / 4) * index;
    return { value, y };
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Procurement workflow volumes">
      ${gridLines
        .map(
          (line) => `
            <line x1="${paddingX}" y1="${line.y}" x2="${width - paddingX}" y2="${line.y}" class="graph-grid"></line>
            <text x="8" y="${line.y + 4}" class="graph-axis">${line.value}</text>
          `
        )
        .join("")}
      <path d="${areaPath}" class="graph-area"></path>
      <path d="${linePath}" class="graph-line"></path>
      ${points
        .map(
          (point) => `
            <circle cx="${point.x}" cy="${point.y}" r="6" class="graph-point"></circle>
            <text x="${point.x}" y="${height - 6}" text-anchor="middle" class="graph-label">${point.label}</text>
            <text x="${point.x}" y="${point.y - 14}" text-anchor="middle" class="graph-value">${point.value}</text>
          `
        )
        .join("")}
    </svg>
  `;
}

function renderSelectOptions() {
  const supplierOptions = state.suppliers
    .map((supplier) => `<option value="${supplier.ID}">${supplier.name}</option>`)
    .join("");

  document.getElementById("requisitionSupplierSelect").innerHTML =
    '<option value="">Preferred supplier</option>' + supplierOptions;
  document.getElementById("poSupplierSelect").innerHTML =
    '<option value="">Supplier</option>' + supplierOptions;
  document.getElementById("invoiceSupplierSelect").innerHTML =
    '<option value="">Supplier</option>' + supplierOptions;

  document.getElementById("poRequisitionSelect").innerHTML =
    '<option value="">Requisition</option>' +
    state.requisitions.map((item) => `<option value="${item.ID}">${item.title}</option>`).join("");

  document.getElementById("receiptPoSelect").innerHTML =
    '<option value="">Purchase order</option>' +
    state.purchaseOrders.map((item) => `<option value="${item.ID}">${item.poNumber}</option>`).join("");

  document.getElementById("invoicePoSelect").innerHTML =
    '<option value="">Purchase order</option>' +
    state.purchaseOrders.map((item) => `<option value="${item.ID}">${item.poNumber}</option>`).join("");

  document.getElementById("invoiceReceiptSelect").innerHTML =
    '<option value="">Matching receipt</option>' +
    state.receipts.map((item) => `<option value="${item.ID}">${item.receiptNumber}</option>`).join("");

  document.getElementById("paymentInvoiceSelect").innerHTML =
    '<option value="">Approved invoice</option>' +
    state.invoices
      .filter((item) => item.status !== "Paid")
      .map((item) => `<option value="${item.ID}">${item.invoiceNumber}</option>`)
      .join("");
}

function renderTables() {
  createTable(
    "supplierList",
    [
      { key: "name", label: "Supplier" },
      { key: "category", label: "Category" },
      { key: "paymentTerms", label: "Terms" },
      { key: "leadTimeDays", label: "Lead Time" },
      { key: "status", label: "Status", render: (value) => pill(value) }
    ],
    state.suppliers
  );

  createTable(
    "requisitionList",
    [
      { key: "title", label: "Title" },
      { key: "department", label: "Department" },
      { key: "requester", label: "Requester" },
      { key: "amount", label: "Amount", render: (value) => currency(value) },
      { key: "status", label: "Status", render: (value) => pill(value) }
    ],
    state.requisitions
  );

  createTable(
    "poList",
    [
      { key: "poNumber", label: "PO Number" },
      { key: "supplierName", label: "Supplier" },
      { key: "amount", label: "Amount", render: (value) => currency(value) },
      { key: "expectedDate", label: "Expected" },
      { key: "status", label: "Status", render: (value) => pill(value) }
    ],
    state.purchaseOrders
  );

  createTable(
    "receiptList",
    [
      { key: "receiptNumber", label: "Receipt" },
      { key: "poNumber", label: "PO" },
      { key: "warehouse", label: "Warehouse" },
      { key: "qualityStatus", label: "Quality", render: (value) => pill(value) },
      { key: "receivedDate", label: "Received" }
    ],
    state.receipts
  );

  createTable(
    "invoiceList",
    [
      { key: "invoiceNumber", label: "Invoice" },
      { key: "supplierName", label: "Supplier" },
      { key: "amount", label: "Amount", render: (value) => currency(value) },
      { key: "matchStatus", label: "Match", render: (value) => pill(value) },
      { key: "status", label: "Status", render: (value) => pill(value) }
    ],
    state.invoices
  );

  createTable(
    "paymentList",
    [
      { key: "paymentReference", label: "Payment Ref" },
      { key: "invoiceNumber", label: "Invoice" },
      { key: "amount", label: "Amount", render: (value) => currency(value) },
      { key: "method", label: "Method" },
      { key: "status", label: "Status", render: (value) => pill(value) }
    ],
    state.payments
  );
}

async function loadData() {
  const [overviewPayload, suppliers, requisitions, purchaseOrders, receipts, invoices, payments] = await Promise.all([
    odata("/getOverview", { method: "POST" }),
    readEntitySet("Suppliers"),
    readEntitySet("Requisitions", "supplier"),
    readEntitySet("PurchaseOrders", "supplier,requisition"),
    readEntitySet("Receipts", "purchaseOrder"),
    readEntitySet("Invoices", "supplier,purchaseOrder,receipt"),
    readEntitySet("Payments", "invoice")
  ]);

  state.overview = overviewPayload.value || overviewPayload;
  state.suppliers = suppliers;
  state.requisitions = requisitions.map((item) => ({
    ...item,
    supplierName: item.supplier?.name || ""
  }));
  state.purchaseOrders = purchaseOrders.map((item) => ({
    ...item,
    supplierName: item.supplier?.name || ""
  }));
  state.receipts = receipts.map((item) => ({
    ...item,
    poNumber: item.purchaseOrder?.poNumber || ""
  }));
  state.invoices = invoices.map((item) => ({
    ...item,
    supplierName: item.supplier?.name || "",
    poNumber: item.purchaseOrder?.poNumber || ""
  }));
  state.payments = payments.map((item) => ({
    ...item,
    invoiceNumber: item.invoice?.invoiceNumber || ""
  }));

  renderMetrics();
  renderSpendChart();
  renderTimeline();
  renderWorkflowGraph();
  renderSelectOptions();
  renderTables();
}

function formToJson(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  for (const key of Object.keys(data)) {
    if (data[key] === "") delete data[key];
  }
  return data;
}

async function bindForm(id, entityName) {
  const form = document.getElementById(id);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await odata(`/${entityName}`, {
        method: "POST",
        body: JSON.stringify(formToJson(form))
      });
      form.reset();
      await loadData();
    } catch (error) {
      alert(error.message);
    }
  });
}

document.getElementById("refreshButton").addEventListener("click", loadData);

bindForm("supplierForm", "Suppliers");
bindForm("requisitionForm", "Requisitions");
bindForm("poForm", "PurchaseOrders");
bindForm("receiptForm", "Receipts");
bindForm("invoiceForm", "Invoices");
bindForm("paymentForm", "Payments");

loadData().catch((error) => {
  document.body.innerHTML = `<pre style="padding:20px">${error.message}</pre>`;
});
