# دليلك — انتهاء دورك (مبتدئ)

**متى تنتهي؟** عندما يفتح رابط Vercel ويظهر تسجيل الدخول ويدخل حسابك.

---

## قبل البدء — افتح هذه الأشياء

| # | ماذا | أين |
|---|------|-----|
| 1 | ملف الإعدادات المحلي | Cursor → `.env.production.local` |
| 2 | ملف إضافي | Cursor → `.env` (لبعض `VITE_*`) |
| 3 | Supabase | https://supabase.com/dashboard |
| 4 | Vercel | https://vercel.com |
| 5 | Upstash | https://console.upstash.com (اختياري — أمان) |

**قاعدة:** كل «قيمة» = النص **بعد** علامة `=` في الملف. لا تنسخ `#` ولا التعليقات.

---

## الجزء أ — Supabase (10 دقائق)

### 1) ادخل لمشروعك
1. supabase.com → **Sign in**
2. اضغط مشروع **wldjvjnodvyodmgbgzab** (أو الاسم الذي تراه)

### 2) أضف 3 أسرار للـ Edge
1. من القائمة اليسرى: **Edge Functions**
2. ابحث عن **Secrets** أو **Manage secrets**
3. أضف سراً واحداً في كل مرة (Add new secret):

| اسم السر (Name) | القيمة (Value) — من أين |
|-----------------|-------------------------|
| `WIFE_DISABLE_EDGE_KV_PROXY` | اكتب حرفياً: `true` |
| `WIFE_DISABLE_EDGE_COMMS_DISPATCHER` | اكتب حرفياً: `true` |
| `ADMIN_ACCESS_KEY` | انسخ من `.env.production.local` سطر `ADMIN_ACCESS_KEY=` |

4. **Save** بعد كل سر

✅ **انتهى الجزء أ** عندما ترى الثلاثة في القائمة.

---

## الجزء ب — Vercel (30–45 دقيقة)

### 1) هل عندك مشروع Hami على Vercel؟

**إن نعم:** افتح المشروع → **Settings** → **Environment Variables**

**إن لا:**
1. vercel.com → **Add New** → **Project**
2. اربط GitHub واختر repo المشروع
3. **Deploy** (مرة أولى — قد تفشل بدون env، طبيعي)
4. ثم **Settings** → **Environment Variables**

### 2) أضف متغيرات البيئة

لكل سطر:
1. **Add New**
2. **Key** = الاسم قبل `=`
3. **Value** = النص بعد `=`
4. **Environment** = ✅ Production (و Preview إن أردت)
5. **Save**

#### من `.env.production.local` (انسخ كل سطر):

```
VITE_SHELL_AUTH_OPEN
VITE_BFF_AUTH
WIFE_DISABLE_EDGE_KV_PROXY
WIFE_DISABLE_EDGE_COMMS_DISPATCHER
ADMIN_ACCESS_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_UUID
WIFE_REDIS_REST_URL
WIFE_REDIS_REST_TOKEN
```

#### من `.env` (إن لم تكن في production.local):

```
VITE_SUPABASE_URL          ← نفس رابط supabase
VITE_SUPABASE_ANON_KEY     ← المفتاح sb_publishable_...
VITE_ENABLE_CLOUD_SYNC     ← true
VITE_APP_SUPPORT_EMAIL
VITE_ADMIN_MASTER_EMAIL
ADMIN_MASTER_EMAIL
```

#### أضف يدوياً (مهم للنشر):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `SITE_URL` | رابط موقعك بعد النشر، مثل `https://hami-xxx.vercel.app` |
| `PASSWORD_RESET_ALLOWED_ORIGINS` | نفس رابط SITE_URL |

*(SITE_URL يمكن تحديثه بعد أول deploy إن لم تعرف الرابط بعد)*

### 3) أعد النشر (Redeploy)

1. **Deployments**
2. آخر deployment → ⋮ (ثلاث نقاط) → **Redeploy**
3. انتظر حتى **Ready** (أخضر)

✅ **انتهى الجزء ب**

---

## الجزء ج — اختبار (5 دقائق)

1. من Vercel → **Visit** (أو Domains)
2. يجب أن ترى **شاشة دخول** — وليس التطبيق مباشرة بدون login
3. سجّل دخول بحسابك
4. افتح أي قسم — لا أخطاء حمراء كثيرة

✅ **إذا نجح → دورك انتهى رسمياً للنشر.**

---

## الجزء د — أمان (اختياري لكن مُستحسن)

لأنك لصقت Redis token في الشات:

1. Upstash → قاعدة **infinite-catfish-43755**
2. **Reset Token**
3. حدّث `.env.production.local` + Vercel `WIFE_REDIS_REST_TOKEN`
4. Redeploy على Vercel

---

## ماذا **لا** تفعل

- لا تعدّل كود WIFE
- لا تشغّل red-team
- لا تلصق أسرار في WhatsApp/Chat

---

## إن علقت

قل: **«علقت في الخطوة X»** + لقطة شاشة — نكمل من هناك.
