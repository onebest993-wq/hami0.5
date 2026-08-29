# WIFE-005 Closure — syncService → BFF

**التاريخ:** 2026-08-21  
**Finding:** `src/lib/syncService.js` كان يستدعي `supabase.from('lawyer_settings')` مباشرة من العميل.

## الإصلاح

| قبل | بعد |
|-----|-----|
| `supabase.from(...).upsert/select` | `SecureAPIClient` → `/api/settings/cloud-sync` |
| `user_key` من الجلسة على العميل فقط | `user_key` = `userId` من `requireWifeUser` على الخادم |
| gate WARN | gate ✓ `client:no-direct-supabase-from` |

## المسار الجديد

- **GET** — قراءة `app_data` للمستخدم المصادق؛ non-UUID → `{ app_data: null }` بدون Postgres
- **POST** — `{ app_data }` فقط؛ يتجاهل `user_key` في body
- **PATCH** — `{ action: 'migrateLegacy' }` — ترحيل `dev_user` server-side

## الملفات

- `src/app/api/settings/cloud-sync/route.ts`
- `src/app/api/settings/cloud-sync/route.test.ts` (5)
- `src/lib/syncService.js` (BFF only)
- `src/lib/__tests__/syncService.test.ts` (3)
- `e2e/wife-assault-professional.spec.ts` (+2 cloud-sync)
- `e2e/wife-assault-maximum.spec.ts` (+3 unsigned)

## التحقق

```bash
node scripts/load-env-and-gate.mjs   # 0 blockers، syncService WARN gone
npm run test:security:campaign       # 7/7
```

## متبقٍ (WIFE-006/007)

- Redis في الإنتاج
- اختبار staging بجلسة lawyer UUID حقيقية
