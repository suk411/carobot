const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const API_BASE = 'https://backend-ledger-0ra6.onrender.com/api';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'x-bot-token': process.env.BOT_API_KEY },
});

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

bot.telegram.setMyCommands([
  { command: 'user', description: 'Search user by ID or mobile' },
  { command: 'dashboard', description: 'Today dashboard by user ID or mobile' },
  { command: 'deposits', description: 'List deposits by user ID or mobile' },
  { command: 'withdrawals', description: 'List withdrawals by user ID or mobile' },
]);

bot.start((ctx) => {
  ctx.reply(
    '🤖 Welcome to Carobot Bot\n\n' +
    '/user <uid|mobile>       — Search user\n' +
    '/dashboard <uid|mobile>  — Today dashboard\n' +
    '/deposits <uid|mobile>   — List deposits\n' +
    '/withdrawals <uid|mobile>— List withdrawals\n\n' +
    '➜ /user 123456\n' +
    '➜ /dashboard 123456\n' +
    '➜ /deposits 123456\n' +
    '➜ /withdrawals 123456'
  );
});

bot.command('commands', bot.start);

function fmt(d) {
  return new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

async function replyWithError(ctx, err) {
  const status = err.response?.status;
  const msg = err.response?.data?.msg || err.message;
  ctx.reply(`Error (${status || 'unknown'}): ${msg}`);
}

async function fetchUser(input) {
  const isMobile = /^\d{10,15}$/.test(input) && input.length > 6;
  const params = isMobile ? { mobile: input } : { userId: input };
  return api.get('/bot/user', { params });
}

bot.command('user', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /user <userId or mobile>');

  try {
    const res = await fetchUser(input);
    const { user, account, stats } = res.data;

    let msg =
      `👤 User #${user.userId}\n` +
      `📱 ${user.mobile}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Balance: ${account.balance}\n` +
      `Withdrawable: ${account.withdrawable}\n` +
      `VIP: ${account.vipLevel}\n` +
      `Status: ${account.status}\n` +
      `Turnover Req: ${account.turnover_requirement}\n` +
      `Total Deposits: ${account.totalDeposits}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 Stats\n` +
      `Deposits: ${stats.totalDeposits} (${stats.depositCount})\n` +
      `Withdrawals: ${stats.totalWithdrawals} (${stats.withdrawalCount})\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Created: ${fmt(user.createdAt)}`;

    ctx.reply(msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('dashboard', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /dashboard <userId or mobile>');

  try {
    const res = await fetchUser(input);
    const { user, account, stats, recentDeposits, recentWithdrawals } = res.data;
    const today = new Date().toDateString();
    const todayDeposits = (recentDeposits || []).filter(d => new Date(d.createdAt).toDateString() === today);
    const todayWithdrawals = (recentWithdrawals || []).filter(w => new Date(w.createdAt).toDateString() === today);

    let msg =
      `📊 Today Dashboard\n` +
      `User: #${user.userId} (${user.mobile})\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Balance: ${account.balance}\n` +
      `Withdrawable: ${account.withdrawable}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📥 Today Deposits: ${todayDeposits.length}\n`;

    todayDeposits.slice(0, 3).forEach(d => {
      msg += `   ${d.amount} ${d.currency} — ${d.status}\n`;
    });

    msg += `📤 Today Withdrawals: ${todayWithdrawals.length}\n`;
    todayWithdrawals.slice(0, 3).forEach(w => {
      msg += `   ${w.amount} — ${w.status}\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n` +
      `Total Deposits: ${stats.totalDeposits} (${stats.depositCount})\n` +
      `Total Withdrawals: ${stats.totalWithdrawals} (${stats.withdrawalCount})`;

    ctx.reply(msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('deposits', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /deposits <userId or mobile>');

  try {
    const res = await fetchUser(input);
    const { user, recentDeposits } = res.data;
    const items = recentDeposits || [];

    if (!items.length) return ctx.reply(`No deposits found for user #${user.userId}.`);

    let msg = `📥 Deposits — User #${user.userId}\n\n`;
    items.slice(0, 10).forEach(d => {
      msg += `${d.amount} ${d.currency} — ${d.status} — ${d.channelName || '-'}\n   ${fmt(d.createdAt)}\n\n`;
    });
    if (items.length > 10) msg += `...and ${items.length - 10} more`;

    ctx.reply(msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('withdrawals', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /withdrawals <userId or mobile>');

  try {
    const res = await fetchUser(input);
    const { user, recentWithdrawals } = res.data;
    const items = recentWithdrawals || [];

    if (!items.length) return ctx.reply(`No withdrawals found for user #${user.userId}.`);

    let msg = `📤 Withdrawals — User #${user.userId}\n\n`;
    items.slice(0, 10).forEach(w => {
      msg += `${w.amount} — ${w.status} — ${w.channelName || '-'}\n   ${fmt(w.createdAt)}\n\n`;
    });
    if (items.length > 10) msg += `...and ${items.length - 10} more`;

    ctx.reply(msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.launch();
console.log('Bot is running...');

const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((_, res) => res.end('ok')).listen(PORT, () => {
  console.log(`Health server listening on port ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
