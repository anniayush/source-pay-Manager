# ProcureFlow on SAP CAP

ProcureFlow is now an SAP CAP application for the full procure-to-pay lifecycle:

- supplier onboarding
- purchase requisitions
- purchase order issuance
- goods receipt recording
- invoice capture and three-way matching
- payment execution

## Stack

- Backend: SAP CAP (`@sap/cds`)
- CLI: SAP CAP CLI (`@sap/cds-dk`)
- Database: SQLite via `@cap-js/sqlite`
- Frontend: static CAP-served HTML, CSS, and JavaScript

## CAP structure

```text
app/
  index.html
  styles.css
  app.js
db/
  schema.cds
  data/
srv/
  procure-service.cds
  procure-service.js
```

## Run locally

```bash
npm install
npm run deploy
npm run dev
```

You can also use the CAP CLI directly:

```bash
npx cds deploy --to sqlite:db/procureflow.sqlite
npx cds watch
```

Then open [http://localhost:4004](http://localhost:4004).

## Service endpoint

- OData root: `/odata/v4/procureflow`
- Custom overview action: `POST /odata/v4/procureflow/getOverview`

The seed data is provided as CAP CSV files in `db/data/`, and CAP handlers generate document numbers plus update workflow statuses when purchase orders, receipts, invoices, and payments are created.
