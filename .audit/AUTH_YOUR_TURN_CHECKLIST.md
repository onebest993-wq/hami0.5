# دورك الآن — Auth Onboarding (بعد إكمال الوكيل)

**تاريخ:** 2026-08-12  
**حالة المستودع + DB المرتبطة:** جاهزة من جهة الوكيل. ما يلي يدوي عندك فقط.

## ما أُغلق من جهة الوكيل (لا تعِده)

- كود التسجيل/KYC/المنتدى/الحظر/redirect
- هجرة `profiles` + تجميد الحظر على الريموت
- ترحيل 4 سجلات `lawyer-verification` → `active`
- منح صلاحيات `service_role` على `profiles` + KV
- فحص JS: `sb_secret` يقرأ `profiles` بعد المنح (`ok=true count=4`)
- بوابة `gate:auth-onboarding:tests` + هجمة محلية `:8080` (5/5 سابقاً)

## دورك فقط (بالترتيب)

### 1) تدوير المفتاح السري (إلزامي)
المفتاح لُصق في الشات. في Supabase → API:
1. أنشئ `sb_secret` / service_role جديداً
2. عطّل/احذف القديم
3. ضع الجديد في `.env.local` فقط:
   `SUPABASE_SERVICE_ROLE_KEY=...`
4. لا تلصقه في الشات

تحقق سريع بعد التدوير:
```powershell
npm run probe:service-role-js
```
المتوقع: `PROBE_JS_PROFILES kind=sb_secret ok=true`

### 2) إعدادات GoTrue في لوحة Supabase (تحقق يدوي)
- Site URL / Redirect URLs تتضمن نطاق التطبيق + `iq.hami.legal://` إن لزم
- تأكيد البريد: إن مفعّل، جرّب تسجيل محامٍ جديد حتى تصل الرسالة
- لا تضف `*` في Redirect URLs

### 3) تجربة مستخدم واحدة حقيقية
1. حساب جديد → يجب أن يكون `pending`
2. المنتدى مغلق حتى الاعتماد
3. من لوحة الإدارة: اعتماد → `active` → المنتدى يفتح

### 4) بناء إنتاج / APK
تأكد قبل البناء:
- `VITE_SHELL_AUTH_OPEN=false`
- لا تضع `sb_publishable` في `SUPABASE_SERVICE_ROLE_KEY`
- أسرار السيرفر على الاستضافة (Vercel/…)، ليست في المستودع

### 5) اختياري — هجمة ضد staging منشور
```powershell
$env:AUTH_ASSAULT_BASE_URL="https://your-staging"
npm run assault:auth-staging
```

## أوامر تحقق سريعة (أي وقت)

```powershell
npm run db:auth-ban-freeze:verify
npm run probe:service-role-js
npm run gate:auth-onboarding:tests
$env:AUTH_ASSAULT_BASE_URL="http://127.0.0.1:8080"; npm run assault:auth-staging
```
