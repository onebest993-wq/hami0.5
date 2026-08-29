# إغلاق البقايا الأربعة المتعمّدة — 2026-08-21

**طلب المستخدم:** إكمال ما كان معلَّقاً عمداً بعد برنامج النظافة.

| # | البند | الحالة | دليل |
|---|--------|--------|------|
| 1 | `criminalStorePersistMigrate` تضييق أنواع | **مُغلق** | `as any`/`any`: 168→**0** — [typing](f797dfba-b315-4010-8cd2-3f5c40d9c34a) · اختبارات migrate 7/7 |
| 2 | تكرار فلاتر timeline التنفيذ | **مُغلق** | مصدر واحد `ExecutionDossierScope`؛ المتجر يعيد التصدير — [dedup](abe3bec2-9277-4903-b137-8a72e294f20e) · 13 اختباراً |
| 3 | حقول `@deprecated` على النماذج | **مُغلق بقرار موثَّق** | 13 KEEP · 8 ALIAS · 3 SAFE_REMOVE (حُذفت) — `.audit/PHASE_LAWSUITS_DEPRECATED_FIELDS_DECISION.md` — [decision](b91a5f8d-7388-4dc9-86fc-0aa190758caa) |
| 4 | تقسيم الملفات الضخمة | **موجة 1 مُغلقة** | stageUtils 1020→709 · cassation 914→768 — `.audit/PHASE_LAWSUITS_MEGAFILE_SPLIT_PROGRAM.md` — [split](b69f969f-3ea1-4822-9776-554bc4fc34ba) |

## صدق

- ترحيل البيانات: منطق الترحيل لم يُغيَّر؛ ضُيّقت الأنواع فقط.
- Timeline: توحيد على سلوك الـ domain (استبعاد `parentExecutionId` المتعارض) مع اختبار يغطي الحالة.
- `@deprecated`: لم تُحذف حقول ما زال الترحيل/الواجهة يقرؤها.
- التقسيم: موجة أولى فقط — مرشّحون لاحقون موثَّقون في برنامج التقسيم.

## ما يبقى اختيارياً

- مزيد peels: timeline داخل stageUtils، cassation mutations، JudicialDecisionsLedger، orchestration  
- لا ادّعاء أن كل ملف ضخم في المستودع مُقسَّم
