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
    profiles: "role,permissions,email",
    categories: "id,workspace_id,name,description,created_by",
    products: "category_id,description,cost_price,selling_price,supplier,image_url,unit,expiry_date,barcode,overstock_threshold",
    stock_movements: "unit_cost,unit_price,sale_id,sale_item_id",
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

  const { error: saleRpcError } = await client.rpc("create_sale", {
    p_customer_id: null,
    p_items: [],
    p_discount: 0,
    p_tax: 0,
    p_payment_method: "cash",
    p_amount_paid: 0,
    p_notes: null,
  });
  if (!saleRpcError || !/Authentication required/i.test(saleRpcError.message)) {
    throw new Error(`create_sale RPC check failed: ${saleRpcError?.message || "unexpected success"}`);
  }
  console.log("create_sale: reachable and authentication-protected");

  const { error: returnRpcError } = await client.rpc("return_sale_item", {
    p_sale_item_id: "00000000-0000-0000-0000-000000000000",
    p_quantity: 1,
    p_reason: "schema check",
  });
  if (!returnRpcError || !/Authentication required/i.test(returnRpcError.message)) {
    throw new Error(`return_sale_item RPC check failed: ${returnRpcError?.message || "unexpected success"}`);
  }
  console.log("return_sale_item: reachable and authentication-protected");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
