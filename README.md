# Kalaan ERP

Pre-order management for Malaysia → Bangladesh imports. Each order is identified by its product photo and a code (KL-0001).

## Run locally
```
npm install
npm run dev
```
Log in with username `admin` and password `123` (both set in `.env.local`).
Locally, data is saved to `data/db.json` and images to `public/uploads/`.

## Deploy on Vercel
1. Push this folder to GitHub and import it in Vercel.
2. Vercel project → **Storage**:
   - Create a **Blob** store and connect it (this stores the images).
   - Create an **Upstash Redis** database from the Marketplace and connect it (this stores the data).
   Vercel adds the needed keys automatically.
3. Settings → Environment Variables: add `APP_PASSWORD` (the admin login) and `SESSION_SECRET` (any long random text).
4. Redeploy.

## Users
- The owner logs in as `admin` with `APP_PASSWORD`. On the **Users** page they can add moderators, reset passwords and disable accounts.
- Passwords are saved as salted scrypt hashes, never as plain text. Login sessions are signed cookies.
- The **Activity log** (admin only) shows every change from the last 30 days: who changed what, with old → new values.

## Screens (Stitch design: "Pre-Order ERP Manager")
- **Orders** (`/`): KPI tiles, shipment batch cards, the selected batch's ledger, and an order detail panel (`?s=<shipment>&o=<order>`).
  New Order / New Shipment open as modals. Status, batch, note and photos save inline; payments are recorded in the panel.
  "Manifest CSV" downloads the current list.
- **Reconciliation**: per-batch profit and margin, receivables, and cash by payment method.
- **Customers**: orders grouped by mobile number, with totals and dues.
- **Team** and **Activity** (admin only).

Profit per batch = bills − (RM spent × ৳/RM rate) − cargo cost − COD charges. Set the rate and cargo cost in *Shipment settings*.
Cargo cost is split equally across the batch's orders as each order's freight share.

## Workflow
pending (no advance) → confirmed (advance paid) → purchased → shipped → arrived → delivered.
Remaining due = bill + delivery charge − (advances + payments − refunds).
