# Carte Fidélite — Technical Reference

## Stack

| Layer | Tech |
|-------|------|
| API | NestJS 11 + Fastify |
| DB | Prisma 6 + PostgreSQL |
| Auth | JWT + Passport (local); bcrypt |
| PWA | Inline HTML/CSS/JS in `src/pwa.controller.ts` |
| Google Wallet | `google-auth-library`, JWT save URLs |
| Apple Wallet | `passkit-generator`, `.apple-pass-model.pass/` |
| QR (staff) | html5-qrcode (CDN) |

## Directory Map

```
src/
├── main.ts                 # Bootstrap, Swagger /api/docs
├── app.module.ts
├── app.controller.ts       # /manifest.json, /sw.js
├── pwa.controller.ts       # ALL /app/* UI
├── auth/                   # register (CLIENT only), login, JWT
├── join/                   # Public join landing + complete
├── memberships/            # GET mine, google-save-url
├── staff/                  # session, stats, lookup, loyalty/update
├── admin/                  # dashboard, programs, staff assign, users
├── companies/              # CRUD + stats (admin/staff)
├── wallet/                 # Google + Apple providers, download
├── loyalty/                # updateBalance (service; controller stub)
├── programs/               # service only; controller stub
└── webhooks/               # POS webhook with WEBHOOK_SECRET

prisma/
├── schema.prisma
├── seed.ts                 # bigdwich + points/stamps programs
└── migrations/
```

## Roles & Tenancy

```prisma
enum UserRole { CLIENT STAFF ADMIN }

model StaffAssignment {
  userId    String
  companyId String
  status    StaffStatus  // PENDING | ACTIVE | SUSPENDED
}
```

- **CLIENT:** own memberships only
- **STAFF:** must have `StaffAssignment.status = ACTIVE`; all ops scoped to `companyId`
- **ADMIN:** global; creates companies, programs, assigns staff

## API Routes

### Public
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/join/:company/:program` | Join landing HTML |
| GET | `/join/:company/:program/info` | Program JSON |
| POST | `/auth/register` | Creates CLIENT |
| POST | `/auth/login` | JWT |

### Client (JWT)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/memberships/mine` | Cards + `appleUrl`, `googleUrl` |
| POST | `/memberships/:id/google-save-url` | Regenerate Google save link |
| POST | `/join/.../complete` | Enroll + create wallet pass |

### Staff (JWT + STAFF|ADMIN + assignment)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/staff/session` | Assigned company info |
| GET | `/staff/stats` | Company stats |
| POST | `/staff/cards/lookup` | `{ qr }` — company from assignment |
| POST | `/staff/loyalty/update` | `{ membershipId, amount, reason }` |

### Admin (JWT + ADMIN)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/dashboard` | Platform stats |
| GET/POST | `/companies` | List/create |
| POST | `/admin/programs/create` | New program |
| POST | `/admin/staff/assign` | Promote user + assignment |
| GET | `/admin/users` | User list |

### Wallet
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/wallet/apple/:membershipId/download` | `.pkpass` file |

## PWA Routes

| Path | JS function | Role guard needed |
|------|-------------|-------------------|
| `/app/auth` | `showAuth()` | — |
| `/app/client` | `showClient()` | any authenticated |
| `/app/staff` | `showStaff()` | STAFF, ADMIN |
| `/app/admin` | `showAdmin()` | ADMIN only |

Post-login: `ADMIN→admin`, `STAFF→staff`, `CLIENT→client`.

## Wallet Env

```env
# Google
GOOGLE_WALLET_ISSUER_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_WALLET_CLASS_SUFFIX=loyalty

# Apple
APPLE_PASS_TYPE_IDENTIFIER=pass.com.yourbrand.loyalty
APPLE_TEAM_IDENTIFIER=
APPLE_SIGNER_CERT_PATH=certs/signerCert.pem
APPLE_SIGNER_KEY_PATH=certs/signerKey.pem
APPLE_WWDR_CERT_PATH=certs/wwdr.pem
```

Certs in `certs/` — **gitignore in production repos**.

## Join Flow (client acquisition)

```
QR/NFC → GET /join/:company/:program
  → register/login (POST /auth/*)
  → POST /join/.../complete (JWT)
  → membershipsService.joinProgram
  → walletService.createPassForMembership (Google saveUrl)
  → Response: { membership, saveUrl, appleUrl }
  → User taps Google / Apple buttons
```

## Staff Flow (caisse)

```
Staff opens /app/staff
  → GET /staff/session (company name locked)
  → Scan loyalty:{walletId} or type LW-...
  → POST /staff/cards/lookup
  → +1 / +5 / -1 → POST /staff/loyalty/update
  → loyaltyService.updateBalance → syncPass (Google)
```

## Seed Demo

```bash
npx prisma migrate deploy
npx prisma db seed
```

- Company slug: `bigdwich`
- Programs: `points`, `stamps`
- Join URL: `http://localhost:3000/join/bigdwich/points`

## Creating a New Company (admin/dev)

1. `POST /companies` — name, slug, branding colors, logoUrl
2. `POST /admin/programs/create` — companyId, type POINTS|STAMPS, settings
3. Share join link: `/join/{slug}/{programSlug}`
4. `POST /admin/staff/assign` — email of staff user, companyId

## UX Design Tokens (PWA)

```css
--bg:#f5f5f7; --surface:#fff; --text:#1d1d1f; --text2:#6e6e73;
--blue:#0071e3; --radius-lg:18px;
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', ...;
```

Apply same tokens to `join.controller.ts` embedded CSS for consistency.
