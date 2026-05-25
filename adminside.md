# Admin Side API Documentation

## Base URL

```
https://backend-ledger-0ra6.onrender.com/api
```

## Authentication

All admin endpoints require Bearer token with admin privileges in header:

```
Authorization: Bearer <admin_token>
```

---

## 1. Dashboard

### Get Admin Dashboard

```
GET /admin/dashboard
```

or with date filter:

```
GET /admin/dashboard?period=today
GET /admin/dashboard?period=month
GET /admin/dashboard?date=2026-03-20
```

**Query Params:**
| Param | Type | Required | Description |
|-------|------|---------|-------------|
| period | string | No | Filter by period: `today`, `month` |
| date | string | No | Filter by specific date (YYYY-MM-DD) |

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
    "success": {
      "count": 25,
      "total": 25000.0
    },
    "pending": {
      "count": 3,
      "total": 3000.0
    },
    "failed": {
      "count": 2,
      "total": 2000.0
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

| Field | Description |
|-------|-------------|
| period | Filter applied: `today`, `month`, or date string |
| overview.totalUsers | Total registered users |
| overview.newUsers | New users in selected period |
| deposits.total | Total deposit amount |
| deposits.count | Number of successful deposits |
| deposits.pendingCount | Number of pending deposits |
| withdrawals.total | Total withdrawal amount |
| withdrawals.success | Successful withdrawals |
| withdrawals.pending | Pending + Auditing withdrawals |
| withdrawals.failed | Failed withdrawals |
| withdrawals.byStatus | Breakdown by status |
| agentCommission.total | Total agent commission paid |
| agentCommission.count | Number of commission transactions |

---

## 2. User Management

### Search User or Account

```
GET /admin/user?userId=123456
```

**Query Params:**
| Param | Type | Required | Description |
|-------|------|---------|-------------|
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
PATCH /admin/user
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
|-------|------|---------|-------------|
| userId | number | Yes | User ID |
| status | string | Yes | Status: active, suspended, inactive |
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
PUT /admin/user/bind-bank
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

## 3. Deposits

### Get Deposit Orders

**Get all orders with filters:**

```
GET /admin/deposits?page=1&limit=50&status=PENDING&dateFrom=2026-03-01&dateTo=2026-03-20
```

**Get orders by user:**

```
GET /admin/deposits?userId=123456&page=1&limit=50
```

**Get single order:**

```
GET /admin/deposits?orderId=ODR1234567890123456
```

**Query Params:**
| Param | Type | Required | Description |
|-------|------|---------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 50, max: 100) |
| status | string | No | Filter: PENDING, SUCCESS, FAILED, REFUNDED, EXPIRED |
| userId | number | No | Filter by user ID |
| dateFrom | string | No | Start date (YYYY-MM-DD) |
| dateTo | string | No | End date (YYYY-MM-DD) |
| orderId | string | No | Get single order by ID |

**Response (paginated):**

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

**Available Channels:**
| Channel | Description |
|---------|-------------|
| SimplyPay | Default channel |
| FPay | Alternative channel |
| UPay | UPay gateway channel |

**Deposit Status Values:**

| Status | Description |
|--------|-------------|
| PENDING | Deposit initiated, awaiting payment confirmation |
| SUCCESS | Payment received and credited to user wallet |
| FAILED | Payment failed or rejected |
| REFUNDED | Amount refunded to user |
| EXPIRED | Payment link expired |

### Approve Deposit Order

```
POST /admin/deposits/approve
```

**Body:**

```json
{
  "orderId": "ODR1234567890123456"
}
```

**Response:**

```json
{
  "msg": "Deposit approved",
  "orderId": "ODR1234567890123456",
  "userId": 123456,
  "amount": 1000.0,
  "status": "SUCCESS",
  "firstDepositBonus": 0
}
```

---

## 4. Transactions

### Get User Transactions (Paginated)

```
GET /admin/transactions?userId=123456&page=1&limit=25
```

**Query Params:**
| Param | Type | Required | Description |
|-------|------|---------|-------------|
| userId | number | Yes | User ID |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 25, max: 100) |

**Response:**

```json
{
  "userId": 123456,
  "total": 50,
  "page": 1,
  "limit": 25,
  "items": [
    {
      "userId": 123456,
      "type": "DEPOSIT",
      "amount": 1000.0,
      "balanceAfter": 2000.0,
      "status": "SUCCESS",
      "orderId": "DEP123456",
      "remark": "Deposit via Paysimply",
      "createdAt": "2026-03-19T10:30:00.000Z"
    },
    {
      "userId": 123456,
      "type": "WITHDRAW",
      "amount": 500.0,
      "balanceAfter": 1500.0,
      "status": "PENDING",
      "orderId": "WD1234567890123",
      "remark": "Withdrawal request",
      "createdAt": "2026-03-19T11:00:00.000Z"
    }
  ]
}
```

---

## 5. Withdrawals

### Get Withdrawal Orders

**Get all orders with filters:**

```
GET /admin/withdrawals?page=1&limit=50&status=PENDING&dateFrom=2026-03-01&dateTo=2026-03-20
```

**Get orders by user:**

```
GET /admin/withdrawals?userId=123456&page=1&limit=50
```

**Get single order:**

```
GET /admin/withdrawals?orderId=WD1234567890123456
```

**Query Params:**
| Param | Type | Required | Description |
|-------|------|---------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 50, max: 100) |
| status | string | No | Filter: PENDING, AUDITING, SUCCESS, FAILED, CANCELLED |
| userId | number | No | Filter by user ID |
| dateFrom | string | No | Start date (YYYY-MM-DD) |
| dateTo | string | No | End date (YYYY-MM-DD) |
| orderId | string | No | Get single order by ID |

**Response (paginated):**

```json
{
  "status": "success",
  "total": 150,
  "page": 1,
  "limit": 50,
  "items": [
    {
      "_id": "...",
      "orderId": "WD1234567890123456",
      "userId": 123456,
      "amount": 500.0,
      "currency": "INR",
      "status": "PENDING",
      "gatewayOrderNo": null,
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

**Available Payout Channels:**
| Channel | Description |
|---------|-------------|
| SimplyPay | Default payout via SimplyPay API (uses IFSC + account) |
| UPay | Payout via UPay API (uses account number as address) |

**Withdrawal Status Values:**

| Status | Description |
|--------|-------------|
| PENDING | Withdrawal requested, awaiting admin approval |
| AUDITING | Admin approved, payout order created with gateway (SimplyPay/UPay) |
| SUCCESS | Payout completed successfully |
| FAILED | Payout failed (user refunded automatically) |
| CANCELLED | Payout cancelled/refunded |

### Approve Withdrawal Order

```
POST /admin/withdrawals/approve
```

**Body:**

```json
{
  "orderId": "WD1234567890123456"
}
```

**How it works:**
The approval automatically routes to the correct payout gateway based on the withdrawal order's `channelName`:
- `SimplyPay` → Uses SimplyPay payout API (requires IFSC + bank account)
- `UPay` → Uses UPay payout API (uses account number as address)

**Response (SimplyPay):**

```json
{
  "status": "success",
  "msg": "Withdrawal approved and payout order created",
  "orderId": "WD1234567890123456",
  "userId": 123456,
  "amount": 500.0,
  "gatewayOrderNo": "dc07e03f03b94e8a9f29702863d35fd5",
  "status": "AUDITING"
}
```

**Response (UPay):**

```json
{
  "status": "success",
  "msg": "Withdrawal approved and payout order created",
  "orderId": "WD1234567890123456",
  "userId": 123456,
  "amount": 500.0,
  "gatewayOrderNo": "UPAY_ORDER_CODE",
  "status": "AUDITING"
}
```

**Error (already processed):**

```json
{
  "status": "failed",
  "msg": "Cannot approve: order is in AUDITING status",
  "currentStatus": "AUDITING"
}
```

---

## 6. Agent

### Get Agent Stats

```
GET /admin/agent-stats?userId=123456&page=1&limit=50
```

**Query Params:**
| Param | Type | Required | Description |
|-------|------|---------|-------------|
| userId | number | Yes | Agent user ID |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 50, max: 100) |

**Response:**

```json
{
  "agent": {
    "userId": 123456,
    "mobile": "9876543210",
    "admin": false,
    "referredBy": 100001,
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  "inviter": {
    "userId": 100001,
    "mobile": "9876543100",
    "createdAt": "2025-12-01T00:00:00.000Z"
  },
  "totalInvitees": 25,
  "page": 1,
  "limit": 50,
  "invitees": [
    {
      "userId": 123457,
      "mobile": "9876543211",
      "createdAt": "2026-02-01T00:00:00.000Z",
      "totals": {
        "deposit": 5000.0,
        "withdraw": 1000.0
      }
    }
  ]
}
```

### Get Agent Config

```
GET /admin/agent-config
```

**Response:**

```json
{
  "comRates": [0.05, 0.02, 0.01]
}
```

### Update Agent Config

```
PUT /admin/agent-config
```

**Body:**

```json
{
  "comRates": [0.05, 0.02, 0.01]
}
```

**Response:**

```json
{
  "msg": "Updated",
  "comRates": [0.05, 0.02, 0.01]
}
```

### Get Agent Daily Stats

```
GET /admin/agent-daily?userId=123456&date=2026-03-19
```

**Query Params:**
| Param | Type | Required | Description |
|-------|------|---------|-------------|
| userId | number | Yes | Agent user ID |
| date | string | No | Date (YYYY-MM-DD), defaults to today |

**Response:**

```json
{
  "userId": 123456,
  "date": "2026-03-19T00:00:00.000Z",
  "level1": {
    "deposit": 1000.0,
    "commission": 50.0,
    "count": 2
  },
  "level2": {
    "deposit": 500.0,
    "commission": 10.0,
    "count": 5
  },
  "level3": {
    "deposit": 200.0,
    "commission": 2.0,
    "count": 10
  }
}
```

---

## 7. Bet Records

### Create Bet Record (Admin)

```
POST /admin/bet-record
```

**Body:**

```json
{
  "userId": 123456,
  "amount": 100,
  "product": "SL",
  "gameId": "51",
  "site": "JE",
  "status": 1
}
```

| Param | Type | Required | Description |
|-------|------|---------|-------------|
| userId | number | Yes | User ID |
| amount | number | Yes | Bet amount (positive=win, negative=loss) |
| product | string | No | Game type (default: SL) |
| gameId | string | No | Game ID (default: "0") |
| site | string | No | Provider code (default: JE) |
| status | number | No | Status: 1=valid (default) |

**Response:**

```json
{
  "status": "success",
  "msg": "Bet record created successfully",
  "record": {
    "_id": "...",
    "member": "u123456",
    "site": "JE",
    "product": "SL",
    "gameId": "51",
    "refNo": "ADM1234567890ABCDEF",
    "bet": 100,
    "payout": 100,
    "turnover": 100,
    "status": 1,
    "betTime": "2026-03-19T10:30:00.000Z",
    "settleTime": "2026-03-19T10:30:00.000Z"
  },
  "turnoverUpdated": {
    "processed": 1,
    "turnover_requirement": 900,
    "canWithdraw": false
  }
}
```

---

## 8. VIP Configuration

### Get VIP Config

```
GET /admin/vip-config
```

**Response:**

```json
{
  "levels": [
    {
      "name": "VIP0",
      "minDeposit": 0,
      "dailyWithdrawLimit": 0,
      "monthlyCheckinBonus": 0
    },
    {
      "name": "VIP1",
      "minDeposit": 1000,
      "dailyWithdrawLimit": 1000,
      "monthlyCheckinBonus": 50
    }
  ]
}
```

### Update VIP Config

```
PUT /admin/vip-config
```

**Body:**

```json
{
  "levels": [
    {
      "name": "VIP0",
      "minDeposit": 0,
      "dailyWithdrawLimit": 0,
      "monthlyCheckinBonus": 0
    },
    {
      "name": "VIP1",
      "minDeposit": 1000,
      "dailyWithdrawLimit": 1000,
      "monthlyCheckinBonus": 50
    }
  ]
}
```

---

## 9. Turnover Management

### Get Turnover Config

```
GET /admin/turnover-config
```

**Response:**

```json
{
  "status": "success",
  "configs": [
    {
      "_id": "...",
      "type": "DEPOSIT",
      "multiplier": 1,
      "description": "Deposit turnover requirement",
      "active": true
    },
    {
      "type": "VIP_BONUS",
      "multiplier": 1,
      "description": "VIP Bonus turnover requirement",
      "active": true
    }
  ]
}
```

### Update Turnover Config

```
PUT /admin/turnover-config
```

**Body:**

```json
{
  "type": "DEPOSIT",
  "multiplier": 2,
  "active": true,
  "description": "Deposit requires 2x turnover"
}
```

### Get User Turnover Status

```
GET /admin/turnover-status?userId=123456
```

**Response:**

```json
{
  "status": "success",
  "userId": 123456,
  "turnover_requirement": 500,
  "total_turnover_completed": 1500,
  "progress": 75,
  "canWithdraw": false,
  "batches": [
    {
      "type": "DEPOSIT",
      "amount": 1000,
      "multiplier": 1,
      "required": 1000,
      "completed": 1000,
      "remaining": 0,
      "createdAt": "2026-03-17T10:00:00.000Z",
      "lastCalcAt": "2026-03-17T10:05:00.000Z"
    }
  ]
}
```

### Clear User Turnover

```
POST /admin/turnover/clear
```

**Body:**

```json
{
  "userId": 123456,
  "reason": "Customer service resolution"
}
```

**Response:**

```json
{
  "status": "success",
  "cleared": true,
  "userId": 123456
}
```

### Add Turnover to User

```
POST /admin/turnover/add
```

**Body:**

```json
{
  "userId": 123456,
  "amount": 1000,
  "type": "ADMIN_BONUS",
  "sourceRef": "PROMO123"
}
```

| Param | Type | Required | Description |
|-------|------|---------|-------------|
| userId | number | Yes | User ID |
| amount | number | Yes | Amount to add |
| type | string | No | Type (default: ADMIN_BONUS) |
| sourceRef | string | No | Reference ID |

**Response:**

```json
{
  "status": "success",
  "batchId": "...",
  "type": "ADMIN_BONUS",
  "amount": 1000,
  "multiplier": 1,
  "required": 1000,
  "totalTurnover": 2000
}
```

---

## 10. Game - Move Balance

### Move Game Balance to Wallet

```
POST /admin/move-game-to-wallet
```

**Options:**

```json
// Option 1: Range of users
{
  "userId": 100001,
  "userIdTo": 100050,
  "providerCode": "ALL"
}

// Option 2: Array of users
{
  "userIds": [100001, 100002, 100003],
  "providerCode": "ALL"
}

// Option 3: Single user
{
  "userId": 100001,
  "providerCode": "JE"
}
```

| Param | Type | Required | Description |
|-------|------|---------|-------------|
| userId | number | Yes* | Start user ID (*required if userIds not provided) |
| userIdTo | number | No | End user ID for range |
| userIds | array | Yes* | Array of user IDs |
| providerCode | string | No | PG, JE, JD, TU, or ALL (default: ALL) |

**Response:**

```json
{
  "status": "success",
  "msg": "Balance moved from all games to wallet",
  "totalUsersProcessed": 50,
  "totalAmountMoved": 5000,
  "users": [
    {
      "userId": 100001,
      "success": true,
      "providers": [
        {
          "provider": "JE",
          "amount": 100,
          "success": true,
          "referenceId": "GMOUT123456"
        },
        {
          "provider": "JD",
          "amount": 50,
          "success": true,
          "referenceId": "GMOUT123457"
        }
      ],
      "moved": 150,
      "walletBalance": 1150
    }
  ]
}
```

---

## 11. Logs

### Get Server Logs

```
GET /admin/logs?level=error&limit=100
```

**Query Params:**
| Param | Type | Required | Description |
|-------|------|---------|-------------|
| level | string | No | Log level: info, warn, error |
| since | string | No | ISO date string |
| limit | number | No | Max entries (default: 200) |

**Response:**

```json
{
  "status": "success",
  "count": 50,
  "entries": [
    {
      "level": "info",
      "message": "User logged in",
      "timestamp": "2026-03-19T10:30:00.000Z",
      "meta": {}
    }
  ]
}
```

---

## Common Error Responses

### 400 Bad Request

```json
{
  "status": "failed",
  "msg": "Invalid or missing userId"
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

## 12. Gift Code System

### Create Gift Code

```
POST /admin/gift-codes
```

**Body:**

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

Or with a custom code:

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
|-------|------|---------|-------------|
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
GET /admin/gift-codes?page=1&limit=25&isActive=true&search=PROMO
```

**Query Params:**
| Param | Type | Required | Description |
|-------|------|---------|-------------|
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

### Get Gift Code

```
GET /admin/gift-codes/:code
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
PUT /admin/gift-codes/:code
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
|-------|------|---------|-------------|
| rewardAmount | number | No | New reward amount |
| turnoverMultiplier | number | No | New turnover multiplier |
| maxRedemptions | number | No | New max redemptions (cannot be less than usedCount) |
| expiryDate | string | No | New expiry date |
| minDepositToday | number | No | New minimum deposit today requirement |
| isActive | boolean | No | Enable/disable via PATCH endpoint |
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
PATCH /admin/gift-codes/:code/toggle
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
DELETE /admin/gift-codes/:code
```

**Response:**

```json
{
  "status": "success",
  "msg": "Gift code deleted",
  "code": "WELCOME2026"
}
```

**Note:** This also deletes all redemption records for this code.

---

### Get Gift Code Redemptions

```
GET /admin/gift-codes/:code/redemptions?page=1&limit=25
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

### Gift Code Properties

| Property | Type | Description |
|----------|------|-------------|
| code | string | Unique gift code (alphanumeric, uppercase) |
| rewardAmount | number | Amount credited to user balance |
| turnoverMultiplier | number | Turnover requirement multiplier (reward × multiplier) |
| maxRedemptions | number | Maximum number of times this code can be redeemed |
| usedCount | number | Current number of redemptions |
| expiryDate | datetime | Code becomes invalid after this date |
| minDepositToday | number | User must have deposited this amount today to redeem |
| isActive | boolean | Manual enable/disable by admin |

---

### Redemption Validation Rules

1. Code must exist
2. Code must be active (isActive: true)
3. Current time must be before expiryDate
4. usedCount must be less than maxRedemptions
5. User must not have already redeemed this code
6. If minDepositToday > 0, user must have deposited at least that amount today
