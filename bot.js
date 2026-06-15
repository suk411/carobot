const { Telegraf } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const API_BASE = 'https://admin-backend-7lwn.onrender.com/api/admin';

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

    ctx.reply('Unauthorized.');

    if (OWNER_CHAT_ID) {
      ctx.telegram.sendMessage(
        OWNER_CHAT_ID,
        `⚠️ Unauthorized\nUser: ${intruder}\n@${username}\n${name}\nTime: ${now}`
      );
    }
    return;
  }
  return next();
});

bot.use((ctx, next) => {
  if (ctx.message?.text?.startsWith('/') && ctx.chat) {
    ctx.replyWithChatAction('typing');
  }
  return next();
});

bot.telegram.setMyCommands([
  { command: 'user', description: 'Search user by ID or mobile' },
  { command: 'dashboard', description: 'Dashboard (today/month/date)' },
  { command: 'deposits', description: 'Search deposits by userId/mobile/orderId' },
  { command: 'withdrawals', description: 'Search withdrawals by userId/orderId' },
  { command: 'transactions', description: 'Search transactions by userId/orderId' },
  { command: 'round', description: 'Current round info' },
  { command: 'bets', description: 'Current round bets' },
  { command: 'rounds', description: 'Settled rounds' },
  { command: 'roundstats', description: 'Round stats by issue number' },
]);

bot.start((ctx) => {
  ctx.reply(
    '🤖 Carobot\n\n' +
    '👤 /user <id|mobile>\n' +
    '📊 /dashboard [today|month|YYYY-MM-DD]\n' +
    '📥 /deposits <id|mobile|orderId>\n' +
    '📤 /withdrawals <id|orderId>\n' +
    '🔄 /transactions <id|orderId>\n' +
    '🎯 /round\n' +
    '🎲 /bets [page]\n' +
    '📋 /rounds [page]\n' +
    '📈 /roundstats <issueNumber>'
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
  ctx.reply(`Error (${status || '?'}): ${msg}`);
}

bot.command('user', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /user <userId or mobile>');

  const params = /^\d{10,15}$/.test(input) && input.length > 6
    ? { mobile: input } : { userId: input };

  try {
    const res = await api.get('/user', { params });
    const { user, account, paymentMethods, deviceInfo } = res.data;
    const bank = paymentMethods?.bank;
    const upi = paymentMethods?.upi;

    let msg =
      `👤 User #${user.userId}\n` +
      `📱 ${user.mobile}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Balance: ${account.balance}\n` +
      `Freeze: ${account.freezeBalance}\n` +
      `VIP: ${account.vipLevel}\n` +
      `Status: ${account.status}\n` +
      `Total Deposits: ${account.totalDeposits}\n` +
      `Total Withdrawals: ${account.totalWithdrawals}\n`;

    if (bank) {
      msg += `━━━━━━━━━━━━━━━━━━━━\n` +
        `🏦 Bank\n${bank.bankName}\n${bank.accountNo}\n${bank.ifsc}\n${bank.holderName}\n`;
    }
    if (upi) {
      msg += `━━━━━━━━━━━━━━━━━━━━\n` +
        `📱 UPI\n${upi.upiId}\n`;
    }

    if (account.turnover_batches?.length) {
      msg += `━━━━━━━━━━━━━━━━━━━━\n📊 Turnover\n`;
      account.turnover_batches.forEach(t => {
        msg += `${t.source}: ${t.achieved}/${t.required}\n`;
      });
    }

    msg += `━━━━━━━━━━━━━━━━━━━━\n` +
      `🌐 Last IP: ${deviceInfo?.ip || lastIp}\n` +
      `📍 ${deviceInfo?.city || ''}\n` +
      `Same IP Users: ${res.data.sameIpUsers}\n` +
      `Created: ${fmt(user.createdAt)}`;

    await reply(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('dashboard', async (ctx) => {
  const period = ctx.message.text.split(' ')[1] || 'today';
  const params = /^\d{4}-\d{2}-\d{2}$/.test(period)
    ? { date: period }
    : { period };

  try {
    const res = await api.get('/dashboard', { params });
    const { overview, deposits, withdrawals, agentCommission } = res.data;

    let msg =
      `📊 Dashboard (${res.data.period})\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👥 Users: ${overview.totalUsers} (New: ${overview.newUsers})\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📥 Deposits: ${deposits.total} (${deposits.count}) Pending: ${deposits.pendingCount}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📤 Withdrawals: ${withdrawals.total} (${withdrawals.count})\n` +
      `Charge: ${withdrawals.chargeTotal}\n` +
      `✅ Success: ${withdrawals.success.count} (${withdrawals.success.total})\n` +
      `⏳ Pending: ${withdrawals.pending.count} (${withdrawals.pending.total})\n` +
      `❌ Failed: ${withdrawals.failed.count} (${withdrawals.failed.total})\n`;

    for (const [st, d] of Object.entries(withdrawals.byStatus)) {
      msg += `   ${st}: ${d.count} (${d.total})\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Agent: ${agentCommission.total} (${agentCommission.count})`;

    await reply(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('deposits', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /deposits <userId or mobile or orderId>');

  const isMobile = /^\d{10,15}$/.test(input) && input.length > 6;
  const isOrderId = /^DEP/i.test(input);
  let params;
  if (isOrderId) params = { orderId: input };
  else if (isMobile) params = { mobile: input };
  else params = { userId: input, limit: 10 };

  try {
    const res = await api.get('/deposits', { params });
    const items = res.data.items || [];
    if (!items.length) return ctx.reply('No deposits found.');

    let msg = isOrderId
      ? `📥 Deposit\n\n`
      : `📥 Deposits — User ${items[0].userId} (${res.data.total || items.length})\n\n`;

    items.slice(0, 10).forEach((d, i) => {
      if (items.length > 1) msg += `#${i + 1}\n`;
      msg += `${d.orderId}\n` +
        `${d.amount} (Received: ${d.receivedAmount})\n` +
        `${d.status} — ${d.channelName || '-'}\n` +
        `${fmt(d.createdAt)}\n\n`;
    });

    await reply(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('withdrawals', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /withdrawals <userId or orderId>');

  const isOrderId = /^WTH/i.test(input);
  const params = isOrderId ? { orderId: input } : { userId: input, limit: 10 };

  try {
    const res = await api.get('/withdrawals', { params });
    const items = res.data.items || [];
    if (!items.length) return ctx.reply('No withdrawals found.');

    let msg = isOrderId
      ? `📤 Withdrawal\n\n`
      : `📤 Withdrawals — User ${items[0].userId} (${res.data.total || items.length})\n\n`;

    items.slice(0, 10).forEach((w, i) => {
      if (items.length > 1) msg += `#${i + 1}\n`;
      msg += `${w.orderId}\n` +
        `${w.amount} (Charge: ${w.charge})\n` +
        `${w.status} — ${w.channelName || '-'}\n` +
        `${fmt(w.createdAt)}\n\n`;
    });

    await reply(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('transactions', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /transactions <userId or orderId>');

  const isOrderId = /^(DEP|WTH|WGB)/i.test(input);
  const params = isOrderId ? { orderId: input, limit: 25 } : { userId: input, limit: 25 };

  try {
    const res = await api.get('/transactions', { params });
    const items = res.data.items || [];
    if (!items.length) return ctx.reply('No transactions found.');

    let msg = `🔄 Transactions${isOrderId ? '' : ` — User ${items[0].userId}`} (${res.data.total || items.length})\n\n`;
    items.slice(0, 15).forEach(t => {
      msg += `${t.type} ${t.amount} — ${t.status}\n` +
        `Bal: ${t.balanceAfter} | ${t.orderId}\n` +
        `${t.remark || '-'}\n${fmt(t.createdAt)}\n\n`;
    });

    await reply(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('round', async (ctx) => {
  try {
    const res = await api.get('/current-round');
    const { round, stats } = res.data;

    let msg =
      `🎯 Round #${round.issueNumber}\n` +
      `Status: ${round.status}\n` +
      `Start: ${fmt(round.startTime)}\n` +
      `End: ${fmt(round.endTime)}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 Stats\n` +
      `Bets: ${stats.totalBets}\n` +
      `Amount: ${stats.totalBetAmount}\n` +
      `Users: ${stats.uniqueUsers}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📈 Breakdown\n`;

    for (const [key, val] of Object.entries(stats.breakdown)) {
      msg += `${key}: ${val}\n`;
    }

    await reply(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('bets', async (ctx) => {
  const page = ctx.message.text.split(' ')[1] || 1;

  try {
    const res = await api.get('/current-round/bets', { params: { page, limit: 25 } });
    const items = res.data.items || [];
    if (!items.length) return ctx.reply('No bets found.');

    let msg = `🎲 Current Round Bets (Page ${res.data.page}/${Math.ceil(res.data.total / res.data.limit)})\n\n`;
    items.slice(0, 20).forEach(b => {
      msg += `#${b.userId}\n${b.selectType} — ${b.betAmount} (${b.status})\n${fmt(b.createdAt)}\n\n`;
    });

    await reply(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('rounds', async (ctx) => {
  const page = ctx.message.text.split(' ')[1] || 1;

  try {
    const res = await api.get('/rounds', { params: { page, limit: 10 } });
    const issues = res.data.issues || [];
    if (!issues.length) return ctx.reply('No rounds found.');

    let msg = `📋 Settled Rounds (Page ${res.data.page})\n\n`;
    issues.forEach(r => {
      msg += `#${r.issueNumber}\n` +
        `Result: ${r.result} (${r.color}/${r.size})\n` +
        `Bets: ${r.totalBets} | Amount: ${r.totalBetAmount}\n` +
        `P/L: ${r.profitLoss}\n` +
        `${fmt(r.createdAt)}\n\n`;
    });

    await reply(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('roundstats', async (ctx) => {
  const issue = ctx.message.text.split(' ')[1];
  if (!issue) return ctx.reply('Usage: /roundstats <issueNumber>');

  try {
    const res = await api.get(`/round-stats/${issue}`);
    const { issue: round, stats } = res.data;

    let msg =
      `📈 Round #${round.issueNumber}\n` +
      `Result: ${round.result} (${round.color}/${round.size})\n` +
      `Status: ${round.status}\n` +
      `${fmt(round.createdAt)}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Bets: ${stats.totalBets}\n` +
      `Amount: ${stats.totalBetAmount}\n` +
      `Payout: ${stats.totalPayout}\n` +
      `P/L: ${stats.profitLoss}\n` +
      `Won: ${stats.wonCount} | Lost: ${stats.lostCount}\n` +
      `Users: ${stats.uniqueUsers}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 Breakdown\n`;

    for (const [key, d] of Object.entries(stats.breakdown)) {
      msg += `${key}: ${d.count} bets, ${d.amount}\n`;
    }

    await reply(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.launch();
console.log('Bot running...');

const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((_, res) => res.end('ok')).listen(PORT, () => {
  console.log(`Health on port ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
