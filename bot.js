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
  { command: 'user', description: 'Full user search — profile, account, stats, recent activity' },
  { command: 'commands', description: 'Show all commands' },
]);

bot.start((ctx) => {
  ctx.reply(
    '🤖 Welcome to Carobot Bot\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '🔍 User Search\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '/user <userId>\n' +
    '   Full user search — profile, wallet, stats, recent transactions\n' +
    '   ➜ /user 123456'
  );
});

bot.command('commands', (ctx) => {
  ctx.reply(
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '🔍 User Search\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '/user <userId>\n' +
    '   Full user search — profile, wallet, stats, recent transactions\n' +
    '   ➜ /user 123456'
  );
});

async function replyWithError(ctx, err) {
  const status = err.response?.status;
  const msg = err.response?.data?.msg || err.message;
  ctx.reply(`Error (${status || 'unknown'}): ${msg}`);
}

function fmt(d) {
  return new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

bot.command('user', async (ctx) => {
  const userId = ctx.message.text.split(' ')[1];
  if (!userId) return ctx.reply('Usage: /user <userId>');

  try {
    const res = await api.get('/bot/user', { params: { userId } });
    const { user, account, stats, recentTransactions, recentDeposits, recentWithdrawals } = res.data;

    let msg =
      `👤 User Profile\n\n` +
      `ID: ${user.userId}\n` +
      `Mobile: ${user.mobile}\n` +
      `Status: ${account.status}\n` +
      `VIP: ${account.vipLevel}\n` +
      `Balance: ${account.balance}\n` +
      `Withdrawable: ${account.withdrawable}\n` +
      `Created: ${fmt(user.createdAt)}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 Stats\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Deposits: ${stats.totalDeposits} (${stats.depositCount} txns)\n` +
      `Withdrawals: ${stats.totalWithdrawals} (${stats.withdrawalCount} txns)\n`;

    if (recentDeposits && recentDeposits.length) {
      msg += `\n━━━━━━━━━━━━━━━━━━━━\n📥 Recent Deposits\n━━━━━━━━━━━━━━━━━━━━\n`;
      recentDeposits.slice(0, 5).forEach(d => {
        msg += `${d.amount} ${d.currency} — ${d.status} — ${fmt(d.createdAt)}\n`;
      });
    }

    if (recentWithdrawals && recentWithdrawals.length) {
      msg += `\n━━━━━━━━━━━━━━━━━━━━\n📤 Recent Withdrawals\n━━━━━━━━━━━━━━━━━━━━\n`;
      recentWithdrawals.slice(0, 5).forEach(w => {
        msg += `${w.amount} — ${w.status} — ${fmt(w.createdAt)}\n`;
      });
    }

    if (recentTransactions && recentTransactions.length) {
      msg += `\n━━━━━━━━━━━━━━━━━━━━\n🔄 Recent Transactions\n━━━━━━━━━━━━━━━━━━━━\n`;
      recentTransactions.slice(0, 5).forEach(t => {
        msg += `${t.type} ${t.amount} — ${t.status} — ${fmt(t.createdAt)}\n`;
      });
    }

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
