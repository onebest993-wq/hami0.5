[OPEN] Debug Session: pleadings-close-button

- Symptom:
  - زر `ختام المرافعة` ظاهر لكنه أحياناً لا يفعل شيئاً عند الضغط، وكأنه غير موجود.
- Expected:
  - عند الضغط يجب أن يفتح `SmartJudgmentModal` فوراً للمسار الحالي.
- Scope:
  - `SmartFileStageFooterBar`
  - `SmartFileModalsJudgmentSection`
  - `useSmartFileMainPanelLayout`
  - حالات المرحلة الحالية/المعروضة والـ nested overlays

## Hypotheses

- A. النقر يصل إلى الزر لكن `setShowJudgmentModal(true)` يُلغى مباشرة بسبب إعادة رسم أو حالة متضاربة.
- B. `showJudgmentModal` يتحول إلى `true` لكن `LazySmartJudgmentModal` لا يركب أو يفشل أثناء التحميل.
- C. يوجد Overlay أو حالة nested modal تمنع استقبال النقر رغم ظهور الزر.
- D. `showPleadingCloseFooter` أو شروط الذيل تتبدل لحظة النقر، فيختفي أثر الفعل فوراً.
- E. `displayStage/currentStage/activeStageIndex/viewingStageIndex` غير متسقة، فيرتبط الزر بمسار غير المسار المعروض.

## Plan

1. تشغيل Debug Server للجلسة.
2. زرع instrumentation فقط على:
   - click path
   - footer state
   - showJudgmentModal render path
   - lazy modal mount/failure
3. إعادة إنتاج المشكلة وقراءة السجل `pre-fix`.
4. تحديد الفرضية الصحيحة ثم تطبيق إصلاح صغير.
5. إعادة التحقق عبر `post-fix`.

## Runtime Setup

- Debug Server: `http://127.0.0.1:7778/event`
- Log File: `.dbg/trae-debug-log-pleadings-close-button.ndjson`

## Pre-fix Evidence

- Reproduced locally from `http://localhost:8080/` عبر التنبيه ثم داخل الإضبارة المفتوحة.
- بعد الضغط على `ختام المرافعة` ظهر مودال الحكم فعلياً في الصفحة.

### Key log entries

- `SmartFileStageFooterBar.tsx:pleadings-close-button`
  - `[DEBUG] pleadings close button clicked`
  - stage=`الاستئناف`
  - `showPleadingCloseFooter=true`
- `SmartFileModalsJudgmentSection.tsx:showJudgmentModal`
  - `[DEBUG] judgment modal render path reached`
- `SmartJudgmentModal.tsx:mount`
  - `[DEBUG] SmartJudgmentModal mounted`

## Hypotheses Status

- A. click يصل ثم يُلغى مباشرة: غير مؤكد حالياً، لكن في إعادة الإنتاج المحلية وصل click وتبعه mount.
- B. `showJudgmentModal` لا يركب: مرفوض في إعادة الإنتاج المحلية.
- C. فشل lazy import: مرفوض مبدئياً، لم يظهر أي log فشل.
- D. شروط الذيل تخفي النتيجة فوراً: مؤكّد. بعد حفظ الحكم ظهر toast نجاح، لكن الذيل بقي `ختام المرافعة` بدلاً من حاوية الطعن.
- E. عدم اتساق المرحلة الحالية/المعروضة: غير مؤكّد، لم يكن سبب العطل هنا.

## Root Cause

- مرحلة `الاستئناف بعد النقض` كانت تحمل `wasReopened=true`.
- منطق `shouldPreferPleadingCloseFooter()` كان يعتبر أي مرحلة معادة بعد النقض مرحلة مرافعة مفتوحة دائماً، حتى بعد حفظ حكم جديد.
- وفي الوقت نفسه `resolveAppealStageFooterEligibility()` كان يمنع إظهار حاوية الطعن لمجرد أن `wasReopened=true`.
- النتيجة: الحفظ ينجح، لكن الذيل يرجع إلى `ختام المرافعة` بدل `قام الخصم بالتمييز`.

## Fix

- إيقاف تفضيل `ختام المرافعة` بعد صدور حكم جديد في المرحلة المعادة.
- السماح لحاوية الطعن في الاستئناف أن تظهر بعد الحكم الجديد حتى لو كانت المرحلة أصلها `wasReopened=true`.

## Post-fix Verification

- `vitest --run src/app/components/lawyer/smart-modal/smartFile/__tests__/appealStageFooter.test.ts`
  - Passed `7/7`
- Browser verification on the same dossier:
  1. فتح `الاستئناف بعد النقض`
  2. الضغط على `ختام المرافعة`
  3. اختيار `تأييد الحكم المستأنف ورد الاستئناف`
  4. الضغط على `حفظ القرار وانتظار طعن الخصم (تمييزاً)`
  5. النتيجة بعد الإصلاح: ظهر زر `قام الخصم بالتمييز` بدل رجوع `ختام المرافعة`
