# نشر Hami على Vercel

## ⚠️ مهم جداً — لا تستخدم «Upload files» على GitHub

رفع ملفات يدوياً من واجهة GitHub **يستبدل المستودع بملفات جزئية** ويحذف مجلد `src/` — عندها يفشل البناء على Vercel.

**الطريقة الصحيحة:** `git push` من جهازك، أو اترك Cursor/Agent يرفع التغييرات.

## 1. إعداد المشروع على Vercel

| الإعداد | القيمة |
|---------|--------|
| Framework Preset | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install --legacy-peer-deps` |
| Node.js Version | **20.x** |

ملف `vercel.json` في الجذر يضبط هذه القيم تلقائياً.

## 2. متغيرات البيئة (Environment Variables)

انسخ من `.env.production.example` إلى Vercel → Settings → Environment Variables.

### للواجهة (Vite — آمنة للحزمة)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SENTRY_DSN` (اختياري)

### للخادم (BFF — لا تستخدم بادئة `VITE_`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_UPLOAD_BUCKET`
- `WIFE_REDIS_REST_URL`
- `WIFE_REDIS_REST_TOKEN`
- `WIFE_DISABLE_EDGE_KV_PROXY=true`
- `WIFE_DISABLE_EDGE_COMMS_DISPATCHER=true`
- `ADMIN_UUID`
- `ADMIN_ACCESS_KEY`
- `NODE_ENV=production`

## 3. ما يحدث عند البناء

1. `scripts/generate-vercel-api.mjs` — يربط `/api/*` بمسارات `src/app/api/**/route.ts`
2. `vite build` — يبني الواجهة إلى `dist/`
3. Vercel ينشر `dist/` كـ static + `api/[...slug].ts` كـ serverless

## 4. تحقق بعد النشر

```bash
npm run gate:wife-production -- --live
```

- افتح الموقع → تسجيل الدخول → لوحة المحامي
- جرّب المنتدى أو رفع ملف (يتطلب Redis + Supabase)

## 5. أخطاء شائعة

| الخطأ | الحل |
|-------|------|
| `npm install` peer deps | `.npmrc` يفعّل `legacy-peer-deps` |
| صفحة بيضاء / 404 على `/` | تأكد `outputDirectory` = `dist` |
| `/api/*` 404 | تأكد أن `npm run build` ينجح ويولّد `api/_routeManifest.ts` |
| 401 على CSRF/API | أضف متغيرات Supabase + Redis في Vercel |
| Build timeout | الخطة المجانية — قد تحتاج تقسيم chunks لاحقاً |

## 6. Supabase

طبّق migrations من `supabase/migrations/` على مشروع Supabase قبل الإنتاج.
