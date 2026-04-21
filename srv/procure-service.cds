using { procureflow as db } from '../db/schema';

type OverviewMetrics {
  totalSpend        : Decimal(15,2);
  openRequisitions  : Integer;
  activePOs         : Integer;
  pendingInvoices   : Integer;
  supplierCount     : Integer;
}

type SpendByCategory {
  label             : String(80);
  value             : Decimal(15,2);
}

type TimelineEvent {
  stage             : String(30);
  reference         : String(140);
  status            : String(30);
  eventDate         : Date;
}

type OverviewResponse {
  metrics           : OverviewMetrics;
  spendByCategory   : many SpendByCategory;
  timeline          : many TimelineEvent;
}

service ProcureService @(path: '/odata/v4/procureflow') {
  entity Suppliers      as projection on db.Suppliers;
  entity Requisitions   as projection on db.Requisitions;
  entity PurchaseOrders as projection on db.PurchaseOrders;
  entity Receipts       as projection on db.Receipts;
  entity Invoices       as projection on db.Invoices;
  entity Payments       as projection on db.Payments;

  action getOverview() returns OverviewResponse;
}
