const axios = require('axios');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/set-webhook.js <VERCEL_URL>');
  console.error('Example: node scripts/set-webhook.js https://carobot-ers9x.vercel.app');
  process.exit(1);
}

const webhookUrl = url.replace(/\/+$/, '') + '/api/webhook';

axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
  url: webhookUrl
}).then(r => {
  console.log('Webhook set:', JSON.stringify(r.data, null, 2));
}).catch(e => {
  console.error('Failed:', e.response?.data || e.message);
  process.exit(1);
});
