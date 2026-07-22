/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

(async () => {
  try {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    const env = fs.existsSync(envPath)
      ? fs.readFileSync(envPath, 'utf8')
      : process.env;

    const envObj = {};
    if (typeof env === 'string') {
      env.split(/\r?\n/).forEach((line) => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) envObj[m[1].trim()] = m[2].trim();
      });
    } else {
      Object.assign(envObj, env);
    }

    const url = envObj.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = envObj.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      console.error('Missing Supabase env vars in .env.local');
      process.exit(1);
    }

    const supabase = createClient(url, anonKey);

    const email = `test${Date.now()}@example.com`;
    const password = 'Password123!';

    // First attempt: try inserting as the anon client (may be blocked by RLS)
    console.log('Attempting anonymous insert (may be blocked by RLS)');
    const anonProduct = {
      name: `Anon Test Product ${Date.now()}`,
      sku: `ANON-${Math.floor(Math.random() * 100000)}`,
      quantity: 5,
      price: 9.99,
      reorder_threshold: 1,
      user_id: null,
      workspace_id: null,
    };

    const { data: anonInsert, error: anonError } = await supabase.from('products').insert(anonProduct).select();
    if (!anonError) {
      console.log('Anonymous insert succeeded:', anonInsert);
      process.exit(0);
    }

    console.log('Anonymous insert failed (expected if RLS enabled):', anonError.message);

    // Try signing up and inserting as an authenticated user
    console.log('Signing up', email);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      console.error('signUp error:', signUpError.message);
    }

    let session = signUpData?.session ?? null;

    if (!session) {
      console.log('Signing in');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.error('signIn error:', signInError.message);
        process.exit(1);
      }
      session = signInData.session;
    }

    const userId = session.user.id;
    const workspace_id = userId;

    console.log('Creating product as user', userId);
    const product = {
      name: `Test Product ${Date.now()}`,
      sku: `TP-${Math.floor(Math.random() * 100000)}`,
      quantity: 10,
      price: 99.99,
      reorder_threshold: 1,
      user_id: userId,
      workspace_id,
    };

    const { data: insertData, error: insertError } = await supabase.from('products').insert(product).select();

    if (insertError) {
      console.error('insert error:', insertError.message);
      process.exit(1);
    }

    console.log('Insert success:', insertData);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error', err);
    process.exit(2);
  }
})();
