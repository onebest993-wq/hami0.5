# دورك الآن — WIFE Prod (خطوة واحدة)

**التاريخ:** 2026-08-21  
**حالة الكود:** مغلق — audit 8/8، campaign 14/14، Edge live **410** ✓  
**ما يمنع `Deploy ready: YES`:** مفتاحان فقط في `.env.production.local`

---

## الخطوة الوحيدة المتبقية

### Upstash Redis (5 دقائق)

1. افتح https://console.upstash.com → **Create Database** → Redis  
2. تبويب **REST API** → انسخ:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. الصق في `.env.production.local` (الأسطر موجودة):

```
WIFE_REDIS_REST_URL=https://....upstash.io
WIFE_REDIS_REST_TOKEN=...
```

4. تحقق:

```powershell
npm run doctor:wife-redis
npm run gate:wife-prod-live
npm run gate:wife-prod-readiness
```

**المتوقع:**
- `doctor:wife-redis` → ✓ Upstash Redis يعمل  
- `gate:wife-prod-live` → **0 blockers**  
- `Deploy ready: YES`

---

## ما أُغلق من جهة الوكيل (لا تعِده)

- WIFE-001/002/009 + catalog + campaign + destructive guard  
- Edge `make-server-f09713ba` منشور — kv-proxy anonymous → **410**  
- `.env.production.local` — BFF_AUTH، Edge disable، ADMIN_ACCESS_KEY  

---

## اختياري (بعد Redis)

| الهدف | Env | أمر |
|--------|-----|-----|
| GoTrue JWT live | `WIFE_GOTRUE_STAGING_EMAIL/PASSWORD` | `npm run test:e2e:wife:gotrue-staging` |
| Edge secrets على Dashboard | `WIFE_DISABLE_EDGE_*`, `ADMIN_ACCESS_KEY` | `npm run deploy:wife-edge` |

---

## صدق

بدون Upstash **لا يمكن** إغلاق prod claims — distributed nonce/CSRF/rate-limit تتطلب Redis حقيقي.
