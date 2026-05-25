const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const API_BASE = 'https://backend-ledger-0ra6.onrender.com/api';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// In-memory store: chatId -> adminToken
const adminTokens = new Map();

// Authorized chat IDs (comma-separated in .env)
const allowedChatIds = (process.env.ALLOWED_CHAT_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(Number);

const OWNER_CHAT_ID = Number(process.env.OWNER_CHAT_ID) || 0;

bot.use((ctx, next) => {
  if (allowedChatIds.length && !allowedChatIds.includes(ctx.chat.id)) {
    const intruder = ctx.chat.id;
    const username = ctx.from?.username ? '@' + ctx.from.username : 'none';
    const name = ctx.from?.first_name || 'unknown';
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    ctx.reply('Unauthorized. You are not allowed to use this bot.');

    if (OWNER_CHAT_ID) {
      ctx.telegram.sendMessage(
        OWNER_CHAT_ID,
        `⚠️ Unauthorized Access Detected\n\n` +
        `User ID: ${intruder}\n` +
        `Username: ${username}\n` +
        `Name: ${name}\n` +
        `Time: ${now}`
      );
    }
    return;
  }
  return next();
});

bot.start((ctx) => {
  ctx.reply(
    'Welcome to Carobot Admin Bot!\n\n' +
    'Commands:\n' +
    '/setadmin <token> - Store your admin API token\n' +
    '/deposit <orderId> - Search a deposit order by ID\n\n' +
    'First, set your admin token with /setadmin, then use /deposit.'
  );
});

bot.command('setadmin', (ctx) => {
  const token = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!token) {
    return ctx.reply('Usage: /setadmin <your_admin_token>');
  }
  adminTokens.set(ctx.chat.id, token);
  ctx.reply('Admin token saved for this chat.');
});

bot.command('deposit', async (ctx) => {
  const orderId = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!orderId) {
    return ctx.reply('Usage: /deposit <orderId>');
  }

  const token = adminTokens.get(ctx.chat.id);
  if (!token) {
    return ctx.reply('No admin token set. Use /setadmin <token> first.');
  }

  try {
    const res = await axios.get(`${API_BASE}/admin/deposits`, {
      params: { orderId },
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = res.data;

    if (!data.items || data.items.length === 0) {
      return ctx.reply('No deposit order found with that ID.');
    }

    const item = data.items[0];
    const created = new Date(item.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const msg =
      `📦 Deposit Order\n\n` +
      `Order ID: ${item.orderId}\n` +
      `User ID: ${item.userId}\n` +
      `Amount: ${item.amount} ${item.currency}\n` +
      `Status: ${item.status}\n` +
      `Channel: ${item.channelName}\n` +
      `Note: ${item.note || '-'}\n` +
      `Created: ${created}`;

    ctx.reply(msg);
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.msg || err.message;
    ctx.reply(`Error (${status || 'unknown'}): ${msg}`);
  }
});

bot.launch();
console.log('Bot is running...');

// Health server for Render
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((_, res) => res.end('ok')).listen(PORT, () => {
  console.log(`Health server listening on port ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
