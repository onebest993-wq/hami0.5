# PHASE — WIFE Prod Live Step (أخطر خطوة ops)

**التاريخ:** 2026-08-21  
**الأمر:** `npm run gate:wife-prod-live`

---

## ما نُفّذ (فعلي — ليس نظري)

| خطوة | النتيجة |
|------|---------|
| `bootstrap-wife-prod-env.mjs` | `.env.production.local` — BFF_AUTH=true، Edge disable، ADMIN_ACCESS_KEY |
| إصلاح `load-env-and-gate.mjs` | كان **لا يحمّل** `.env.production.local` — **bug حقيقي** أُصلِح |
| `gate --prod --live` | **36 code checks ✓** — **2 blockers فقط: Redis** |
| **live:edge-kv-disabled** | **401** — anonymous مرفوض (ليس 410؛ Edge secrets على Supabase Dashboard) |
| **live:redis** | skip — لا Upstash محلياً |

---

## Blockers المتبقية (واحدة فقط تقنياً)

```
env:WIFE_REDIS_REST_URL
env:WIFE_REDIS_REST_TOKEN
```

**الحل:** Upstash → انسخ REST URL + Token إلى `.env.production.local` ثم:

```bash
npm run gate:wife-prod-live
npm run gate:wife-prod-readiness   # Deploy ready: YES
```

---

## ما لم نفعله (عمداً — خطير)

- ❌ wipe/delete فعلي على DB
- ❌ Redis وهمي — لا يُقبل في prod

---

## أوامر

```bash
npm run bootstrap:wife-prod-env
npm run gate:wife-prod-live
npm run gate:wife-prod-readiness
```

---

## Supabase Edge (تحسين اختياري)

على Supabase Dashboard → Edge Functions → Secrets:

```
WIFE_DISABLE_EDGE_KV_PROXY=true
WIFE_DISABLE_EDGE_COMMS_DISPATCHER=true
```

ثم redeploy `server` function — live probe يصبح **410** بدل 401.

---

## تحديث 2026-08-21 (تابع)

| الإجراء | النتيجة |
|---------|---------|
| `test:security:professional-audit` | **8/8** required ✓ |
| `deploy:wife-edge` | **v220+** — `verify_jwt=false` + fail-closed 410 في الكود |
| `doctor:wife-redis` | يوجّه لـ Upstash — **المفاتيح غير مضافة بعد** |
| Blocker الوحيد | `WIFE_REDIS_*` في `.env.production.local` |

```bash
npm run doctor:wife-redis:template   # أسطر فارغة للصق
npm run gate:wife-prod-live            # بعد إضافة Redis
npm run deploy:wife-edge               # بعد تغيير Edge secrets
```
