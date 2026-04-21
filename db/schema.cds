namespace procureflow;

using { cuid, managed } from '@sap/cds/common';

entity Suppliers : cuid, managed {
  name           : String(120);
  category       : String(80);
  email          : String(120);
  phone          : String(40);
  status         : String(30);
  leadTimeDays   : Integer;
  paymentTerms   : String(40);
  rating         : Decimal(3,1);

  requisitions   : Composition of many Requisitions
                     on requisitions.supplier = $self;
  purchaseOrders : Composition of many PurchaseOrders
                     on purchaseOrders.supplier = $self;
  invoices       : Composition of many Invoices
                     on invoices.supplier = $self;
}

entity Requisitions : cuid, managed {
  title         : String(140);
  department    : String(80);
  requester     : String(100);
  description   : String(500);
  amount        : Decimal(15,2);
  priority      : String(20);
  status        : String(30);
  neededBy      : Date;
  supplier      : Association to Suppliers;
  purchaseOrder : Association to PurchaseOrders;
}

entity PurchaseOrders : cuid, managed {
  poNumber      : String(30);
  requisition   : Association to Requisitions;
  supplier      : Association to Suppliers;
  orderDate     : Date;
  expectedDate  : Date;
  amount        : Decimal(15,2);
  status        : String(30);
  notes         : String(500);

  receipts      : Composition of many Receipts
                    on receipts.purchaseOrder = $self;
  invoices      : Composition of many Invoices
                    on invoices.purchaseOrder = $self;
}

entity Receipts : cuid, managed {
  receiptNumber : String(30);
  purchaseOrder : Association to PurchaseOrders;
  receivedDate  : Date;
  warehouse     : String(100);
  qualityStatus : String(30);
  status        : String(30);
  receivedBy    : String(100);
  notes         : String(500);
}

entity Invoices : cuid, managed {
  invoiceNumber : String(30);
  purchaseOrder : Association to PurchaseOrders;
  receipt       : Association to Receipts;
  supplier      : Association to Suppliers;
  invoiceDate   : Date;
  dueDate       : Date;
  amount        : Decimal(15,2);
  status        : String(30);
  matchStatus   : String(30);

  payments      : Composition of many Payments
                    on payments.invoice = $self;
}

entity Payments : cuid, managed {
  paymentReference : String(30);
  invoice          : Association to Invoices;
  paymentDate      : Date;
  amount           : Decimal(15,2);
  method           : String(30);
  status           : String(30);
  processedBy      : String(100);
}
