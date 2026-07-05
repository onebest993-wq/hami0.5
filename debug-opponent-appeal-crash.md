# Debug Session: opponent-appeal-crash
- **Status**: [OPEN]
- **Issue**: انهيار التطبيق بالكامل عند استخدام زر `قام الخصم بالطعن` أو المسار المرتبط بختام المرافعة وما بعده.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-opponent-appeal-crash.ndjson

## Reproduction Steps
1. فتح إضبارة في مسار ختام المرافعة أو بعده.
2. الوصول إلى الزر `قام الخصم بالطعن` أو `قام المدين بالطعن`.
3. الضغط على الزر أو إكمال المسار التالي له.
4. مراقبة ما إذا كان التطبيق ينهار فوراً أو بعد فتح/حفظ مودال الطعن.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | الزر يستدعي `onRegisterOpponentAppeal` أو `handleSaveJudgment` بحمولة ناقصة أو `undefined` فتنهار المرحلة التالية | High | Low | Pending |
| B | بيانات المرحلة بعد ختام المرافعة تجعل `appealRoute` أو `crossAppealEligibility` تدخل حالة غير صالحة وتكسر الـ render | High | Med | Pending |
| C | الانهيار يحصل داخل مودال/بوابة الطعن بعد الفتح، وليس من الزر نفسه | Med | Med | Pending |
| D | هناك سجل legacy أو stage مطبوع جزئياً يجعل الانتقال إلى مرحلة الطعن ينهار فقط لبعض الدعاوى | Med | High | Pending |
| E | مسار ما بعد الحفظ ينشئ stage/parties بشكل غير صالح ثم يسقط مكونات الهيدر أو الـ stepper | High | Med | Pending |

## Log Evidence
- تم تشغيل Debug Server على المنفذ `7777`.
- تم زرع instrumentation فقط في هذه النقاط:
  1. ضغط زر `قام الخصم بالطعن`
  2. لحظة render لمودال `showAppealModal`
  3. لحظة فتح `AppealTransitionModal`
  4. دخول `handleAppealRegistration`
  5. مخرجات `resolveOpponentRegistrationAppealLayout`
  6. دخول ونتيجة `applyAppealStageTransition`
  7. فشل `lazy import` الخاص بـ `LazyAppealTransitionModal`
- فحص موضعي:
  - `transpile ok` لجميع ملفات instrumentation
  - اختبارات `appealStageTransition.test.ts` و `appealPartyEngine.test.ts` نجحت بالكامل

## Verification Conclusion
Pending runtime reproduction on the failing dossier.
