# Multi-tenant Digital Loyalty Wallet Platform

**Google Wallet first → Apple Wallet ready**

White-label loyalty card service. You create Companies & Programs for your clients. End-users receive an NFC card with a unique join link, sign up, and immediately get a personalized digital loyalty card in Google Wallet.

## Features (Phase 1)

- True multi-tenant (`companyId` on every relevant table)
- Unique never-reused `walletId` / serialNumber per Membership
- POINTS and STAMPS programs
- Fully brandable (logo, colors, hero image per Company/Program)
- Working “Save to Google Wallet” JWT link after signup
- Automatic Google Wallet object update on every balance change
- Full loyalty history audit trail
- Webhook + protected admin endpoints for points/stamps
- WalletProvider abstraction → adding Apple later is trivial
- French + English ready (locale field)
- Rate limiting, webhook secret, tenant isolation

## Tech Stack

- NestJS 11 + Fastify
- TypeScript (strict)
- PostgreSQL + Prisma
- Passport + JWT + email/password (Google/Apple OAuth ready)
- class-validator / class-transformer
- Swagger
- google-auth-library + jsonwebtoken for Google Wallet

## Quick Start

```bash
# 1. Install
npm install

# 2. Copy env
cp .env.example .env
# → fill DATABASE_URL, JWT_SECRET, Google Wallet credentials, WEBHOOK_SECRET

# 3. Database
npx prisma migrate dev --name init
npx prisma db seed          # or: npm run prisma:seed

# 4. Run
npm run start:dev
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs

## User Flow

1. NFC card → `https://yourdomain.com/join/bigdwich/points`
2. Landing returns company + program branding (public)
3. User authenticates (`POST /auth/register` or `/auth/login`)
4. `POST /join/bigdwich/points/complete` (Bearer token)
5. Response contains `saveUrl` → redirect user to Google Wallet

## Seeded Data (BigDwich)

- Company slug: `bigdwich`
- Programs:
  - `points` (POINTS system)
  - `stamps` (STAMPS card – 10 stamps = free sandwich)

Join links after seed:
- http://localhost:3000/join/bigdwich/points
- http://localhost:3000/join/bigdwich/stamps

## Key Architecture

```ts
interface WalletProvider {
  createPass(membership): Promise<{ saveUrl: string; externalId: string }>
  updatePass(membership): Promise<void>
  // ...
}
```

- `GoogleWalletProvider` is the current implementation
- Later: add `AppleWalletProvider` implementing the same interface
- Inject via `WALLET_PROVIDER` token – no other code changes needed

## Updating points / stamps

**Webhook** (shared secret):
```http
POST /webhooks/loyalty/update
{
  "walletId": "LW-XXXX...",
  "amount": 5,
  "reason": "Purchase #1234",
  "secret": "your-webhook-secret"
}
```

**Admin** (JWT protected):
```http
POST /admin/loyalty/update
Authorization: Bearer <token>
{
  "membershipId": "...",
  "amount": -10,
  "reason": "Redeemed free sandwich"
}
```

Both automatically push the new balance to Google Wallet.

## Project Structure

```
src/
├── auth/           # JWT + Local strategies
├── companies/
├── programs/
├── users/
├── memberships/    # unique walletId generation + join
├── loyalty/        # history + balance updates
├── wallet/
│   └── providers/
│       ├── wallet-provider.interface.ts
│       └── google-wallet.provider.ts
├── join/           # public NFC entry point
├── webhooks/
├── admin/
└── prisma/
```

## Adding Apple Wallet later

1. Create `src/wallet/providers/apple-wallet.provider.ts` implementing `WalletProvider`
2. Register it in `WalletModule` (or make provider selection dynamic per company)
3. Done – the rest of the app (join, loyalty, webhooks) stays untouched.

## Security notes

- Global rate limiting (Throttler)
- Webhook protected by shared secret
- All balance changes go through LoyaltyHistory
- `companyId` denormalized on Membership, LoyaltyHistory, WalletPass for strong isolation
- ValidationPipe with whitelist everywhere
