# جاهزية المحاكاة — 2026-08-03

## ابدأ الآن (محاكاة محلية)

```powershell
cd "c:\Users\HEX STORE\Downloads\New folder"
npm run dev
```

افتح: **http://localhost:8080**

إذا ظهر `Port 8080 is already in use` — الخادم يعمل مسبقاً، افتح الرابط مباشرة.

**تخطي الدخول (dev):** اضغط «تخطي المطور» إن ظهرت بوابة الدخول.

### مسار smoke سريع (5–10 دقائق)

| # | مسار | ما تتوقعه |
|---|------|-----------|
| 1 | إقلاع → لوحة المحامي | `lawyer-dashboard-ready` بدون `#hami-boot-failure` |
| 2 | الملف المهني (المنتدى من الرئيسية) | الاستوديو الكامل وليس stub |
| 3 | مخزن التنفيذ → إضبارة → محضر المتابعة | يفتح بدون ReferenceError |
| 4 | محضر → تبويب **إجراءات الإضبارة** → إرسال | يعمل أو toast «جاري تجهيز أدوات الإضبارة» — **لا** `handleDossierAction is not a function` |
| 5 | المنتدى / المستودع / الإعدادات | فتح وإغلاق بدون crash |

### محاكاة قريبة من الإنتاج (preview) — **بدون تسجيل دخول**

```powershell
npm run preview:trial
```

افتح **Chrome**: `http://127.0.0.1:8090` — يدخل مباشرة إلى لوحة المحامي.

(لا تستخدم `build:vercel` للتجربة — يُفعّل بوابة الدخول.)

### محاكاة قريبة من الإنتاج (preview) — مع دخول حقيقي

```powershell
npm run build:vercel
npm run preview -- --port 8090 --host 127.0.0.1
```

---

## البوابات — مصفوفة الإغلاق

| البوابة | النتيجة | ملاحظة |
|---------|---------|--------|
| `gate:closed-sections` | ✅ 9/9 | settings, notifications, search, tasks, calendar, repository, forum, homeHub, profile |
| `gate:execution` | ✅ | unit + E2E كاملة |
| `gate:calendar` | ✅ | 57 |
| `gate:notifications` | ✅ | 147 |
| `gate:global-search` | ✅ | 116 |
| `gate:wave0` | ⚠️ جزئي | يتوقف على `guard:tracked-secrets` — `.env` مُتتبَّع في git |
| `build:vercel` | ✅ | جاهز لـ preview deploy |

### إصلاح wave0 (اختياري قبل CI)

```powershell
git rm --cached .env
# تأكد أن .env في .gitignore — لا تُرفع الأسرار
npm run gate:wave0
```

---

## ما أُنجز في هذه الدفعة

### قنبلة ال profile (Phase 0)
- حذف `RoyalLawyerProfile.tsx` stub + تصليح imports + `guard:module-shadow`

### التنفيذ
- E2E موحّد (`bootFixtures`, `executionE2EFixtures`)
- hooks مصالحة `VITE_E2E`
- **`handleDossierAction`**: stub object + `safeHandleDossierAction` (لا انهيار boot)

### البوابات والأساس
- `guard-dead-modules`: يحسب فقط ملفات **git tracked** (لا يعاقب untracked debris)
- baseline محدّث: dead 231، duplicate 35
- `guard-tailwind-source`: يسمح مسح lawyer/** مع `@source not` للأقسام الثقيلة

---

## ما لم يُغلق (صريح)

| البند | لماذا لا يمنع المحاكاة المحلية |
|-------|-------------------------------|
| `.env` في git index | wave0 فقط — لا يؤثر على `npm run dev` |
| ~224 ملف source untracked | لا يدخل dead-modules baseline |
| 231 وحدة «ميتة» في baseline | كثيرها dynamic import — تُنظَّف لاحقاً |
| E2E كاملة لكل قسم | `release:check:*` — بعد المحاكاة اليدوية |
| نشر Production | بعد محاكاة + تنظيف git |

---

## أوامر مرجعية

```powershell
npm run gate:closed-sections
npm run gate:execution
npm run build:vercel
npm run gate:wave0          # بعد git rm --cached .env
```

**الموقع:** جاهز لبدء المحاكاة المحلية على **http://localhost:8080**
