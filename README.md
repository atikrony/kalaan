# Kalaan ERP

Pre-order management for Malaysia → Bangladesh imports. Orders are identified by product photo + code (KL-0001).

## Setup (one time)
1. Create a free project at supabase.com → **SQL Editor** → paste and run `supabase/schema.sql`
   (creates the tables and a public `orders` image bucket).
2. Supabase → Project Settings → API: copy the **Project URL** and the **service_role** key.
3. Push this `erp` folder to GitHub → import it in Vercel → add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_PASSWORD` (the login password for your team)
4. Deploy.

Local run: copy `.env.example` to `.env.local`, fill in the values, then `npm install && npm run dev`.

## Workflow
1. **Shipments** → create the batch (e.g. "Dec 1st shipment (12th)"), set its status to `collecting`.
2. **+ New order** → take or upload the product photo, enter the customer, product, RM price, bill, and advance.
   The order status goes: pending (no advance) → confirmed (advance paid) → purchased → shipped → arrived → delivered.
3. In Malaysia, log what you spend under the shipment's **Malaysia purchases** section.
4. When the parcel lands, open the shipment → **Mark all open orders as arrived**. The photo grid lets you match each item to its customer
   (Ctrl+P prints the identification sheet).
5. On delivery, add the remaining **payment** (the amount is pre-filled with what's due) → mark it delivered.
   Use a **refund** payment for refunds.

Remaining due = bill + delivery charge − (advance + payments − refunds).
Estimated profit = bills − (RM spent × rate + cargo cost + COD charges).
