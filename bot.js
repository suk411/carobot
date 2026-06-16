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

const ownerChatIds = (process.env.OWNER_CHAT_ID || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(Number);

bot.use((ctx, next) => {
  if (allowedChatIds.length && !allowedChatIds.includes(ctx.chat.id)) {
    const intruder = ctx.chat.id;
    const username = ctx.from?.username ? '@' + ctx.from.username : 'none';
    const name = ctx.from?.first_name || 'unknown';
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    ctx.reply('Unauthorized.');

    ownerChatIds.forEach(id => {
      ctx.telegram.sendMessage(
        id,
        `⚠️ Unauthorized\nUser: ${intruder}\n@${username}\n${name}\nTime: ${now}`
      );
    });
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

const WAKE_URL = process.env.SELF_URL;

bot.command('wakeup', async (ctx) => {
  await ctx.replyWithChatAction('typing');
  await ctx.reply('⏳ Sending wake request...');
  try {
    await axios.get(WAKE_URL, { timeout: 30000 });
    await ctx.reply('✅ Wake request sent — server should be ready shortly');
  } catch (e) {
    await ctx.reply('⚠️ Wake request sent (server may still be starting)');
  }
});

bot.start(async (ctx) => {
  await ctx.replyWithChatAction('typing');
  try {
    await axios.get(WAKE_URL, { timeout: 30000 });
  } catch (_) {}
  ctx.reply(
    '✅ Ready to use!\n\n' +
    '🤖 Carobot\n\n' +
    '👤 /ui <userId>\n' +
    '👤 /um <mobile>\n' +
    '📊 /d [today|month|YYYY-MM-DD]\n' +
    '📥 /dd <userId>\n' +
    '📥 /ddt <orderId>\n' +
    '📤 /ww <userId>\n' +
    '📤 /wwt <orderId>\n' +
    '🔄 /tt <userId>\n' +
    '🔄 /ttt <orderId>\n' +
    '🎯 /r\n' +
    '🎲 /b [page]\n' +
    '📋 /rs [page]\n' +
    '📈 /rst <issueNumber>\n' +
    '🌐 /wakeup'
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

async function replyHTML(ctx, msg) {
  const max = 4096;
  if (msg.length <= max) return ctx.replyWithHTML(msg);
  for (let i = 0; i < msg.length; i += max) {
    await ctx.replyWithHTML(msg.slice(i, i + max));
  }
}

async function replyWithError(ctx, err) {
  const status = err.response?.status;
  const data = err.response?.data;
  let reply = `❌ Error (${status || '?'})`;
  if (data) {
    reply += `\n\n${JSON.stringify(data, null, 2)}`;
  } else {
    reply += `: ${err.message}`;
  }
  ctx.reply(reply);
}

bot.command('ui', async (ctx) => {
  const input = ctx.message.text.split(' ')[1];
  if (!input) return ctx.reply('Usage: /ui <userId>');

  try {
    const res = await api.get('/user', { params: { userId: input } });
    const { user, account, paymentMethods, deviceInfo } = res.data;
    const bank = paymentMethods?.bank;
    const upi = paymentMethods?.upi;

    let msg =
      `👤 <b>User #${user.userId}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Mobile</b>      <code>${user.mobile}</code>\n` +
      `<b>Balance</b>     ₹<code>${account.balance}</code>\n` +
      `<b>Withdrawable</b> ₹<code>${account.withdrawable}</code>\n` +
      `<b>VIP</b>         ${account.vipLevel} (since ${fmt(account.vipSince)})\n` +
      `<b>Status</b>      ${account.status}${account.statusRemark ? ' (' + account.statusRemark + ')' : ''}\n` +
      `<b>Deposits</b>    ₹<code>${account.totalDeposits}</code>\n` +
      `<b>Pend Bonus</b>  ₹<code>${account.pendingUpgradeBonus}</code>\n` +
      `<b>Last Bonus</b>  ${account.lastWeeklyBonusAt ? fmt(account.lastWeeklyBonusAt) : '-'}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Turnover</b>\n` +
      `<b>Required</b>    <code>${account.turnover_requirement}</code>\n` +
      `<b>Completed</b>   <code>${account.total_turnover_completed}</code>\n` +
      `<b>Last Calc</b>   ${account.lastTurnoverCalcAt ? fmt(account.lastTurnoverCalcAt) : '-'}\n` +
      `<b>Last Bet</b>    ${account.lastBetCalcAt ? fmt(account.lastBetCalcAt) : '-'}\n`;

    if (bank) {
      msg += `━━━━━━━━━━━━━━━━━━━━\n` +
        `🏦 <b>Bank</b>\n` +
        `<code>${bank.bankName}</code> | <code>${bank.accountNo}</code>\n` +
        `<code>${bank.ifsc}</code> | ${bank.holderName}\n`;
    }
    if (upi) {
      msg += `━━━━━━━━━━━━━━━━━━━━\n` +
        `📱 <b>UPI</b>\n<code>${upi.upiId}</code>\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Last IP</b>     ${deviceInfo?.ip || '-'}\n` +
      `<b>City</b>        ${deviceInfo?.city || '-'}\n` +
      `<b>Same IP</b>     ${res.data.sameIpUsers} users\n` +
      `<b>Created</b>     ${fmt(user.createdAt)}`;

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('um', async (ctx) => {
  const input = ctx.message.text.split(' ')[1];
  if (!input) return ctx.reply('Usage: /um <mobile>');

  try {
    const res = await api.get('/user', { params: { mobile: input } });
    const { user, account, paymentMethods, deviceInfo } = res.data;
    const bank = paymentMethods?.bank;
    const upi = paymentMethods?.upi;

    let msg =
      `👤 <b>User #${user.userId}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Mobile</b>      <code>${user.mobile}</code>\n` +
      `<b>Balance</b>     ₹<code>${account.balance}</code>\n` +
      `<b>Withdrawable</b> ₹<code>${account.withdrawable}</code>\n` +
      `<b>VIP</b>         ${account.vipLevel} (since ${fmt(account.vipSince)})\n` +
      `<b>Status</b>      ${account.status}${account.statusRemark ? ' (' + account.statusRemark + ')' : ''}\n` +
      `<b>Deposits</b>    ₹<code>${account.totalDeposits}</code>\n` +
      `<b>Pend Bonus</b>  ₹<code>${account.pendingUpgradeBonus}</code>\n` +
      `<b>Last Bonus</b>  ${account.lastWeeklyBonusAt ? fmt(account.lastWeeklyBonusAt) : '-'}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Turnover</b>\n` +
      `<b>Required</b>    <code>${account.turnover_requirement}</code>\n` +
      `<b>Completed</b>   <code>${account.total_turnover_completed}</code>\n` +
      `<b>Last Calc</b>   ${account.lastTurnoverCalcAt ? fmt(account.lastTurnoverCalcAt) : '-'}\n` +
      `<b>Last Bet</b>    ${account.lastBetCalcAt ? fmt(account.lastBetCalcAt) : '-'}\n`;

    if (bank) {
      msg += `━━━━━━━━━━━━━━━━━━━━\n` +
        `🏦 <b>Bank</b>\n` +
        `<code>${bank.bankName}</code> | <code>${bank.accountNo}</code>\n` +
        `<code>${bank.ifsc}</code> | ${bank.holderName}\n`;
    }
    if (upi) {
      msg += `━━━━━━━━━━━━━━━━━━━━\n` +
        `📱 <b>UPI</b>\n<code>${upi.upiId}</code>\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Last IP</b>     ${deviceInfo?.ip || '-'}\n` +
      `<b>City</b>        ${deviceInfo?.city || '-'}\n` +
      `<b>Same IP</b>     ${res.data.sameIpUsers} users\n` +
      `<b>Created</b>     ${fmt(user.createdAt)}`;

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('d', async (ctx) => {
  const period = ctx.message.text.split(' ')[1] || 'today';
  const params = /^\d{4}-\d{2}-\d{2}$/.test(period)
    ? { date: period }
    : { period };

  try {
    const res = await api.get('/dashboard', { params });
    const { overview, deposits, withdrawals, agentCommission } = res.data;

    let msg =
      `📊 <b>Dashboard</b> (${res.data.period})\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Users</b>       <code>${overview.totalUsers}</code> (New: <code>${overview.newUsers}</code>)\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Deposits</b>    ₹<code>${deposits.total}</code> (<code>${deposits.count}</code>)  Pending: <code>${deposits.pendingCount}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Withdrawals</b> ₹<code>${withdrawals.total}</code> (<code>${withdrawals.count}</code>)\n` +
      `<b>Charge</b>      ₹<code>${withdrawals.chargeTotal}</code>\n` +
      `✅ Success: <code>${withdrawals.success.count}</code> (₹<code>${withdrawals.success.total}</code>)\n` +
      `⏳ Pending: <code>${withdrawals.pending.count}</code> (₹<code>${withdrawals.pending.total}</code>)\n` +
      `❌ Failed:  <code>${withdrawals.failed.count}</code> (₹<code>${withdrawals.failed.total}</code>)\n`;

    for (const [st, d] of Object.entries(withdrawals.byStatus)) {
      msg += `   ${st}: <code>${d.count}</code> (₹<code>${d.total}</code>)\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Agent Comm</b>  ₹<code>${agentCommission.total}</code> (<code>${agentCommission.count}</code>)`;

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('dd', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /dd <userId or mobile>');

  const isMobile = /^\d{10,15}$/.test(input) && input.length > 6;
  const params = isMobile ? { mobile: input } : { userId: input, limit: 10 };

  try {
    const res = await api.get('/deposits', { params });
    const items = res.data.items || [];
    if (!items.length) return ctx.reply('No deposits found.');

    let msg =
      `📥 <b>Deposits</b> — User <code>${items[0].userId}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Total: <code>${res.data.total || items.length}</code>\n\n`;

    items.slice(0, 10).forEach((d, i) => {
      if (items.length > 1) msg += `<b>#${i + 1}</b>\n`;
      msg += `<code>${d.orderId}</code>\n` +
        `₹<code>${d.amount}</code>  (Received: ₹<code>${d.receivedAmount}</code>)\n` +
        `${d.status}  —  ${d.channelName || '-'}\n` +
        `${fmt(d.createdAt)}\n\n`;
    });

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('ddt', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /ddt <orderId>');

  try {
    const res = await api.get('/deposits', { params: { orderId: input } });
    const items = res.data.items || [];
    if (!items.length) return ctx.reply('No deposit found.');

    const d = items[0];
    const statusIcon = d.status === 'SUCCESS' ? '✅' : d.status === 'PENDING' ? '⏳' : d.status === 'FAILED' ? '❌' : '❓';

    let msg =
      `📥 <b>Deposit</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Order</b>   <code>${d.orderId}</code>\n` +
      `<b>User</b>    <code>${d.userId}</code>\n` +
      `<b>Amount</b>  ₹<code>${d.amount}</code>\n` +
      `<b>Received</b> ₹<code>${d.receivedAmount}</code>\n` +
      `<b>Status</b>  ${statusIcon} ${d.status}  —  ${d.channelName || '-'}\n` +
      `<b>Date</b>    ${fmt(d.createdAt)}`;

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('ww', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /ww <userId>');

  try {
    const res = await api.get('/withdrawals', { params: { userId: input, limit: 10 } });
    const items = res.data.items || [];
    if (!items.length) return ctx.reply('No withdrawals found.');

    let msg =
      `📤 <b>Withdrawals</b> — User <code>${items[0].userId}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Total: <code>${res.data.total || items.length}</code>\n\n`;

    items.slice(0, 10).forEach((w, i) => {
      if (items.length > 1) msg += `<b>#${i + 1}</b>\n`;
      msg += `<code>${w.orderId}</code>\n` +
        `₹<code>${w.amount}</code>  (Charge: ₹<code>${w.charge}</code>)\n` +
        `${w.status}  —  ${w.channelName || '-'}\n` +
        `${fmt(w.createdAt)}\n\n`;
    });

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('wwt', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /wwt <orderId>');

  try {
    const res = await api.get('/withdrawals', { params: { orderId: input } });
    const items = res.data.items || [];
    if (!items.length) return ctx.reply('No withdrawal found.');

    const w = items[0];
    const statusIcon = w.status === 'SUCCESS' ? '✅' : w.status === 'PENDING' ? '⏳' : w.status === 'FAILED' ? '❌' : '❓';

    let msg =
      `📤 <b>Withdrawal</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Order</b>   <code>${w.orderId}</code>\n` +
      `<b>User</b>    <code>${w.userId}</code>\n` +
      `<b>Amount</b>  ₹<code>${w.amount}</code>\n` +
      `<b>Charge</b>  ₹<code>${w.charge}</code>\n` +
      `<b>Status</b>  ${statusIcon} ${w.status}  —  ${w.channelName || '-'}\n` +
      `<b>Date</b>    ${fmt(w.createdAt)}`;

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('tt', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /tt <userId>');

  try {
    const res = await api.get('/transactions', { params: { userId: input, limit: 25 } });
    const items = res.data.items || [];
    if (!items.length) return ctx.reply('No transactions found.');

    let msg =
      `🔄 <b>Transactions</b> — User <code>${items[0].userId}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Total: <code>${res.data.total || items.length}</code>\n\n`;

    items.slice(0, 15).forEach(t => {
      msg += `<b>${t.type}</b>  ₹<code>${t.amount}</code>  —  ${t.status}\n` +
        `Bal: <code>${t.balanceAfter}</code>  |  <code>${t.orderId}</code>\n` +
        `<i>${t.remark || '-'}</i>\n` +
        `${fmt(t.createdAt)}\n\n`;
    });

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('ttt', async (ctx) => {
  const input = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!input) return ctx.reply('Usage: /ttt <orderId>');

  try {
    const res = await api.get('/transactions', { params: { orderId: input, limit: 25 } });
    const items = res.data.items || [];
    if (!items.length) return ctx.reply('No transactions found.');

    let msg =
      `🔄 <b>Transaction</b>  <code>${input}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n`;

    items.slice(0, 5).forEach(t => {
      msg += `<b>${t.type}</b>  ₹<code>${t.amount}</code>  —  ${t.status}\n` +
        `Bal: <code>${t.balanceAfter}</code>\n` +
        `<i>${t.remark || '-'}</i>\n` +
        `${fmt(t.createdAt)}\n\n`;
    });

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('r', async (ctx) => {
  try {
    const res = await api.get('/current-round');
    const { round, stats } = res.data;

    let msg =
      `🎯 <b>Round #${round.issueNumber}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Status</b>  ${round.status}\n` +
      `<b>Start</b>   ${fmt(round.startTime)}\n` +
      `<b>End</b>     ${fmt(round.endTime)}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Stats</b>\n` +
      `<b>Bets</b>    <code>${stats.totalBets}</code>\n` +
      `<b>Amount</b>  ₹<code>${stats.totalBetAmount}</code>\n` +
      `<b>Users</b>   <code>${stats.uniqueUsers}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Breakdown</b>\n`;

    for (const [key, val] of Object.entries(stats.breakdown)) {
      msg += `${key}: ₹<code>${val}</code>\n`;
    }

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('b', async (ctx) => {
  const page = ctx.message.text.split(' ')[1] || 1;

  try {
    const res = await api.get('/current-round/bets', { params: { page, limit: 25 } });
    const items = res.data.items || [];
    if (!items.length) return ctx.reply('No bets found.');

    let msg =
      `🎲 <b>Bets</b> (Page ${res.data.page}/${Math.ceil(res.data.total / res.data.limit)})\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n`;

    items.slice(0, 20).forEach(b => {
      msg += `<b>#${b.userId}</b>\n` +
        `${b.selectType}  —  ₹<code>${b.betAmount}</code>  (${b.status})\n` +
        `${fmt(b.createdAt)}\n\n`;
    });

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('rs', async (ctx) => {
  const page = ctx.message.text.split(' ')[1] || 1;

  try {
    const res = await api.get('/rounds', { params: { page, limit: 10 } });
    const issues = res.data.issues || [];
    if (!issues.length) return ctx.reply('No rounds found.');

    let msg =
      `📋 <b>Settled Rounds</b> (Page ${res.data.page})\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n`;

    issues.forEach(r => {
      msg += `<b>#${r.issueNumber}</b>\n` +
        `Result: ${r.result}  (${r.color}/${r.size})\n` +
        `Bets: <code>${r.totalBets}</code>  |  ₹<code>${r.totalBetAmount}</code>\n` +
        `<b>P/L:</b> ₹<code>${r.profitLoss}</code>\n` +
        `${fmt(r.createdAt)}\n\n`;
    });

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('rst', async (ctx) => {
  const issue = ctx.message.text.split(' ')[1];
  if (!issue) return ctx.reply('Usage: /rst <issueNumber>');

  try {
    const res = await api.get(`/round-stats/${issue}`);
    const { issue: round, stats } = res.data;

    let msg =
      `📈 <b>Round #${round.issueNumber}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Result</b>  ${round.result}  (${round.color}/${round.size})\n` +
      `<b>Status</b>  ${round.status}\n` +
      `<b>Date</b>    ${fmt(round.createdAt)}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Bets</b>    <code>${stats.totalBets}</code>\n` +
      `<b>Amount</b>  ₹<code>${stats.totalBetAmount}</code>\n` +
      `<b>Payout</b>  ₹<code>${stats.totalPayout}</code>\n` +
      `<b>P/L</b>     ₹<code>${stats.profitLoss}</code>\n` +
      `Won: <code>${stats.wonCount}</code>  |  Lost: <code>${stats.lostCount}</code>\n` +
      `<b>Users</b>   <code>${stats.uniqueUsers}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Breakdown</b>\n`;

    for (const [key, d] of Object.entries(stats.breakdown)) {
      msg += `${key}: <code>${d.count}</code> bets, ₹<code>${d.amount}</code>\n`;
    }

    await replyHTML(ctx, msg);
  } catch (err) { replyWithError(ctx, err); }
});

(async () => {
  await bot.launch();
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Wake server and show menu' },
    { command: 'ui', description: 'Search user by ID' },
    { command: 'um', description: 'Search user by mobile' },
    { command: 'd', description: 'Dashboard (today/month/date)' },
    { command: 'dd', description: 'Deposits by userId or mobile' },
    { command: 'ddt', description: 'Deposit by order ID' },
    { command: 'ww', description: 'Withdrawals by userId' },
    { command: 'wwt', description: 'Withdrawal by order ID' },
    { command: 'tt', description: 'Transactions by userId' },
    { command: 'ttt', description: 'Transaction by order ID' },
    { command: 'r', description: 'Current round info' },
    { command: 'b', description: 'Current round bets' },
    { command: 'rs', description: 'Settled rounds' },
    { command: 'rst', description: 'Round stats by issue number' },
    { command: 'wakeup', description: 'Wake the Render server' },
  ]);
  console.log('Bot commands registered');
})().catch(err => {
  console.error('Bot launch failed:', err.message);
});
console.log('Bot running...');

const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'success', msg: 'ready to use' }));
}).listen(PORT, () => {
  console.log(`Health on port ${PORT}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
