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

  for (const table of ["profiles", "products", "stock_movements"]) {
    const { error } = await client.from(table).select("*", { count: "exact", head: true });
    if (error) throw new Error(`${table}: ${error.message}`);
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
