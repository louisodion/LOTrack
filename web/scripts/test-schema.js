/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const contents = fs.readFileSync(path.resolve(__dirname, "..", ".env.local"), "utf8");
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .filter((line) => /^[^#=\s]+=/.test(line))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      }),
  );
}

(async () => {
  const env = loadEnv();
  const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const schemaChecks = {
    profiles: "role,permissions",
    categories: "id,workspace_id,name,description,created_by",
    products: "category_id,description,cost_price,selling_price,supplier,image_url,unit,expiry_date,barcode,overstock_threshold",
    stock_movements: "unit_cost,unit_price",
  };
  for (const [table, columns] of Object.entries(schemaChecks)) {
    const { error } = await client.from(table).select(columns).limit(0);
    if (error) throw new Error(`${table}: ${error.message || error.details || error.hint || error.code || JSON.stringify(error)}`);
    console.log(`${table}: reachable with RLS`);
  }

  const { error: rpcError } = await client.rpc("record_stock_movement", {
    p_product_id: "00000000-0000-0000-0000-000000000000",
    p_type: "stock_in",
    p_quantity: 1,
    p_note: "schema check",
  });

  if (!rpcError || !/Authentication required/i.test(rpcError.message)) {
    throw new Error(`record_stock_movement RPC check failed: ${rpcError?.message || "unexpected success"}`);
  }

  console.log("record_stock_movement: reachable and authentication-protected");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
