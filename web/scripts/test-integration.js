/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  return env.split(/\r?\n/).reduce((acc, line) => {
    const match = line.match(/^([^#=\s]+)=(.*)$/);
    if (match) acc[match[1].trim()] = match[2].trim();
    return acc;
  }, {});
}

(async () => {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = env.TEST_USER_EMAIL;
  const password = env.TEST_USER_PASSWORD;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in web/.env.local');
    process.exit(1);
  }

  if (!email || !password) {
    console.error('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD in web/.env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('Signing in test user...');
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error('Sign in failed:', signInError.message);
    process.exit(1);
  }

  const userId = sessionData.session?.user.id;
  if (!userId) {
    console.error('Failed to get signed-in user id.');
    process.exit(1);
  }

  console.log('Fetching workspace scope from profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('user_id', userId)
    .single();

  if (profileError) {
    console.error('Failed to fetch profile workspace:', profileError.message);
    process.exit(1);
  }

  const workspaceId = profile?.workspace_id ?? userId;

  const productPayload = {
    name: `Integration Test Product ${Date.now()}`,
    sku: `ITP-${Math.floor(Math.random() * 100000)}`,
    quantity: 3,
    price: 12.5,
    reorder_threshold: 1,
    user_id: userId,
    workspace_id: workspaceId,
  };

  console.log('Creating product...');
  const { data: productData, error: productError } = await supabase
    .from('products')
    .insert(productPayload)
    .select()
    .single();

  if (productError) {
    console.error('Product insert failed:', productError.message);
    process.exit(1);
  }

  console.log('Product created:', productData.id);

  console.log('Recording transactional stock movement...');
  const { data: movementData, error: movementError } = await supabase.rpc('record_stock_movement', {
    p_product_id: productData.id,
    p_type: 'stock_in',
    p_quantity: 5,
    p_note: 'Integration test movement',
  });

  if (movementError) {
    console.error('Stock movement insert failed:', movementError.message);
    process.exit(1);
  }

  const movement = Array.isArray(movementData) ? movementData[0] : movementData;
  console.log('Stock movement created:', movement?.id);

  const { data: updatedProduct, error: verifyError } = await supabase
    .from('products')
    .select('quantity')
    .eq('id', productData.id)
    .single();

  if (verifyError || updatedProduct?.quantity !== 8) {
    console.error('Quantity verification failed:', verifyError?.message || `expected 8, received ${updatedProduct?.quantity}`);
    process.exit(1);
  }

  console.log('Quantity updated atomically: 3 -> 8');
  console.log('Integration test completed successfully.');
  process.exit(0);
})();
