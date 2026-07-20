const dotenv = require('dotenv');
const appJson = require('./app.json');

dotenv.config({ path: '.env.local' });

module.exports = ({ config }) => ({
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    },
  },
});
