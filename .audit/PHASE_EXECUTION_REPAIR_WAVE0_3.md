# إصلاح قسم التنفيذ — الموجة 0–3 (منطق/أمان، بلا تغيير بصري)

تاريخ: 2026-08-21

## ما أُنجز

### أمان سحابة (O9)
- `timeline-events` POST: `onConflict` صار `user_id,execution_file_id,event_id`.
- GET/POST يستخدمان `requireExecutionFilesAuth` (رفض ضيف العرض في الإنتاج).
- هجرة: `supabase/migrations/20260821111344_timeline_events_unique_includes_user_id.sql`.
- طُبّقت على **hami 0.5** (`wldjvjnodvyodmgbgzab`) باسم `timeline_events_unique_includes_user_id` (نسخة `20260821113258`).
- التحقق الحي: `UNIQUE (user_id, execution_file_id, event_id)` + سياسات RLS الأربع.
- الاكتشاف: الجدول لم يكن موجوداً أصلاً رغم تسجيل 019 — أُنشئ بالقيد الصحيح. `iraqi_laws` ما زال غائباً.

### سحابة إضابير التنفيذ
- طُبّقت `execution_files_cloud_owner_unique` على hami 0.5.
- `UNIQUE (user_id, external_id)` يطابق upsert الـ BFF.
- RLS + سياسات المالك الأربع + trigger `updated_at`.

### تخزين محلي (O1 / O11 / O21 / O22)
- فهرس المالك `executionFiles:<uid>` حسّاس ومُشفَّر دون سقوط حجم.
- بلوبات `execution_*` فوق 512KB: تشفير أو فشل — لا plaintext.
- مسح الخروج يشمل `executionFiles` / `executionFiles:` / `hami:execution:` / متجر اللوحة.
- كتابة بلوب لمقبرة تُرفض؛ التسوية لا تُعيد إحياء صف فهرس محذوف.

### مال وتصنيف (O2 / O14 / O15 / O17 / O18 / O19 / O20)
- تراث `furnitureDetails`: `furnitureValue` يُقسَّم على القطع لا يُكرَّر كاملاً لكل سطر.
- نوع السحابة لـ«قرارات وأحكام المحاكم» يتبع التصنيف (مدني/شرعي) لا «شرعي» دائماً.
- غير الموظّف لم يعد كاسباً تلقائياً.
- `تسليم شيء معين` و`إزالة تجاوز` غير مالية في حصانة الإحضار وفي تقدير الأرشيف.
- مصفوفة الحجز ≤ 2 مليون تتطلب موافقة المحامي (`lawyerSoftOptIn`) قبل الأزرار.
- hydrate التسوية يحفظ `tracksOngoingAlimony` و`periodStartYmd`.
- `garnishment` / `evictionLedgerActivated`: الحالة الحيّة تفوز — لا OR يجمّد القيمة true.

### محضر ومتابعة (O12 / O23 / O24 / O4 / O26 جزئي / O3 غلاف)
- مسح مفاتيح القرارات يفلتر `isStorageKeyVisibleToCurrentUser`.
- حفظ بيانات العقار بعد موافقة المنفذ يفحص نجاح `persistExecutionMerge` قبل النجاح.
- تبويب legacy `financial` → `seizure_requests` في الفتح والتشغيل والprefetch.
- init طلبات الإدارة يعمل على `admin` (و`special` القديم).
- `ClaimType` يشمل سلاسل المنشئ الحيّة.
- `purgeDossierScopedState` يصفّي `linkedId`.
- أُزيل `@ts-nocheck` من غلاف `ExecutionDashboard.tsx` (10 أسطر).

## التقييم (صادق — بعد هذه الموجة فقط)

| البعد | قبل | بعد | ملاحظة |
|---|---|---|---|
| أداء | 7.0 | 7.0 | تشفير البلوبات الثقيلة أبطأ على القرص؛ لم يُقَس على جهاز. |
| نظافة | 6.3 | 6.6 | ما زال ~38 ملف `@ts-nocheck` (طابور المنفذ وغيره). |
| أمان | 6.0 | 7.3 | O9 مكتمل في التطبيق **وعلى Postgres الحي**. O5/O10 باقيان. |
| جودة كود | 7.2 | 7.5 | لا تغيير بصري. |
| موبايل | 6.4 | 6.4 | أهداف اللمس 44px لم تُمس (تحتاج إذناً بصرياً). |

**المجموع التقريبي: ~6.9 / 10.** القسم غير مغلق.

## الحدود — ما لم يُنفَّذ عمداً أو لتعذّره الآن

- تطبيق الهجرة على قاعدة الإنتاج (عملية تشغيل منفصلة).
- O7 / أهداف اللمس: ممنوع بلا إذن بصري.
- O25: ربط `judgmentDate` و`evictionPremisesUse` في الواجهة يحتاج حقولاً ظاهرة.
- O3: نزع `@ts-nocheck` بالجملة من طابور المنفذ (~1k سطر) بلا تجميع ملف-ملف.
- O5 مفتاح الجهاز المشترك، O6 مفاتيح `execution_{id}` بلا `:u:`، O10 `data_signature` بلا تحقق خادم، O16 محرّك الحبس عند الإنشاء.
- `reconcileDossierLifecycle` / `setDossierStatus` ما زالت no-ops.
- `npm run gate:execution` الكامل (يشمل E2E) لم يُشغَّل. شُغّلت وحدات المسارات المصلّحة + مجموعة ExecutionDashboard/application (1037 ناجح بعد إصلاح 3 اختبارات كانت تثبّت السلوك القديم).

## الموقع

جاهز للانتقال إلى موجة تالية داخل التنفيذ: **نعم لغير البصري**.  
إغلاق قسم التنفيذ: **لا**.
