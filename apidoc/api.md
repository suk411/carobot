# Telegram Bot API

## Base URL

```
https://backend-ledger-0ra6.onrender.com/api
```

## Authentication

All bot endpoints require the bot token in a custom header:

```
x-bot-token: <your_bot_api_key>
```

The `BOT_API_KEY` is configured server-side in the `.env` file.

---

## Full User Search

Returns user profile, account details, aggregated stats, recent transactions, deposits, and withdrawals — all in one call.

```
GET /bot/user?userId=123456
```

**Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| userId | number | Yes | User ID |

**Response:**

```json
{
  "user": {
    "userId": 123456,
    "mobile": "9876543210",
    "admin": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-15T00:00:00.000Z"
  },
  "account": {
    "user": 123456,
    "balance": 1000.0,
    "withdrawable": 0,
    "turnover_requirement": 500,
    "totalDeposits": 5000.0,
    "vipLevel": "VIP1",
    "gameMemberCreated": true,
    "status": "active"
  },
  "stats": {
    "totalDeposits": 5000.0,
    "depositCount": 5,
    "totalWithdrawals": 2000.0,
    "withdrawalCount": 3
  },
  "recentTransactions": [
    {
      "userId": 123456,
      "type": "DEPOSIT",
      "amount": 1000.0,
      "charge": 0,
      "balanceAfter": 2000.0,
      "status": "SUCCESS",
      "orderId": "DEP123456",
      "remark": "",
      "createdAt": "2026-03-19T10:30:00.000Z",
      "updatedAt": "2026-03-19T10:30:00.000Z"
    },
    {
      "userId": 123456,
      "type": "BET",
      "amount": 100.0,
      "charge": 0,
      "balanceAfter": 1900.0,
      "status": "SUCCESS",
      "orderId": "ORD123456",
      "remark": "Wingo bet on green",
      "createdAt": "2026-03-19T11:00:00.000Z",
      "updatedAt": "2026-03-19T11:00:00.000Z"
    }
  ],
  "recentDeposits": [
    {
      "orderId": "ODR123456",
      "userId": 123456,
      "amount": 1000.0,
      "receivedAmount": 1000.0,
      "currency": "INR",
      "status": "SUCCESS",
      "channelName": "SimplyPay",
      "note": "Deposit request",
      "createdAt": "2026-03-19T10:30:00.000Z",
      "updatedAt": "2026-03-19T10:30:00.000Z"
    }
  ],
  "recentWithdrawals": [
    {
      "orderId": "WD123456",
      "userId": 123456,
      "amount": 500.0,
      "charge": 0,
      "paymentMethod": "UPI",
      "status": "SUCCESS",
      "channelName": "SimplyPay",
      "note": "Withdrawal request",
      "createdAt": "2026-03-19T11:00:00.000Z",
      "updatedAt": "2026-03-19T11:00:00.000Z"
    }
  ]
}
```

| Response Field | Description |
|---------------|-------------|
| user | User profile (userId, mobile, admin, created/updated dates) |
| account | Wallet account (balance, turnover requirement, VIP level, status) |
| stats | Aggregated deposit/withdrawal totals and counts |
| recentTransactions | Last 25 transaction ledger entries (all types: DEPOSIT, BET, WIN, WITHDRAW, etc.) |
| recentDeposits | Last 25 deposit orders |
| recentWithdrawals | Last 25 withdrawal orders |

---

## Error Responses

### 400 Bad Request — Missing userId

```json
{
  "msg": "Invalid or missing userId"
}
```

### 401 Missing Token

```json
{
  "status": "failed",
  "msg": "Bot token is required"
}
```

### 403 Invalid Token

```json
{
  "status": "failed",
  "msg": "Invalid bot token"
}
```

### 404 Not Found

```json
{
  "msg": "User not found"
}
```

### 500 Server Error

```json
{
  "msg": "Error message here"
}
```

---

## Integration Example

```js
const BOT_TOKEN = process.env.BOT_API_KEY;
const BASE_URL = "https://backend-ledger-0ra6.onrender.com/api";

async function searchUser(userId) {
  const res = await fetch(`${BASE_URL}/bot/user?userId=${userId}`, {
    headers: { "x-bot-token": BOT_TOKEN },
  });
  return res.json();
}
```
