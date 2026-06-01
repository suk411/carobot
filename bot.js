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
  { command: 'withdrawals', description: 'Search withdrawals by userId, orderId' },
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
    '➜ /deposits ODR1234567890123456\n' +
    '➜ /withdrawals WD1234567890123456'
  );
});

function fmt(d) {
  return new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

async function reply(ctx, msg) {
  const max = 4096;
  if (msg.length <= max) return ctx.reply(msg);
  for (let i = 0; i < msg.length; i += max) {
    await ctx.reply(msg.slice(i, i + max));
  }
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
      `👑 Admin: ${user.admin}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Account\n` +
      `Balance: ${account.balance}\n` +
      `Withdrawable: ${account.withdrawable}\n` +
      `VIP: ${account.vipLevel}\n` +
      `Status: ${account.status}\n` +
      `Turnover Req: ${account.turnover_requirement}\n` +
      `Total Deposits: ${account.totalDeposits}\n` +
      `Game Member: ${account.gameMemberCreated ? '✅' : '❌'}\n`;

    if (bank) {
      msg += `━━━━━━━━━━━━━━━━━━━━\n` +
        `🏦 Bank Account\n` +
        `Bank: ${bank.bankName}\n` +
        `IFSC: ${bank.bankCode}\n` +
        `Account: ${bank.accountNumber}\n` +
        `Holder: ${bank.accountHolder}\n` +
        `Bound At: ${fmt(bank.boundAt)}\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━\n` +
      `Created: ${fmt(user.createdAt)}\n` +
      `Updated: ${fmt(user.updatedAt)}`;

    await reply(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('dashboard', async (ctx) => {
  try {
    const res = await api.get('/bot/dashboard');
    const { overview, deposits, withdrawals, agentCommission } = res.data;

    let msg =
      `📊 Today Dashboard\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👥 Users Overview\n` +
      `Total Users: ${overview.totalUsers}\n` +
      `New Users: ${overview.newUsers}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📥 Deposits\n` +
      `Total Amount: ${deposits.total}\n` +
      `Count: ${deposits.count}\n` +
      `Pending: ${deposits.pendingCount}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📤 Withdrawals\n` +
      `Total Amount: ${withdrawals.total}\n` +
      `Count: ${withdrawals.count}\n` +
      `Total Charge: ${withdrawals.chargeTotal}\n` +
      `\n✅ Success: ${withdrawals.success.count} (${withdrawals.success.total})\n` +
      `   Charge: ${withdrawals.success.chargeTotal}\n` +
      `\n⏳ Pending: ${withdrawals.pending.count} (${withdrawals.pending.total})\n` +
      `   Charge: ${withdrawals.pending.chargeTotal}\n` +
      `\n❌ Failed: ${withdrawals.failed.count} (${withdrawals.failed.total})\n` +
      `   Charge: ${withdrawals.failed.chargeTotal}\n` +
      `\nBy Status:\n`;

    for (const [st, data] of Object.entries(withdrawals.byStatus)) {
      msg += `   ${st}: ${data.count} (${data.total})\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Agent Commission\n` +
      `Total: ${agentCommission.total}\n` +
      `Count: ${agentCommission.count}`;

    await reply(ctx, msg);
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
    const data = res.data;
    const items = data.items || [];

    if (!items.length) return ctx.reply('No deposits found.');

    let msg = isOrderId
      ? `📥 Deposit Order\n\n`
      : `📥 Deposits — User ${items[0].userId} (Page ${data.page}/${Math.ceil(data.total / data.limit)}, Total: ${data.total})\n\n`;

    items.slice(0, 10).forEach((d, i) => {
      if (items.length > 1) msg += `#${i + 1}\n`;
      msg += `Order ID: ${d.orderId}\n` +
        `User ID: ${d.userId}\n` +
        `Amount: ${d.amount}\n` +
        `Received: ${d.receivedAmount}\n` +
        `Currency: ${d.currency}\n` +
        `Status: ${d.status}\n` +
        `Channel: ${d.channelName || '-'}\n` +
        `Gateway Order: ${d.gatewayOrderNo || '-'}\n` +
        `Note: ${d.note || '-'}\n` +
        `Created: ${fmt(d.createdAt)}\n` +
        `Updated: ${fmt(d.updatedAt)}\n\n`;
    });
    if (items.length > 10) msg += `...and ${items.length - 10} more`;

    await reply(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('withdrawals', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /withdrawals <userId or orderId>');

  const isOrderId = /^WD/i.test(input);
  const params = isOrderId ? { orderId: input } : { userId: input };

  try {
    const res = await api.get('/bot/withdrawals', { params });
    const data = res.data;
    const items = data.items || [];

    if (!items.length) return ctx.reply('No withdrawals found.');

    let msg = isOrderId
      ? `📤 Withdrawal Order\n\n`
      : `📤 Withdrawals — User ${items[0].userId} (Page ${data.page}/${Math.ceil(data.total / data.limit)}, Total: ${data.total})\n\n`;

    items.slice(0, 10).forEach((w, i) => {
      if (items.length > 1) msg += `#${i + 1}\n`;
      const pd = w.paymentDetails || {};
      const bd = w.bankDetails || {};
      msg += `Order ID: ${w.orderId}\n` +
        `User ID: ${w.userId}\n` +
        `Amount: ${w.amount}\n` +
        `Charge: ${w.charge}\n` +
        `Currency: ${w.currency}\n` +
        `Status: ${w.status}\n` +
        `Channel: ${w.channelName || '-'}\n` +
        `Payment Method: ${w.paymentMethod || '-'}\n`;

      if (pd.upiId) msg += `UPI ID: ${pd.upiId}\n`;
      if (pd.accountNo || bd.accountNumber) {
        const ac = pd.accountNo || bd.accountNumber;
        const ifsc = pd.ifsc || bd.bankCode || '-';
        const bank = pd.bankName || bd.bankName || '-';
        const holder = pd.holderName || bd.accountHolder || '-';
        msg += `Bank: ${bank}\nIFSC: ${ifsc}\nAccount: ${ac}\nHolder: ${holder}\n`;
      }

      msg += `Note: ${w.note || '-'}\n` +
        `Created: ${fmt(w.createdAt)}\n` +
        `Updated: ${fmt(w.updatedAt)}\n\n`;
    });
    if (items.length > 10) msg += `...and ${items.length - 10} more`;

    await reply(ctx, msg);
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
