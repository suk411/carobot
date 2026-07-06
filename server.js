require('dotenv').config();
const bot = require('./bot');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.json({ status: 'success', msg: 'ready to use' });
  }
  try {
    await bot.webhookCallback('/')(req, res);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(200).end();
  }
};
