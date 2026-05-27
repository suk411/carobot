# Telegram Bot API

See the full API spec in the root docs folder:

- [`api docs\botapi.md`](../botapi.md)

## Authentication

```
x-bot-token: <your_bot_api_key>
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bot/user?userId=` | Search user or account |
| PATCH | `/bot/user` | Update user status |
| PUT | `/bot/user/bind-bank` | Update user bank account |
| POST | `/bot/gift-codes` | Create gift code |
| GET | `/bot/gift-codes` | List gift codes |
| GET | `/bot/gift-codes/:code` | Get gift code details |
| PUT | `/bot/gift-codes/:code` | Update gift code |
| PATCH | `/bot/gift-codes/:code/toggle` | Enable/disable gift code |
| DELETE | `/bot/gift-codes/:code` | Delete gift code |
| GET | `/bot/gift-codes/:code/redemptions` | Get gift code redemptions |
