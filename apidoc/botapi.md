# Telegram Bot API Documentation

## Base URL

```
https://backend-ledger-0ra6.onrender.com/api
```

## Authentication

All bot endpoints require the bot token in a custom header:

```
x-bot-token: <your_bot_api_key>
```

The `BOT_API_KEY` is configured server-side in the `.env` file. Contact the backend admin to get your bot token.

> **Note:** Unlike admin routes, bot endpoints do NOT use JWT/cookies. Just pass the `x-bot-token` header on every request.

---

## 1. User Management

### Search User or Account

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
  "deviceRisk": {
    "latest": {
      "at": "2026-03-19T10:30:00.000Z",
      "ip": "192.168.1.1",
      "ipCountry": "IN",
      "ipCity": "Mumbai",
      "isp": "ISP Name",
      "proxy": false,
      "vpnDetected": false,
      "deviceId": "device123",
      "fingerprint": "abc123",
      "platform": "Android",
      "browser": "Chrome",
      "os": "Android 12",
      "screenResolution": "1080x1920",
      "deviceMemory": 4
    },
    "latestRisk": 25,
    "signals": [],
    "flagged": false,
    "maxRisk": 25,
    "totalLogs": 5
  }
}
```

### Update User Status

```
PATCH /bot/user
```

**Body:**

```json
{
  "userId": 123456,
  "status": "suspended",
  "remark": "Violation of terms"
}
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| userId | number | Yes | User ID |
| status | string | Yes | Status: `active`, `suspended`, `inactive` |
| remark | string | No | Reason for status change |

**Response:**

```json
{
  "msg": "Status updated",
  "userId": 123456,
  "status": "suspended",
  "statusRemark": "Violation of terms",
  "updatedAt": "2026-03-19T10:30:00.000Z"
}
```

### Update User Bank Account

```
PUT /bot/user/bind-bank
```

**Body:**

```json
{
  "userId": 123456,
  "bankName": "SBI",
  "bankCode": "SBIN",
  "accountNumber": "1234567890",
  "accountHolder": "John Doe"
}
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| userId | number | Yes | User ID |
| bankName | string | Yes | Bank name |
| bankCode | string | Yes | Bank IFSC/branch code |
| accountNumber | string | Yes | Bank account number |
| accountHolder | string | Yes | Account holder name |

**Response:**

```json
{
  "msg": "Updated",
  "userId": 123456,
  "bindAccount": {
    "bankName": "SBI",
    "bankCode": "SBIN",
    "accountNumber": "1234567890",
    "accountHolder": "John Doe",
    "boundAt": "2026-03-19T10:30:00.000Z"
  }
}
```

---

## 2. Gift Code Management

### Create Gift Code

```
POST /bot/gift-codes
```

**Body (auto-generated code):**

```json
{
  "rewardAmount": 100,
  "turnoverMultiplier": 2,
  "maxRedemptions": 100,
  "expiryDate": "2026-12-31T23:59:59.000Z",
  "minDepositToday": 0,
  "isActive": true,
  "description": "Welcome bonus",
  "codeLength": 12
}
```

**Body (custom code):**

```json
{
  "code": "WELCOME2026",
  "rewardAmount": 50,
  "turnoverMultiplier": 1,
  "maxRedemptions": 1000,
  "expiryDate": "2026-12-31T23:59:59.000Z"
}
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | No | Custom code (auto-generated if not provided) |
| rewardAmount | number | Yes | Amount user receives |
| turnoverMultiplier | number | No | Turnover requirement multiplier (default: 1) |
| maxRedemptions | number | Yes | Max number of redemptions allowed |
| expiryDate | string | Yes | ISO date string |
| minDepositToday | number | No | Minimum deposit required today to redeem (default: 0) |
| isActive | boolean | No | Enable immediately (default: true) |
| description | string | No | Description for admin reference |
| codeLength | number | No | Auto-generated code length (default: 12) |

**Response:**

```json
{
  "status": "success",
  "msg": "Gift code created",
  "giftCode": {
    "_id": "...",
    "code": "A1B2C3D4E5F6",
    "rewardAmount": 100,
    "turnoverMultiplier": 2,
    "maxRedemptions": 100,
    "usedCount": 0,
    "expiryDate": "2026-12-31T23:59:59.000Z",
    "minDepositToday": 0,
    "isActive": true,
    "description": "Welcome bonus",
    "createdAt": "2026-03-23T10:00:00.000Z"
  }
}
```

---

### List Gift Codes

```
GET /bot/gift-codes?page=1&limit=25&isActive=true&search=PROMO
```

**Query Params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 25, max: 100) |
| isActive | boolean | No | Filter by active status |
| search | string | No | Search by code |

**Response:**

```json
{
  "status": "success",
  "total": 50,
  "page": 1,
  "limit": 25,
  "items": [
    {
      "_id": "...",
      "code": "WELCOME2026",
      "rewardAmount": 100,
      "turnoverMultiplier": 2,
      "maxRedemptions": 100,
      "usedCount": 15,
      "expiryDate": "2026-12-31T23:59:59.000Z",
      "minDepositToday": 500,
      "isActive": true,
      "description": "Welcome bonus for new users"
    }
  ]
}
```

---

### Get Gift Code Details

```
GET /bot/gift-codes/:code
```

**Response:**

```json
{
  "status": "success",
  "giftCode": {
    "_id": "...",
    "code": "WELCOME2026",
    "rewardAmount": 100,
    "turnoverMultiplier": 2,
    "maxRedemptions": 100,
    "usedCount": 15,
    "expiryDate": "2026-12-31T23:59:59.000Z",
    "minDepositToday": 500,
    "isActive": true,
    "description": "Welcome bonus for new users",
    "createdAt": "2026-03-01T10:00:00.000Z",
    "updatedAt": "2026-03-15T14:30:00.000Z"
  }
}
```

---

### Update Gift Code

```
PUT /bot/gift-codes/:code
```

**Body:**

```json
{
  "rewardAmount": 150,
  "turnoverMultiplier": 3,
  "maxRedemptions": 200,
  "expiryDate": "2027-06-30T23:59:59.000Z",
  "minDepositToday": 1000,
  "description": "Updated description"
}
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| rewardAmount | number | No | New reward amount |
| turnoverMultiplier | number | No | New turnover multiplier |
| maxRedemptions | number | No | New max redemptions (cannot be less than usedCount) |
| expiryDate | string | No | New expiry date |
| minDepositToday | number | No | New minimum deposit today requirement |
| description | string | No | New description |

**Response:**

```json
{
  "status": "success",
  "msg": "Gift code updated",
  "giftCode": {
    "code": "WELCOME2026",
    "rewardAmount": 150,
    "turnoverMultiplier": 3,
    "maxRedemptions": 200,
    "usedCount": 15,
    "expiryDate": "2027-06-30T23:59:59.000Z",
    "minDepositToday": 1000,
    "isActive": true,
    "description": "Updated description"
  }
}
```

---

### Toggle Gift Code (Enable/Disable)

```
PATCH /bot/gift-codes/:code/toggle
```

**Body:**

```json
{
  "isActive": false
}
```

**Response:**

```json
{
  "status": "success",
  "msg": "Gift code disabled",
  "giftCode": {
    "code": "WELCOME2026",
    "isActive": false
  }
}
```

---

### Delete Gift Code

```
DELETE /bot/gift-codes/:code
```

**Response:**

```json
{
  "status": "success",
  "msg": "Gift code deleted",
  "code": "WELCOME2026"
}
```

> **Note:** This also deletes all redemption records for this code.

---

### Get Gift Code Redemptions

```
GET /bot/gift-codes/:code/redemptions?page=1&limit=25
```

**Response:**

```json
{
  "status": "success",
  "code": "WELCOME2026",
  "usedCount": 15,
  "maxRedemptions": 100,
  "total": 15,
  "page": 1,
  "limit": 25,
  "items": [
    {
      "_id": "...",
      "code": "WELCOME2026",
      "userId": 123456,
      "rewardAmount": 100,
      "turnoverAdded": 200,
      "createdAt": "2026-03-20T10:30:00.000Z"
    }
  ]
}
```

---

## 3. Gift Code Properties Reference

| Property | Type | Description |
|----------|------|-------------|
| code | string | Unique gift code (alphanumeric, uppercase) |
| rewardAmount | number | Amount credited to user balance |
| turnoverMultiplier | number | Turnover requirement multiplier (reward x multiplier) |
| maxRedemptions | number | Maximum number of times this code can be redeemed |
| usedCount | number | Current number of redemptions |
| expiryDate | datetime | Code becomes invalid after this date |
| minDepositToday | number | User must have deposited this amount today to redeem |
| isActive | boolean | Manual enable/disable by admin |

---

## 4. Common Error Responses

### 400 Bad Request

```json
{
  "status": "failed",
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
  "status": "failed",
  "msg": "User not found"
}
```

### 500 Internal Server Error

```json
{
  "msg": "Error message here"
}
```

---

## 5. Integration Guide

### Quick Start

Every HTTP request from your Telegram bot should include:

```
x-bot-token: your_secret_bot_api_key
Content-Type: application/json
```

### Example using `node-fetch`:

```js
const BOT_TOKEN = process.env.BOT_API_KEY;
const BASE_URL = "https://backend-ledger-0ra6.onrender.com/api";

async function searchUser(userId) {
  const res = await fetch(`${BASE_URL}/bot/user?userId=${userId}`, {
    headers: { "x-bot-token": BOT_TOKEN },
  });
  return res.json();
}

async function createGiftCode(data) {
  const res = await fetch(`${BASE_URL}/bot/gift-codes`, {
    method: "POST",
    headers: {
      "x-bot-token": BOT_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return res.json();
}
```

### Example using `axios`:

```js
import axios from "axios";

const api = axios.create({
  baseURL: "https://backend-ledger-0ra6.onrender.com/api",
  headers: { "x-bot-token": process.env.BOT_API_KEY },
});

// Search user
const user = await api.get("/bot/user", { params: { userId: 123456 } });

// Create gift code
const giftCode = await api.post("/bot/gift-codes", {
  rewardAmount: 100,
  maxRedemptions: 50,
  expiryDate: "2026-12-31T23:59:59.000Z",
});
```

### Telegram Bot Command Ideas

| Command | API Call | Description |
|---------|----------|-------------|
| `/user 123456` | `GET /bot/user?userId=123456` | Look up a user |
| `/status 123456 suspended` | `PATCH /bot/user` | Update user status |
| `/createcode 100 50` | `POST /bot/gift-codes` | Create a gift code |
| `/codes` | `GET /bot/gift-codes` | List all gift codes |
