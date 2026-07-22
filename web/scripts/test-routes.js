const urls = [
  '/',
  '/sign-in',
  '/sign-up',
  '/onboarding',
  '/dashboard',
  '/products',
  '/products/new',
  '/stock-movements',
  '/stock-movements/new',
  '/forgot-password',
  '/reset-password',
  '/unauthorized',
];

const base = process.env.APP_URL || 'http://localhost:3000';

(async () => {
  let failed = false;
  for (const url of urls) {
    const target = url.replace('[productId]', 'test-id');
    try {
      const res = await fetch(base + target);
      const status = res.status;
      const ok = status >= 200 && status < 400;
      console.log(`${target} -> ${status} ${ok ? 'OK' : 'FAIL'}`);
      if (!ok) failed = true;
    } catch (error) {
      console.log(`${target} -> ERROR ${error.message}`);
      failed = true;
    }
  }
  process.exit(failed ? 1 : 0);
})();
