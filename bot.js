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

bot.start((ctx) => {
  ctx.reply(
    'Welcome to Carobot Bot!\n\n' +
    'Commands:\n' +
    '/user <userId> - Search user\n' +
    '/status <userId> <status> - Update user status (active/suspended/inactive)\n' +
    '/bindbank <userId> <bankName> <ifsc> <accountNo> <holder> - Update bank\n' +
    '/giftcodes [page] - List gift codes\n' +
    '/code <code> - Get gift code details\n' +
    '/createcode <reward> <maxRedeems> <expiry> [multiplier] - Create gift code\n' +
    '/updatecode <code> <field> <value> - Update gift code\n' +
    '/togglecode <code> - Enable/disable gift code\n' +
    '/deletecode <code> - Delete gift code\n' +
    '/redemptions <code> - List redemptions\n' +
    '/deposit <orderId> - Search deposit order'
  );
});

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
    ctx.reply(
      `👤 User Info\n\n` +
      `ID: ${user.userId}\n` +
      `Mobile: ${user.mobile}\n` +
      `Status: ${account.status}\n` +
      `VIP: ${account.vipLevel}\n` +
      `Balance: ${account.balance}\n` +
      `Withdrawable: ${account.withdrawable}\n` +
      `Total Deposits: ${account.totalDeposits}\n` +
      `Bank: ${bank ? bank.bankName + ' - ' + bank.accountHolder : 'none'}\n` +
      `Created: ${new Date(user.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    );
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('status', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const userId = parts[1];
  const status = parts[2];
  const remark = parts.slice(3).join(' ') || '';
  if (!userId || !status) return ctx.reply('Usage: /status <userId> <active|suspended|inactive> [remark]');
  try {
    const res = await api.patch('/bot/user', { userId, status, remark });
    ctx.reply(`✅ Status updated\nUser: ${res.data.userId}\nStatus: ${res.data.status}`);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('bindbank', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const userId = parts[1];
  const bankName = parts[2];
  const bankCode = parts[3];
  const accountNumber = parts[4];
  const accountHolder = parts.slice(5).join(' ');
  if (!userId || !bankName || !bankCode || !accountNumber || !accountHolder) {
    return ctx.reply('Usage: /bindbank <userId> <bankName> <ifsc> <accountNo> <holder>');
  }
  try {
    const res = await api.put('/bot/user/bind-bank', { userId, bankName, bankCode, accountNumber, accountHolder });
    ctx.reply(`✅ Bank updated for user ${res.data.userId}`);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('giftcodes', async (ctx) => {
  const page = ctx.message.text.split(' ')[1] || 1;
  try {
    const res = await api.get('/bot/gift-codes', { params: { page, limit: 25 } });
    const { items, total, page: p } = res.data;
    if (!items || items.length === 0) return ctx.reply('No gift codes found.');
    let msg = `🎁 Gift Codes (Page ${p}/${Math.ceil(total / 25)})\n\n`;
    items.forEach((c, i) => {
      msg += `${i + 1}. ${c.code} — ${c.rewardAmount} (${c.usedCount}/${c.maxRedemptions} used) ${c.isActive ? '✅' : '❌'}\n`;
    });
    ctx.reply(msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('code', async (ctx) => {
  const code = ctx.message.text.split(' ')[1];
  if (!code) return ctx.reply('Usage: /code <giftCode>');
  try {
    const res = await api.get(`/bot/gift-codes/${code}`);
    const c = res.data.giftCode;
    ctx.reply(
      `🎁 Gift Code: ${c.code}\n\n` +
      `Reward: ${c.rewardAmount}\n` +
      `Turnover Multiplier: ${c.turnoverMultiplier}\n` +
      `Redeemed: ${c.usedCount}/${c.maxRedemptions}\n` +
      `Min Deposit Today: ${c.minDepositToday}\n` +
      `Active: ${c.isActive ? '✅' : '❌'}\n` +
      `Expires: ${new Date(c.expiryDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n` +
      `Description: ${c.description || '-'}`
    );
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('createcode', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const rewardAmount = parts[1];
  const maxRedemptions = parts[2];
  const expiryDate = parts[3];
  const turnoverMultiplier = parts[4] || 1;
  if (!rewardAmount || !maxRedemptions || !expiryDate) {
    return ctx.reply('Usage: /createcode <reward> <maxRedeems> <expiry> [multiplier]\nExpiry: YYYY-MM-DD or ISO date');
  }
  const expiry = expiryDate.includes('T') ? expiryDate : `${expiryDate}T23:59:59.000Z`;
  try {
    const res = await api.post('/bot/gift-codes', { rewardAmount, maxRedemptions, expiryDate: expiry, turnoverMultiplier });
    ctx.reply(`✅ Gift code created: ${res.data.giftCode.code} (${rewardAmount})`);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('updatecode', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const code = parts[1];
  const field = parts[2];
  const value = parts.slice(3).join(' ');
  if (!code || !field || !value) {
    return ctx.reply('Usage: /updatecode <code> <field> <value>\nFields: rewardAmount, maxRedemptions, expiryDate, turnoverMultiplier, description, minDepositToday');
  }
  try {
    const res = await api.put(`/bot/gift-codes/${code}`, { [field]: isNaN(value) ? value : Number(value) });
    ctx.reply(`✅ ${code} updated`);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('togglecode', async (ctx) => {
  const code = ctx.message.text.split(' ')[1];
  if (!code) return ctx.reply('Usage: /togglecode <giftCode>');
  try {
    const cur = await api.get(`/bot/gift-codes/${code}`);
    const newActive = !cur.data.giftCode.isActive;
    const res = await api.patch(`/bot/gift-codes/${code}/toggle`, { isActive: newActive });
    ctx.reply(`✅ ${code} is now ${res.data.giftCode.isActive ? 'enabled' : 'disabled'}`);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('deletecode', async (ctx) => {
  const code = ctx.message.text.split(' ')[1];
  if (!code) return ctx.reply('Usage: /deletecode <giftCode>');
  try {
    await api.delete(`/bot/gift-codes/${code}`);
    ctx.reply(`✅ Gift code ${code} deleted`);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('redemptions', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  const code = parts[1];
  const page = parts[2] || 1;
  if (!code) return ctx.reply('Usage: /redemptions <giftCode> [page]');
  try {
    const res = await api.get(`/bot/gift-codes/${code}/redemptions`, { params: { page, limit: 25 } });
    const { items, total } = res.data;
    if (!items || items.length === 0) return ctx.reply('No redemptions found.');
    let msg = `🔄 Redemptions for ${code} (${total} total)\n\n`;
    items.forEach((r, i) => {
      msg += `${i + 1}. User ${r.userId} — ${r.rewardAmount} at ${new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
    });
    ctx.reply(msg);
  } catch (err) { replyWithError(ctx, err); }
});

bot.command('deposit', async (ctx) => {
  const orderId = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!orderId) return ctx.reply('Usage: /deposit <orderId>');
  try {
    const res = await api.get('/admin/deposits', { params: { orderId } });
    const data = res.data;
    if (!data.items || data.items.length === 0) return ctx.reply('No deposit order found.');
    const item = data.items[0];
    const created = new Date(item.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    ctx.reply(
      `📦 Deposit Order\n\n` +
      `Order ID: ${item.orderId}\n` +
      `User ID: ${item.userId}\n` +
      `Amount: ${item.amount} ${item.currency}\n` +
      `Status: ${item.status}\n` +
      `Channel: ${item.channelName}\n` +
      `Note: ${item.note || '-'}\n` +
      `Created: ${created}`
    );
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
