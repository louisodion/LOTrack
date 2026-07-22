# LOTrack Web

LOTrack is a tenant-safe inventory management MVP built with Next.js and Supabase.

## Features

- Email/password registration, sign-in, sign-out, and password recovery
- Business onboarding and per-user workspace setup
- Dashboard with inventory value, low-stock totals, and recent activity
- Product creation, listing, editing, and deletion
- Stock-in, stock-out, sale, return, and adjustment history
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

3. In the Supabase SQL editor, run `supabase/init-schema.sql`. This creates and upgrades the tables, indexes, row-level-security policies, and the transactional `record_stock_movement` function.

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

## Deployment

Deploy the `web` directory to a Next.js-compatible host and configure the same three public environment variables. The Paystack, Resend, staff-role, and invitation variables in `.env.example` are reserved for post-MVP modules; those integrations are not required for the inventory application.
