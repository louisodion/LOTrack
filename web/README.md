# LOTrack Web

LOTrack is a tenant-safe inventory management MVP built with Next.js and Supabase.

## Features

- Email/password registration, sign-in, sign-out, and password recovery
- Business onboarding and per-user workspace setup
- Dashboard with inventory value, low-stock totals, and recent activity
- Product creation, listing, editing, and deletion
- Stock-in, stock-out, sale, return, and adjustment history
- Workspace-specific category creation, editing, deletion, product filtering, and inline category creation
- Expanded product catalog fields for cost/selling prices, supplier, unit, image URL, expiry, barcode, and overstock thresholds
- Date-filtered product/category performance, KPI cards, rule-based insights, charts, pagination, and CSV export
- Owner/admin financial visibility and database-enforced product/category management permissions
- Atomic stock updates that reject insufficient inventory
- Supabase row-level security for workspace isolation
- Responsive navigation and authenticated route guards

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set:

   ```dotenv
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. In the Supabase SQL editor, run these files in order:

   - `supabase/init-schema.sql`
   - `supabase/migrations/20260723_catalog_analytics.sql`
   - `supabase/migrations/20260723_team_roles.sql`
   - `supabase/migrations/20260723_sales_customers.sql`
   - `supabase/migrations/20260723_suppliers_purchasing.sql`
   - `supabase/migrations/20260723_alerts_notifications.sql`

   The migration preserves existing products, adds nullable categories and expanded catalog fields, records cost/price snapshots for future sales, and installs role-aware policies.

4. In Supabase Authentication, add `http://localhost:3000/reset-password` to the allowed redirect URLs. Add the production equivalent before deployment.

5. Start the app:

   ```bash
   npm run dev
   ```

## Verification

```bash
npm run lint
npm run build
npm run test:routes
```

The route test expects the app at `http://localhost:3000`. Override it with `APP_URL` when needed.

For the live database integration test, add a disposable authenticated account to `.env.local`:

```dotenv
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=a-secure-test-password
```

Then run `npm run test:integration`. The test creates a uniquely named product and verifies that a stock-in movement updates its quantity atomically.

## Inventory rules

- `stock_in`, `return`, and `adjustment` add to quantity.
- `stock_out` and `sale` subtract from quantity.
- A movement cannot make inventory negative.
- Product deletion is blocked after movements exist so audit history remains intact.
- SKUs are unique within a workspace.
- Sales analytics use the cost and selling price captured when each sale is recorded. Sales created before the analytics migration have no historical price snapshots and therefore contribute units sold but not estimated historical revenue/profit.

## Roles and permissions

- Existing workspace creators migrate as `owner`.
- Owners and administrators can manage categories, products, financial analytics, and exports.
- Staff can view the catalog and record stock movements.
- A staff profile can be granted product management by setting `permissions.manage_products` to `true`.
- Owners and administrators can create seven-day invitation links from `/team`.
- Invitees must sign in with the exact invited email before accepting the link.
- Owners can promote administrators. Administrators can manage staff but cannot promote or remove other administrators.
- Removing a member immediately separates their profile from the business workspace and sends them through onboarding for a new workspace.
- Financial values are hidden from staff in the application interface. For higher-assurance reporting deployments, expose financial analytics exclusively through a server-side reporting API rather than direct browser queries.

### Team invitation flow

1. Open **Team** from the authenticated navigation.
2. Enter the member email, choose a role, and select staff permissions.
3. Create the invitation and copy its link.
4. Send the link through your preferred secure messaging channel.
5. The member signs in or creates an account using the invited email, reopens the link if email verification was required, and accepts.

The initial release uses copyable secure links and does not require an email provider. Resend delivery can be added later without changing the invitation database model.

## Sales and customers

- `/sales/new` records atomic multi-product sales with optional customers, discounts, tax, payment methods, partial payment, and notes.
- `/sales` provides searchable receipt and payment history.
- `/sales/[saleId]` is a printable receipt and supports partial or full line-item returns.
- `/customers` stores reusable customer contact information.
- Completing a sale reduces every product quantity in one database transaction. If any line has insufficient stock, nothing is written.
- Returns restore inventory, record the refund value, and reduce dashboard revenue/profit for the selected period.
- Sales permissions are controlled by `permissions.record_sales`; owners and administrators always have access.

## Suppliers and purchasing

- `/suppliers` manages the supplier directory.
- `/purchases/new` receives multi-product supplier deliveries and records initial payment.
- `/purchases` tracks purchase totals, supplier balances, and follow-up payments.
- Receiving is atomic and updates product quantity plus weighted-average cost.
- Every received line creates a linked stock-in movement for the audit trail.
- Purchase access is controlled by `permissions.manage_purchases`; owners and administrators always have access.

## Alerts and notifications

- `/alerts` generates an in-app action center from real workspace data.
- Rules cover out-of-stock, low-stock, expiry, projected stockout, fast-selling products, overdue customer balances, and outstanding supplier balances.
- Owners and administrators can configure warning windows and the fast-selling multiplier.
- Read and dismissed state is stored per user, so one staff member does not clear another member's notification.
- Refreshing resolves alerts whose underlying condition no longer exists and reactivates recurring conditions.

## Analytics definitions

- Inventory value: current quantity × cost price
- Potential revenue: current quantity × selling price
- Profit: captured sale revenue − captured cost of goods
- Average margin: total profit ÷ total sale revenue
- Close to expiry: expiry date within the next 30 days
- Overstocked: current quantity at or above the optional product overstock threshold
- Days remaining: current quantity ÷ average daily sales in the selected period

All calculations handle missing sales and division by zero with explicit empty states.

## Deployment

Deploy the `web` directory to a Next.js-compatible host and configure the same three public environment variables. The Paystack, Resend, staff-role, and invitation variables in `.env.example` are reserved for post-MVP modules; those integrations are not required for the inventory application.
