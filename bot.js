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
  { command: 'user', description: 'Search user by ID' },
  { command: 'dashboard', description: 'Today overall dashboard' },
  { command: 'deposits', description: 'Search deposits by userId, mobile, or orderId' },
  { command: 'withdrawals', description: 'Search withdrawals by userId, mobile, or orderId' },
]);

bot.start((ctx) => {
  ctx.reply(
    '🤖 Welcome to Carobot Bot\n\n' +
    '/user <userId>                    — Search user\n' +
    '/dashboard                        — Today overall dashboard\n' +
    '/deposits <userId|mobile|orderId> — Search deposits\n' +
    '/withdrawals <userId|orderId>     — Search withdrawals\n\n' +
    '➜ /user 123456\n' +
    '➜ /dashboard\n' +
    '➜ /deposits 123456\n' +
    '➜ /withdrawals WD1234567890'
  );
});

function fmt(d) {
  return new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

async function replyWithError(ctx, err) {
  const status = err.response?.status;
  const msg = err.response?.data?.msg || err.message;
  ctx.reply(`Error (${status || 'unknown'}): ${msg}`);
}

bot.command('user', async (ctx) => {
  const userId = ctx.message.text.split(' ')[1];
  if (!userId) return ctx.reply('Usage: /user <userId>');

  try {
    const res = await api.get('/bot/user', { params: { userId } });
    const { user, account } = res.data;
    const bank = account.bindAccount;

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
      `Game Member: ${account.gameMemberCreated ? '✅' : '❌'}\n`;

    if (bank) {
      msg += `━━━━━━━━━━━━━━━━━━━━\n🏦 Bank\n${bank.bankName} — ${bank.accountHolder}\n${bank.accountNumber} (${bank.bankCode})`;
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━━\nCreated: ${fmt(user.createdAt)}`;

    ctx.reply(msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('dashboard', async (ctx) => {
  try {
    const res = await api.get('/bot/dashboard');
    const { overview, deposits, withdrawals, agentCommission } = res.data;

    ctx.reply(
      `📊 Today Dashboard\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👥 Users\n` +
      `Total: ${overview.totalUsers}  |  New: ${overview.newUsers}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📥 Deposits\n` +
      `Total: ${deposits.total}\n` +
      `Count: ${deposits.count}  |  Pending: ${deposits.pendingCount}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📤 Withdrawals\n` +
      `Total: ${withdrawals.total}\n` +
      `Count: ${withdrawals.count}  |  Charge: ${withdrawals.chargeTotal}\n` +
      `✅ Success: ${withdrawals.success.count} (${withdrawals.success.total})\n` +
      `⏳ Pending: ${withdrawals.pending.count} (${withdrawals.pending.total})\n` +
      `❌ Failed: ${withdrawals.failed.count} (${withdrawals.failed.total})\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Agent Commission: ${agentCommission.total} (${agentCommission.count} txns)`
    );
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('deposits', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /deposits <userId or mobile or orderId>');

  const isMobile = /^\d{10,15}$/.test(input) && input.length > 6;
  const isOrderId = /^ODR/i.test(input);
  let params;
  if (isOrderId) params = { orderId: input };
  else if (isMobile) params = { mobile: input };
  else params = { userId: input };

  try {
    const res = await api.get('/bot/deposits', { params });
    const items = res.data.items || [];

    if (!items.length) return ctx.reply('No deposits found.');

    let msg = `📥 Deposits${isOrderId ? '' : ` — ${items[0].userId}`}\n\n`;
    items.slice(0, 10).forEach(d => {
      msg += `${d.amount} ${d.currency} — ${d.status} — ${d.channelName || '-'}\n   ${fmt(d.createdAt)}\n\n`;
    });
    if (items.length > 10) msg += `...and ${items.length - 10} more`;

    ctx.reply(msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('withdrawals', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /withdrawals <userId or orderId>');

  const isOrderId = /^WD/i.test(input);
  const params = isOrderId ? { orderId: input } : { userId: input };

  try {
    const res = await api.get('/bot/withdrawals', { params });
    const items = res.data.items || [];

    if (!items.length) return ctx.reply('No withdrawals found.');

    let msg = `📤 Withdrawals${isOrderId ? '' : ` — ${items[0].userId}`}\n\n`;
    items.slice(0, 10).forEach(w => {
      const method = w.paymentMethod || w.bankDetails?.bankName || '-';
      msg += `${w.amount} — ${w.status} — ${method}\n   ${fmt(w.createdAt)}\n\n`;
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
