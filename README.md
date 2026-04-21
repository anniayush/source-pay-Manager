# ProcureFlow

**Enterprise procure-to-pay management built with SAP CAP**

`🏢 Procurement` `⚙️ SAP CAP` `📦 OData Services` `🗄️ SQLite` `💳 Procure-to-Pay`

ProcureFlow is a full-cycle procurement application that models the complete purchase journey from supplier onboarding to final payment. The project is built on **SAP Cloud Application Programming Model (CAP)** with **CDS domain modeling**, **OData V4 services**, **SQLite persistence**, and a custom frontend served directly by CAP.

## 🚀 What This Project Covers

- Supplier onboarding and vendor master tracking
- Purchase requisition creation
- Purchase order issuance
- Goods receipt recording
- Invoice capture and match validation
- Payment execution and spend visibility
- Dashboard metrics and recent workflow activity

## ✨ Why It Stands Out

- CAP-native architecture using `db/`, `srv/`, and `app/`
- CDS-based business model for the full procure-to-pay lifecycle
- OData V4 services for transactional operations
- Automatic document numbering for POs, receipts, invoices, and payments
- Status propagation across the workflow after key business events
- Seeded demo data for immediate local testing

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Application Runtime | SAP CAP (`@sap/cds`) |
| CAP CLI | SAP CAP CLI (`@sap/cds-dk`) |
| Database | SQLite (`@cap-js/sqlite`) |
| Domain Model | CDS |
| Service Protocol | OData V4 |
| Frontend | HTML, CSS, JavaScript |

## 🧭 Project Structure

```text
app/
  index.html              # Frontend entry
  styles.css              # UI styling
  app.js                  # OData-powered frontend logic

db/
  schema.cds              # CAP domain model
  data/                   # Seed CSV files
  procureflow.sqlite      # Local SQLite database

srv/
  procure-service.cds     # Service definition
  procure-service.js      # CAP handlers and business logic
```

## 🔄 Key Business Logic

The CAP service layer handles core workflow automation:

- Creates procurement document numbers automatically
- Marks requisitions as approved after PO creation
- Updates purchase orders after goods receipt posting
- Applies 2-way or 3-way invoice matching logic
- Marks invoices as paid after payment creation
- Exposes an overview action for dashboard KPIs and activity timeline

## ▶️ Local Setup

Install dependencies:

```bash
npm install
```

Deploy the data model to SQLite:

```bash
npm run deploy
```

Start the CAP development server:

```bash
npm run dev
```

Open the application in your browser:

[http://localhost:4004](http://localhost:4004)

## 💻 CAP CLI Commands

You can also run the project directly with CAP CLI commands:

```bash
npx cds deploy --to sqlite:db/procureflow.sqlite
npx cds watch
```

Useful checks:

```bash
npx cds build
npx cds --version
```

## 🔌 Service Endpoints

- Application root: `/`
- OData service root: `/odata/v4/procureflow`
- Overview action: `POST /odata/v4/procureflow/getOverview`

## 🌱 Seed Data

The project ships with demo data in `db/data/` for:

- suppliers
- requisitions
- purchase orders
- receipts
- invoices
- payments

This makes the application usable immediately after deployment without manual setup.

## 🎯 Use Case

This project is suitable for:

- SAP CAP learning and demonstration
- college capstone or enterprise systems coursework
- procure-to-pay workflow prototypes
- internal purchasing dashboard concepts

## 📘 Summary

ProcureFlow combines a clear enterprise use case with a proper SAP CAP implementation. It demonstrates how to model procurement operations with CDS, expose them through OData services, and deliver a functional frontend on top of a maintainable CAP backend.
