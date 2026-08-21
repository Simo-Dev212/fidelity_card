---
name: carte-fidelite-poc-audit
description: Full 0–100% audit and completion guide for the carte_fidelite loyalty-wallet POC (NestJS + Prisma + PWA). Lists all problematics, enforces four cloisoned spaces (Join, Client, Staff, Admin), Apple/xAI UX restyle, and real Apple/Google Wallet flows. Use when auditing this repo, fixing role leaks, completing the POC for company demos, or when the user mentions loyalty wallet, four spaces, staff scan, wallet pass, or POC readiness.
---

# Carte Fidélité — POC Audit & Completion

## Mission

Deliver a **proof-of-concept app ready to present to a restaurant/retail company** so they want to implement it. The app must have:

1. **Four cloisoned spaces** — no role bleed in UI or API
2. **Real wallet integration** — client card lives in Apple Wallet or Google Wallet
3. **Apple/xAI UX** — smooth, minimalist, professional; intentional and premium, not template-generic
4. **Restaurant-ready flows** — staff scans client card at caisse, credits points, views company stats

## The Four Spaces (specification)

| Space | Who | Entry | Can do | Cannot do |
|-------|-----|-------|--------|-----------|
| **Join** (public) | Anonymous → CLIENT | `/join/:company/:program` QR/NFC | Register/login, enroll, save to Apple/Google Wallet | Scan, admin, see other companies |
| **Client** | `UserRole.CLIENT` | `/app/client` after auth | View own memberships, re-download wallet passes | Scan, staff stats, admin |
| **Staff** | `UserRole.STAFF` + active `StaffAssignment` | `/app/staff` (account from dev/admin) | Scan QR, credit/debit points, view **assigned company** stats | Pick company, create companies, assign staff |
| **Admin** | `UserRole.ADMIN` | `/app/admin` | All companies, create company/program, assign staff, platform dashboard | N/A (platform operator = dev/you) |

**Account provisioning model:** Staff accounts are created by the dev (you) via admin assign — staff never self-register as STAFF. Public register always forces `CLIENT`.

## Audit Workflow (0 → 100%)

Copy this checklist and track progress:

```
POC Audit Progress:
- [ ] Phase 1: Read stack & schema (reference.md)
- [ ] Phase 2: Run problematics audit (problematics.md) — mark each Fixed/Partial/Open
- [ ] Phase 3: Verify API cloisonnement (RolesGuard on every sensitive route)
- [ ] Phase 4: Verify PWA cloisonnement (tabbar, route guards, role redirects)
- [ ] Phase 5: End-to-end wallet flows (Google + Apple)
- [ ] Phase 6: UX pass (Apple/xAI tokens, polish join + PWA)
- [ ] Phase 7: Demo script rehearsal
```

### Phase 1 — Stack inventory (read-only)

Read in order:
1. `prisma/schema.prisma` — roles, StaffAssignment, Membership, WalletPass
2. `src/app.module.ts` — module wiring
3. `src/auth/guards/roles.guard.ts` — `@RequireRoles` pattern
4. `src/pwa.controller.ts` — entire PWA (CSS + JS inline)
5. `src/join/join.controller.ts` — public join landing
6. `src/wallet/` — Google + Apple providers

Full file map: [reference.md](reference.md)

### Phase 2 — Problematics audit

Open [problematics.md](problematics.md). For each row:
1. Grep/read the cited files
2. Reproduce the issue (curl or browser)
3. Update status: **Fixed** | **Partial** | **Open**
4. If Open/Partial → implement fix per "Required fix" column

### Phase 3 — API cloisonnement checklist

| Route prefix | Required guard | Verify |
|--------------|----------------|--------|
| `/staff/*` | JWT + `@RequireRoles('STAFF','ADMIN')` + `StaffAssignment` ACTIVE | `staff.controller.ts` |
| `/admin/*` | JWT + `@RequireRoles('ADMIN')` | `admin.controller.ts` |
| `/companies` POST/PUT | ADMIN only | `companies.controller.ts` |
| `/companies/:id/stats` etc. | ADMIN or STAFF (scoped) | assignment check for STAFF |
| `/auth/register` | Always creates CLIENT | `auth.service.ts` |
| `/memberships/mine` | JWT, own data only | `memberships.controller.ts` |
| `/wallet/apple/:id/download` | Owner or staff of same company | `wallet.controller.ts` |

**Staff company lock:** `assignedCompanyId()` in `staff.controller.ts` must **never** trust `companyId` from request body.

### Phase 4 — PWA cloisonnement checklist

In `src/pwa.controller.ts`:

1. **`tabbar()`** — Scan tab only for `STAFF` or `ADMIN`; Admin tab only for `ADMIN`
2. **`showStaff()`** — Redirect CLIENT to `/app/client` at top (mirror `showAdmin()`)
3. **`showClient()`** — No scan UI; show Google + Apple wallet buttons using `googleUrl` from `/memberships/mine`
4. **Post-login redirect** — ADMIN→admin, STAFF→staff, CLIENT→client (already correct)
5. **Staff UI** — Remove misleading "Company slug" field; show assigned company from `GET /staff/session`

### Phase 5 — Wallet E2E verification

**Google Wallet**
```bash
# After join complete, response must include saveUrl
curl -X POST /join/bigdwich/points/complete -H "Authorization: Bearer $TOKEN"
# saveUrl must open Google Wallet save flow
```

**Apple Wallet**
```bash
curl -o test.pkpass /wallet/apple/$MEMBERSHIP_ID/download -H "Authorization: Bearer $TOKEN"
# Must return application/vnd.apple.pkpass; opens on iOS Safari
```

**Balance sync:** After `POST /staff/loyalty/update`, Google pass must update via `walletService.syncPass`. Apple requires re-download (document in UI: "Pull down to refresh" or show updated download link).

**QR payload:** Always `loyalty:{walletId}` — staff scanner must reject join URLs (`/join/...`).

Env vars: see `.env.example` and [reference.md](reference.md#wallet-env).

### Phase 6 — UX restyle (Apple / xAI)

Design tokens already in PWA CSS (`--bg:#f5f5f7`, SF Pro stack, blur nav). Elevate to **premium editorial**:

| Principle | Implementation |
|-----------|------------------|
| Typography | `-apple-system`; titles `letter-spacing:-.02em`; hierarchy 28/22/17/13px |
| Surfaces | White cards on `#f5f5f7`; `--radius-lg:18px`; subtle `--shadow` |
| Motion | `fade` view transitions; `:active` scale on buttons |
| Density | Generous padding; no cramped forms |
| Color | Restrained — one accent (`--blue`); company branding only on wallet pass cards |
| Empty states | Icon + headline + one-line guidance |
| Join page | Match PWA tokens; remove generic gradient-heavy template look |

**Do not** add a separate frontend framework unless user asks — polish inline PWA in `pwa.controller.ts` and `join.controller.ts`.

### Phase 7 — Demo script (POC presentation)

Rehearse this 5-minute flow:

1. **Admin (you):** Login → Admin → show dashboard → open seeded company `bigdwich` → stats/memberships
2. **Create narrative:** "I onboard your brand here" → show company branding fields, program, join link `/join/bigdwich/points`
3. **Client:** Open join link on phone → register → "Add to Google Wallet" / "Add to Apple Wallet" → card in wallet
4. **Staff:** Login staff account (pre-assigned) → Scan tab → scan client QR → +1 point → show success
5. **Client:** Show updated balance in wallet (Google auto-sync; Apple re-download if needed)
6. **Close:** "Multi-tenant, one platform, your brand in their pocket"

Seed data: `npx prisma db seed` → company `bigdwich`, programs `points` + `stamps`.

## Key Files to Touch for Common Fixes

| Fix | File(s) |
|-----|---------|
| PWA tabbar role leak | `src/pwa.controller.ts` → `tabbar()`, `showStaff()` |
| Client missing Google button | `src/pwa.controller.ts` → `showClient()` use `c.googleUrl` |
| Staff company slug confusion | `src/pwa.controller.ts` → `showStaff()` use `/staff/session` |
| Role guards | `src/staff/staff.controller.ts`, `src/admin/admin.controller.ts` |
| Wallet save URL | `src/join/join.service.ts`, `src/memberships/memberships.controller.ts` |
| Apple pass branding | `src/wallet/providers/apple-wallet.provider.ts`, `.apple-pass-model.pass/pass.json` |
| Google pass branding | `src/wallet/providers/google-wallet.provider.ts` |
| PWA icons missing | Add `public/icon-192.png`, `public/icon-512.png` or serve from `app.controller.ts` |

## Constraints

- **Never commit** `.env`, `certs/*.p12`, or private keys — warn user if staged
- **Minimize scope** — fix problematics and UX gaps; no rewrite to React unless requested
- **Register always CLIENT** — staff promotion only via `POST /admin/staff/assign`
- **Three roles only** — CLIENT / STAFF / ADMIN (ADMIN = platform operator; no separate "company admin" role unless user requests)

## Output Format for Audit Reports

When reporting audit results to the user:

```markdown
# Carte Fidélité POC Audit — [date]

## Summary
[1–2 sentences: POC readiness % and blockers]

## Problematics ([n] total: [x] fixed, [y] partial, [z] open)

| # | Problematic | Status | Evidence |
|---|-------------|--------|----------|
| 1 | ... | Fixed/Partial/Open | file:line or curl output |

## Recommended next actions (priority order)
1. ...
2. ...

## Demo readiness
[Ready / Not ready — what's missing]
```

## Additional Resources

- [problematics.md](problematics.md) — master checklist of known issues
- [reference.md](reference.md) — routes, schema, env, architecture
