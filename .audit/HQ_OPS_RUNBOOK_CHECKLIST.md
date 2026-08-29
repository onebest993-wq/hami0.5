# قائمة تشغيل المقر (HQ) — تشغيلية فقط، بلا تعديل كود

**تاريخ:** 2026-08-29  
**الغرض:** ترتيب عملي لنشر مقر القيادة ومزامنته مع تطبيق المحامي.  
**ليس ضمن هذا الملف:** شاشة إعادة رفع الهوية بعد الرفض، E2E باب سري+OTP حقيقي كامل، Capacitor للمقر (مقصود ألا يُنشر على المتاجر).

**بوابة المستودع (تنظيم):** `npm run gate:hq` — عقود ثابتة. مع اختبارات: `gate:hq:tests`. loopback: `gate:hq:live`. تحقق env إنتاج محلي: `gate:hq:prod` (يحتاج أسرار محمّلة).

**مصادر الحقيقة في المستودع:**
- `.env.production.example` — قيم الإنتاج + تعليقات المقر
- `vercel-hq.json` — بناء/مخرجات مشروع المقر
- `supabase/migrations/` + `supabase/migrations/ops/`
- `.audit/AUTH_YOUR_TURN_CHECKLIST.md` — تحقق auth بعد الإعداد

---

## 0) قواعد فصل المشاريع (قبل أي لصق env)

| مشروع Vercel | ماذا يُنشر | ماذا يُضبط |
|--------------|------------|------------|
| **المحامي** (عام) | `vercel.json` / بناء المحامي | **لا** تضع `HAMI_HQ_ALLOW_THIS_DEPLOYMENT` ولا `HAMI_HQ_HOSTS` — مع `VERCEL_ENV` تُرفض `/api/admin` بـ 404 |
| **المقر** (منفصل) | `vercel-hq.json` → `build:hq:vercel` → `dist-hq` | `HAMI_HQ_ALLOW_THIS_DEPLOYMENT=true` + `HAMI_HQ_HOSTS=…` إلزامي بعد ربط النطاق |

- فعّل حماية النشر على مشروع المقر (كلمة سر / SSO).
- نفس مشروع **Supabase** ونفس **Upstash Redis** للمحامي والمقر.
- لا تلصق `SUPABASE_SERVICE_ROLE_KEY` / pepper / SMTP في الشات أو في المستودع.

---

## 1) تثبيت نطاق المقر + env على Vercel

### ملفات مرجعية
- `vercel-hq.json` — Build = `npm run build:hq:vercel` ، Output = `dist-hq`
- `.env.production.example` أسطر «مقر القيادة»

### أوامر نشر (محلي → مقر)
```powershell
npx vercel deploy --local-config vercel-hq.json --prod
```
أو اربط المشروع في لوحة Vercel بـ Root + نفس أوامر البناء من `vercel-hq.json`.

### متغيّرات مشروع المقر فقط (Production + Preview حسب الحاجة)

| مفتاح | أين | ملاحظة |
|--------|-----|--------|
| `HAMI_HQ_ALLOW_THIS_DEPLOYMENT` | مقر | `true` |
| `HAMI_HQ_HOSTS` | مقر | مضيف المقر بعد الربط (مثال: `hami-hq.vercel.app` أو النطاق المخصص) — قائمة مفصولة بفواصل إن لزم |
| `VITE_SHELL_AUTH_OPEN` | مقر + محامي | `false` |
| `VITE_BFF_AUTH` | مقر + محامي | `true` على Vercel |
| `VITE_SUPABASE_URL` | كلاهما | نفس المشروع |
| `VITE_SUPABASE_ANON_KEY` | كلاهما | publishable/anon فقط |
| `SUPABASE_URL` | كلاهما (سيرفر) | نفس URL |
| `SUPABASE_ANON_KEY` | كلاهما | نفس anon |
| `SUPABASE_SERVICE_ROLE_KEY` | كلاهما | JWT `eyJ…` أو `sb_secret_…` — ليس `sb_publishable_` |
| `SUPABASE_UPLOAD_BUCKET` | كلاهما | معرّف الـ bucket |
| `WIFE_REDIS_REST_URL` | كلاهما | نفس Upstash |
| `WIFE_REDIS_REST_TOKEN` | كلاهما | نفس التوكن |
| `WIFE_DISABLE_EDGE_KV_PROXY` | كلاهما | `true` |
| `ADMIN_UUID` | مقر (+ محامي إن لزم للمنصة) | UUID حساب الإدارة في Supabase |
| `ADMIN_ACCESS_KEY` | مقر | سر عشوائي طويل (64+) |
| `VITE_ADMIN_MASTER_EMAIL` / `ADMIN_MASTER_EMAIL` | مقر (+ واجهة) | بريد استلام OTP المقر |
| `ADMIN_OTP_PEPPER` | مقر (+ محامي إن OTP مشترك) | **إلزامي إنتاج ≥16 حرف** |
| `AUTH_OTP_PEPPER` | محامي (مفضّل) | ≥16؛ إن غاب يُستخدم `ADMIN_OTP_PEPPER` |
| بريد OTP | مقر | واحد على الأقل: Resend **أو** Proton SMTP **أو** `EMAIL_WEBHOOK_*` — انظر §3 |
| `HAMI_DOSSIER_PAYLOAD_MAC_SECRET` | محامي (وأي BFF مشترك) | إن كان مسار الإضابير مفعّلاً |
| `SHELL_NOTIFICATIONS_*` | محامي | حسب `.env.production.example` |

بعد أي تغيير env: **Redeploy** مشروع المقر (ومشروع المحامي إن تغيّر شيء مشترك).

### فحص سريع بعد النشر
- افتح مضيف المقر → صفحة الدخول/الباب السري تظهر (بدون أدوات محامٍ).
- من نطاق المحامي: طلبات `/api/admin` يجب ألا تُخدم كـ HQ عام (404 عند فصل المشاريع الصحيح).

---

## 2) ربط نفس مشروع Supabase / Redis

### لوحة Supabase
1. API: انسخ URL + anon + service_role/`sb_secret` إلى **كلا** مشروعي Vercel (مفاتيح السيرفر بدون `VITE_`).
2. Auth → URL Configuration: Site URL + Redirect URLs لتطبيق المحامي (+ مخطط أصلي إن وُجد `iq.hami.legal://`). لا تضع `*`.
3. Storage: تأكد أن `SUPABASE_UPLOAD_BUCKET` موجود وصلاحيات الرفع عبر BFF كما في الهجرات.

### Upstash
- أنشئ/استخدم قاعدة واحدة → الصق `WIFE_REDIS_REST_URL` + `WIFE_REDIS_REST_TOKEN` في المحامي والمقر.

### تحقق محلي (بعد تعبئة `.env.local` — لا تلصق الأسرار هنا)
```powershell
npm run probe:service-role-js
```
المتوقع تقريباً: `PROBE_JS_PROFILES … ok=true` (انظر `.audit/AUTH_YOUR_TURN_CHECKLIST.md`).

---

## 3) تفعيل البريد + pepper

### Pepper (fail-closed للمقر بدونها في الإنتاج)
```
ADMIN_OTP_PEPPER=<عشوائي ≥16>
AUTH_OTP_PEPPER=<عشوائي ≥16>   # مفضّل لمسار محامي منفصل
```
مرجع القراءة: `src/app/api/security/adminMailerEnv.ts`، تخزين OTP: `src/app/api/auth/otp/authOtpStore.ts`.

### قناة بريد المقر (اختر واحدة)

| الطريقة | مفاتيح |
|---------|--------|
| Resend | `RESEND_API_KEY` + `EMAIL_FROM` (+ `EMAIL_HQ_DELIVER_TO` أو `ADMIN_MASTER_EMAIL`) |
| Proton SMTP | `EMAIL_SMTP_HOST` / `PORT` / `USER` / `PASS` + `EMAIL_FROM` |
| Webhook HTTPS | `EMAIL_WEBHOOK_URL` + `EMAIL_WEBHOOK_TOKEN` |

اختبارات وحدة موجودة: `npm run test:security:hq-assault` (لا تغني عن إرسال حقيقي مرة واحدة).

### تجربة يدوية ضيقة
1. من المقر: طلب OTP للباب السري.
2. وصول الرسالة لـ `ADMIN_MASTER_EMAIL` / وجهة HQ.
3. إدخال الرمز → جلسة موثوقة (بدون أتمتة E2E كاملة الآن).

---

## 4) تشغيل الهجرات

### كامل (مفضّل إن كان المشروع جديداً أو متزامناً)
```powershell
npx supabase db push
```
أو من لوحة SQL Editor: تطبيق ملفات `supabase/migrations/*.sql` بالترتيب الزمني إن فشل الدفع الجماعي.

### حزم حرجة للمقر + onboarding (إن ظهرت أخطاء «جدول غير موجود»)

| موضوع | ملف / أمر |
|--------|-----------|
| OTP تحديات | `20260829050000_auth_otp_challenges.sql` ثم `20260829140000_auth_otp_challenges_deny_client.sql` |
| أجهزة OTP موثوقة | `20260812000003_admin_otp_trusted_devices.sql` |
| RPCs مقر | `20260812000002_admin_headquarters_rpcs.sql` (+ لاحقات revoke إن لزم) |
| جلسات مقر | `20260828170000_hq_account_sessions.sql` |
| تدقيق مقر | `20260828140000_ensure_hq_audit_logs.sql` |
| دليل/مقياس | `20260829030000_hq_directory_scale.sql` ، `20260829020000_hq_connection_signals.sql` |
| تجميد حظر + meta توثيق | `20260812000001_freeze_profile_ban_flags_and_verification_meta.sql` |
| منتدى | `npm run db:forum-rls` أو الهجرات `20260820000000_*` / `20260820000001_*` |
| إشعارات الشل | `npm run db:shell-notifications` (+ 027/028 في المثال) |
| تحقق تجميد الحظر | `npm run db:auth-ban-freeze:verify` |

### Ops عند فشل push كامل
طبّق يدوياً من `supabase/migrations/ops/`:
- `20260812000000_bootstrap_profiles_for_ban_freeze.sql`
- `20260812000002_seed_lawyer_verification_active.sql` (بذرة/ترحيل — راجع قبل التشغيل على إنتاج حي)
- `20260812000003_grant_service_role_auth_tables.sql`

### فحص بعد الهجرات
```powershell
npm run db:auth-ban-freeze:verify
npm run probe:service-role-js
```
محامي منشور: `GET /api/notifications/health` → `ready:true` إن فعّلت مسار الإشعارات السحابي.

---

## 5) تجربة المسار الذهبي (يدوي)

ترتيب ثابت:

1. **تسجيل محامٍ جديد** على نطاق تطبيق المحامي → حالة متوقعة `pending` (KV +/أو app_metadata حسب المسار الحالي).
2. **المنتدى مغلق** للحساب حتى الاعتماد.
3. **المقر:** ظهور الطلب في طابور التوثيق / الدليل.
4. **اعتماد** من المقر → `active`.
5. **إعادة دخول المحامي** → المنتدى يفتح.
6. (اختياري) رفض هوية: راقب الرسالة الحالية؛ **شاشة إعادة رفع مخصّصة داخل التطبيق = مؤجّلة** وليست شرطاً لهذا التشغيل.

---

## 6) هجوم staging عند الجاهزية (بعد §§1–5)

محلي ضد منشور:
```powershell
$env:AUTH_ASSAULT_BASE_URL="https://YOUR_LAWYER_STAGING"
npm run assault:auth-staging
```

مقر (عند ضبط URL الهدف في سكربت/بيئة الهجوم — راجع `scripts/headquarters-live-assault.mjs`):
```powershell
npm run assault:hq-live
```

وحدة ثقيلة (لا تغني عن staging):
```powershell
npm run test:security:hq-assault
npm run test:security:auth-assault
```

---

## مؤجّل عمداً (ليس إلزامياً الآن)

| بند | لماذا مؤجّل |
|-----|-------------|
| شاشة إعادة رفع الهوية بعد الرفض | منتج داخل تطبيق المحامي؛ التشغيل أعلاه يعمل بدونها |
| ~~`gate:hq` موحّد~~ | **موجود:** `npm run gate:hq` / `:tests` / `:live` / `:prod` → `scripts/headquarters-production-gate.mjs` |
| E2E باب سري + OTP حقيقي كامل | يحتاج بريد/pepper staging ثابت + أسرار CI حذرة |
| Capacitor للمقر | مقصود ألا يُنشر على المتاجر |

---

## قائمة اختصار قبل إعلان «المقر حي»

- [ ] مشروع Vercel مقر منفصل + `vercel-hq.json` + حماية نشر  
- [ ] `HAMI_HQ_ALLOW_THIS_DEPLOYMENT` + `HAMI_HQ_HOSTS` على المقر فقط  
- [ ] نفس Supabase + نفس Redis على المحامي والمقر  
- [ ] `ADMIN_OTP_PEPPER` + قناة بريد OTP تعمل مرة يدوياً  
- [ ] هجرات حرجة (OTP، HQ sessions/audit، ban freeze، forum إن لزم)  
- [ ] مسار: تسجيل → طابور → اعتماد → منتدى  
- [ ] (عند الجاهزية) assault ضد staging  

**لا يُبنى `gate:hq` ولا تُعدَّل شاشات الهوية ضمن هذه القائمة** — طلب صريح لاحق يكفي.
