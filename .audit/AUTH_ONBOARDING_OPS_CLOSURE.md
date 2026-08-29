# AUTH ONBOARDING — إغلاق تشغيلي نهائي (خطة التنفيذ)

**Date:** 2026-08-12

## ما أُنجز في المستودع

| أداة | الأمر |
|------|--------|
| بوابة إطلاق | `npm run gate:auth-onboarding` / `gate:auth-onboarding:tests` |
| هجمة Vitest | `npm run test:security:auth-assault` |
| هجمة staging حية | `AUTH_ASSAULT_BASE_URL=… npm run assault:auth-staging` |
| E2E متصفح | `npm run test:e2e:auth-assault` (يحتاج preview/BFF) |
| هجرة RLS | `npm run db:auth-ban-freeze` (ملف واحد عبر `db query` — **ليس** full `db push`) |
| ترحيل KV active | `npm run db:lawyer-verification-active` ثم `-- --apply` |

## ترتيب التشغيل على البيئة الحقيقية

1. `npm run gate:auth-onboarding:tests`
2. `npm run db:auth-ban-freeze` (يتطلب supabase link)
3. `npm run db:lawyer-verification-active` (dry-run) ثم `-- --apply`
4. `AUTH_ASSAULT_BASE_URL=https://<staging> npm run assault:auth-staging`
5. `npm run test:e2e:auth-assault` ضد نفس الـ preview

## صدق

- بدون خطوات 2–4 على مشروعكم السحابي، self-unban وقطع المنتدى عن القدامى يبقيان مخاطر تشغيل.
- الهجمة الحية ترفض استهداف hami.legal إنتاجاً إلا بـ `AUTH_ASSAULT_ALLOW_PROD=1`.
