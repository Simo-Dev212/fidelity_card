# Problematics Master Checklist

Update **Status** and **Evidence** after each audit pass.  
**Required fix** is the minimum work to reach **Fixed**.

---

## Security & Cloisonnement

| # | Problematic | Status | How / proof | Required fix |
|---|-------------|--------|-------------|--------------|
| 1 | **CLIENT can open staff scan** | Partial | API: `RolesGuard` + `@RequireRoles('STAFF','ADMIN')` on `/staff/*`. Public register forces `role: CLIENT`. **PWA tabbar still shows Scan to everyone**; `showStaff()` has no role redirect. | `tabbar()`: add Scan only if `role==='STAFF'\|\|role==='ADMIN'`. `showStaff()`: if CLIENT → `go('client')`. |
| 2 | **No company space with dedicated credentials** | Fixed | `StaffAssignment` + `UserRole.STAFF`. Admin assigns via `POST /admin/staff/assign`. Staff session from assignment only. | — |
| 3 | **Staff APIs accepted client-supplied companyId/slug** | Fixed | `assignedCompanyId()` ignores body; 403 if card's company ≠ assignment. | — |
| 4 | **Membership lookup by walletId without auth** | Open | `GET /memberships/wallet/:walletId` may leak data — verify guard. | Add JWT + owner/staff check or remove public endpoint. |

---

## Four Spaces Completeness

| # | Problematic | Status | How / proof | Required fix |
|---|-------------|--------|-------------|--------------|
| 5 | **No client space: login → wallet → points only** | Partial | Join at `/join/:company/:program` + `/app/client` + `GET /memberships/mine`. Client PWA shows Apple button only; **no Google Wallet button**. No in-app join flow. | Add Google save button via `c.googleUrl` or `POST /memberships/:id/google-save-url`. Optional: deep-link hint when empty state. |
| 6 | **No staff space: scan + credit + stats, company locked** | Partial | APIs: `GET /staff/session`, `GET /staff/stats`, lookup, update. PWA asks for **company slug** (ignored by API). **No stats view in staff PWA.** | Remove slug field; preload company from session. Add staff stats panel from `/staff/stats`. |
| 7 | **No platform admin** | Fixed | `ADMIN` role, `/admin/*`, create company/program, assign staff, dashboard. | — |
| 8 | **Join vs PWA dual auth tokens** | Open | Join page uses `localStorage.joinToken`; PWA uses `token`. User completing join may not see card in PWA until re-login. | After join success, also set `token`/`user` or redirect to `/app/client` with shared token. |

---

## Wallet Integration

| # | Problematic | Status | How / proof | Required fix |
|---|-------------|--------|-------------|--------------|
| 9 | **Wallet "saved" but no real Google/Apple APIs** | Fixed (backend) | Google = primary `WALLET_PROVIDER`. Apple = on-demand `.pkpass` at `/wallet/apple/:id/download`. | Verify env vars in demo environment. |
| 10 | **Apple pass not synced on balance change** | Open (by design) | Google syncs via `syncPass`; Apple needs re-download or PassKit push service. | UI copy: "Download again to refresh" after staff credit; optional Apple push later. |
| 11 | **Apple unsigned in dev** | Partial | Works unsigned locally; real devices need certs in `.env` / `certs/`. | Document demo device setup; never commit `.p12`. |
| 12 | **Company branding on passes** | Partial | Providers read company/program colors. Per-company Apple/Google **class** design may need admin-configured assets. | Verify `logoUrl`, colors flow into both providers for demo company. |

---

## QR & Scanning

| # | Problematic | Status | How / proof | Required fix |
|---|-------------|--------|-------------|--------------|
| 13 | **QR scanning** | Fixed | Payload `loyalty:{walletId}`; camera + manual on staff; join QR separate. | — |
| 14 | **Staff rejects wrong QR type** | Open | Verify join URL scanned at caisse shows clear error. | Friendly error in lookup when payload is not `loyalty:*`. |

---

## PWA & UX

| # | Problematic | Status | How / proof | Required fix |
|---|-------------|--------|-------------|--------------|
| 15 | **PWA weaker than Swagger** | Mostly | `/app/*` exists (auth/client/staff/admin). Staff scan redirect from `/staff/scan`. | Close gaps in rows 1, 5, 6. |
| 16 | **Apple/xAI-style UX** | Partial | Apple-like tokens in PWA CSS. Join page still template-heavy. Not fully editorial. | Unify join + PWA design tokens; polish spacing, typography, empty states. |
| 17 | **Missing PWA icons** | Open | `manifest.json` references `/icon-192.png`, `/icon-512.png` — files absent. | Add icons or inline SVG placeholders. |
| 18 | **External QR API dependency** | Open | Client card QR uses `api.qrserver.com`. | Prefer local QR generation or inline canvas for offline demo. |

---

## Code Quality & Stubs

| # | Problematic | Status | How / proof | Required fix |
|---|-------------|--------|-------------|--------------|
| 19 | **StaffService unused** | Open | `staff.service.ts` + DTOs exist; controller uses inline logic. | Consolidate or delete dead code (low priority for POC). |
| 20 | **programs/loyalty controllers empty** | Open | Creation via `/admin/programs/create` only. | OK for POC; document in reference.md. |
| 21 | **OAuth not wired** | Open | `validateOAuthUser` in auth.service; no routes. | Optional for POC; email/password sufficient for demo. |

---

## POC Demo Blockers (must-fix for presentation)

Priority order:

1. **#1** — PWA role leak (Scan tab + staff route guard)
2. **#5** — Google Wallet button on client PWA
3. **#6** — Staff UI: session company + stats
4. **#16** — UX polish on join + client wallet view
5. **#17** — PWA install icons
6. **#8** — Token unification after join (smooth handoff to PWA)

---

## Status Legend

| Status | Meaning |
|--------|---------|
| **Fixed** | Verified in code + manual test |
| **Partial** | Backend OK or UI incomplete |
| **Open** | Not implemented or broken |
