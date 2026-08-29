# WIFE-006 / WIFE-007 Closure

**التاريخ:** 2026-08-21

---

## WIFE-006 — Redis production fail-closed

### ما أُثبت (unit)

`src/app/api/security/wifeProductionFailClosed.test.ts` (4 tests):

| السيناريو | النتيجة المتوقعة |
|-----------|------------------|
| Redis configured + error في production | `consumeRateLimitSlot` → **false** |
| Redis down + no Supabase في production | `issueCsrfTokenForSubject` → **null** |
| لا Redis env في production | rate limit → **false** |
| لا stores في production | CSRF → **null** |

**لا memory fallback** في `NODE_ENV=production` — fail-closed.

### ops checklist (يدوي قبل prod)

```bash
# env مطلوب في production (gate --prod)
WIFE_REDIS_REST_URL=
WIFE_REDIS_REST_TOKEN=

node scripts/load-env-and-gate.mjs --prod
# live:redis ping عند ضبط env
```

### الحد

لم يُختبر Upstash multi-instance live في هذه الجلسة — unit + gate فقط.

---

## WIFE-007 — UUID session surrogate (staging dev)

### الم surrogate

في **dev فقط** (ليس GoTrue حقيقي):

```
token: dev-access-token-11111111-2222-4333-8444-555555555555
subject: 11111111-2222-4333-8444-555555555555
```

- `wifeValidator.tokenCache.test.ts` — يقبل UUID dev في test؛ يرفض في production
- `e2e/wife-assault-uuid-session.spec.ts` (7 tests live)

### ما يختبره live

| مسار | UUID session | guest |
|------|--------------|-------|
| `/api/settings/cloud-sync` POST | ≠ 403 NON_UUID | 403 NON_UUID |
| `/api/timeline-events` POST | ≠ 403 NON_UUID | 403 |
| `/api/global-notes/list` GET | 200 + rows[] | empty/guest path |
| forged `user_key` in body | server uses auth subject | — |

### الحد

**GoTrue JWT حقيقي + RLS** — يحتاج credentials staging منفصلة؛ surrogate يغطي Postgres UUID gate + BFF authz.

---

## أوامر

```bash
npx vitest run src/app/api/security/wifeProductionFailClosed.test.ts
npm run test:e2e:wife:uuid-session
npm run test:security:campaign   # 8/8 stages
```
