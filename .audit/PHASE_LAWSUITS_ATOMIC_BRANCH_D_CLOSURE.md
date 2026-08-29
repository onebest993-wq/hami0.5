# Branch D — إغلاق جزئي (تبويب المستعجل + Active Order)

**تدقيق:** [Atomic audit Branch D urgent](8a5b9db0-e1b1-432f-8ddd-cda4b48ed475)  
**إصلاح:** جلسة مباشرة بعد موافقة المستخدم  
**تاريخ:** 2026-08-20

## ما أُنجز

| ID | الإصلاح | ملفات |
|----|---------|--------|
| D1 | `focusCaseId` A→B عبر `resolveFocusCaseIdApply` (آخر id مطبَّق بدل boolean) | `resolveFocusCaseIdApply.ts` + View |
| D2 | Escape/native-back يحترم إضبارة/نموذج المستعجل | `LawsuitsWorkspaceShell` + `data-testid` على الإضبارة والنموذج |
| D3 | كاتب قرص واحد: عند وجود `onCaseUpdated` لا يُستدعى `patchCase` | `useOrderFilePersist.ts` + بوابة `pendingCasesPersistRef` في التخزين |
| D4 | ترحيل `dev-user-uuid-1` فقط عند `import.meta.env.DEV` | `urgent-actions-db.ts` |
| نظافة | إزالة `filterStatus` الميت؛ تفعيل بوابة الحفظ | filter + storage |

**اختبارات:** 19 نجحت (focus، persist، shell Escape، urgent-db، render smoke).

## التقييم (واقعي)

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء/استقرار | 8/10 | سباق الحفظ مُعالَج؛ مسار lifecycle ما زال يستدعي `persistPatch` كـ no-op عند المرآة |
| نظافة | 7.5/10 | Form_Urgent ما زال كبيراً؛ `onPrime` prop ميت في النوع فقط |
| أمان | 8/10 | لا ترحيل dev→إنتاج؛ صلاحيات userId كما هي |
| جودة كود | 8/10 | helper + اختبارات مركّزة |
| موبايل | 5/10 | safe-area / أزرار &lt;44px **بصري** — معلّق بإذن تصميم |
| صدق | — | High منطقي مُغلق؛ موبايل بصري غير مُغلق |

## الحدود

- لا تقسيم Form_Urgent في هذه الجلسة (حجم كبير؛ غير حاجب للانتقال).
- لا تغيير بصري لـ touch targets.
- FastTrack داخل SmartFile ≠ هذا الفرع (فرع B).

## جاهز للانتقال

**نعم** لفرع **E0** (جسر جزائي) — High المنطقي لـ D مُغلق.

## المصداقية

لم يُنفَّذ: اختبار إنتاج صريح لتعطيل ترحيل DEV (Vitest يعمل بـ DEV=true؛ الحماية بالكود فقط). لم يُمسّ UI بصرياً.
