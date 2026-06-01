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

## 1. Full User Search

Matches admin `/admin/user` response exactly. Returns user profile, account details, payment methods, and device risk info.

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
    "status": "active",
    "bindAccount": {
      "bankName": "SBI",
      "bankCode": "SBIN",
      "accountNumber": "1234567890",
      "accountHolder": "John Doe",
      "boundAt": "2026-01-10T00:00:00.000Z"
    }
  },
  "paymentMethods": [...],
  "sameIpUsers": [],
  "lastIp": "192.168.1.1"
}
```

---

## 2. Dashboard (Today by Default)

Returns today's dashboard stats. No date params needed — defaults to today automatically. Matches admin `/admin/dashboard` response exactly.

```
GET /bot/dashboard
```

**Response:**

```json
{
  "status": "success",
  "period": "today",
  "overview": {
    "totalUsers": 1000,
    "newUsers": 25
  },
  "deposits": {
    "total": 50000.0,
    "count": 50,
    "pendingCount": 5
  },
  "withdrawals": {
    "total": 30000.0,
    "count": 30,
    "chargeTotal": 1200.0,
    "success": {
      "count": 25,
      "total": 25000.0,
      "chargeTotal": 1000.0
    },
    "pending": {
      "count": 3,
      "total": 3000.0,
      "chargeTotal": 120.0
    },
    "failed": {
      "count": 2,
      "total": 2000.0,
      "chargeTotal": 80.0
    },
    "byStatus": {
      "SUCCESS": { "count": 25, "total": 25000.0 },
      "PENDING": { "count": 2, "total": 2000.0 },
      "AUDITING": { "count": 1, "total": 1000.0 },
      "FAILED": { "count": 2, "total": 2000.0 }
    }
  },
  "agentCommission": {
    "total": 500.0,
    "count": 20
  }
}
```

---

## 3. Deposit Orders

Search deposit orders by `userId` or `orderId`. Matches admin `/admin/deposits` response exactly.

```
GET /bot/deposits?userId=123456
GET /bot/deposits?orderId=ODR1234567890123456
```

**Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| userId | number | No | Filter by user ID |
| orderId | string | No | Get single order by ID |
| mobile | string | No | Filter by mobile number |
| status | string | No | Filter: PENDING, SUCCESS, FAILED, REFUNDED, EXPIRED |
| dateFrom | string | No | Start date (YYYY-MM-DD) |
| dateTo | string | No | End date (YYYY-MM-DD) |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 50, max: 100) |

**Response:**

```json
{
  "status": "success",
  "total": 150,
  "page": 1,
  "limit": 50,
  "items": [
    {
      "_id": "...",
      "orderId": "ODR1234567890123456",
      "userId": 123456,
      "amount": 1000.0,
      "receivedAmount": 1000.0,
      "currency": "INR",
      "status": "PENDING",
      "gatewayOrderNo": "gw123456",
      "paymentLinks": {},
      "channelName": "SimplyPay",
      "note": "Deposit request",
      "createdAt": "2026-03-19T10:30:00.000Z",
      "updatedAt": "2026-03-19T10:30:00.000Z"
    }
  ]
}
```

---

## 4. Withdrawal Orders

Search withdrawal orders by `userId` or `orderId`. Matches admin `/admin/withdrawals` response exactly.

```
GET /bot/withdrawals?userId=123456
GET /bot/withdrawals?orderId=WD1234567890123456
```

**Query Params:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| userId | number | No | Filter by user ID |
| orderId | string | No | Get single order by ID |
| status | string | No | Filter: PENDING, AUDITING, SUCCESS, FAILED, CANCELLED |
| dateFrom | string | No | Start date (YYYY-MM-DD) |
| dateTo | string | No | End date (YYYY-MM-DD) |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 50, max: 100) |

**Response:**

```json
{
  "status": "success",
  "total": 50,
  "page": 1,
  "limit": 50,
  "items": [
    {
      "_id": "...",
      "orderId": "WD1234567890123456",
      "userId": 123456,
      "amount": 500.0,
      "charge": 0,
      "currency": "INR",
      "status": "PENDING",
      "paymentMethod": "UPI",
      "paymentDetails": {
        "upiId": "user@upi",
        "accountNo": "",
        "ifsc": "",
        "bankName": "",
        "rplId": "",
        "holderName": "John Doe"
      },
      "bankDetails": {
        "bankName": "SBI",
        "bankCode": "UTIB0001617",
        "accountNumber": "923010051550740",
        "accountHolder": "John Doe",
        "ifsc": "UTIB0001617"
      },
      "channelName": "SimplyPay",
      "note": "Withdrawal request",
      "createdAt": "2026-03-19T10:30:00.000Z",
      "updatedAt": "2026-03-19T10:30:00.000Z"
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request

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

// Full user lookup
const user = await fetch(`${BASE_URL}/bot/user?userId=123456`, {
  headers: { "x-bot-token": BOT_TOKEN },
});

// Today's dashboard
const dashboard = await fetch(`${BASE_URL}/bot/dashboard`, {
  headers: { "x-bot-token": BOT_TOKEN },
});

// Deposit orders by user
const deposits = await fetch(`${BASE_URL}/bot/deposits?userId=123456`, {
  headers: { "x-bot-token": BOT_TOKEN },
});

// Withdrawal orders by orderId
const withdrawal = await fetch(`${BASE_URL}/bot/withdrawals?orderId=WD123456`, {
  headers: { "x-bot-token": BOT_TOKEN },
});
```
