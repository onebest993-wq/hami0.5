# صدفة التقويم المشتركة — إغلاق صادق

**التاريخ:** ٣١ آب ٢٠٢٦  
**الإذن:** المستخدم طلب التصرف باحترافية.  
**ليس نطاقاً:** تغيير بصري، إخراج InstantChrome من MainView، دمج hops، إسقاط التشفير، تقصير keep-alive.

---

## القرار

InstantChrome (MainView) والرادار الحي (Host) يشتركان في جلسة/حساب/أصناف/نموذج فارغ. Rollup أسكن ذلك داخل `LawyerDashboardMainView` فصار Host يستورد كسرة المنزل. نُسمّي الوحدات المشتركة **قبل** أي chunk ميزة.

تسمية `constants/legal.ts` كـ`legal-constants` رُفضت بعد القياس: Vite أنتج كسرة فارغة (0 KB) لأن الثوابت تُدمَج في المستورد.

---

## ما أُنجز

- `resolveScheduleChromeSharedChunk` → `schedule-chrome-lite` (جلسة، شهر، أسبوع، تسميات، تسليم حي، بوابة تراكب، نية مصدر، مهلة قانونية، أصناف الكروم، غطاء النموذج، `calendarEventForm`, `calendarModuleVisuals`).
- `local-ymd` كان سابقاً.
- الحارس: Host **ممنوع** أن يستورد `LawyerDashboardMainView-*.js` ثابتاً.
- `firstOpenSharedTaxHonesty` + `guard-first-open-shared-tax`.

---

## القياس — `dist` هذا البناء مقابل البناء السابق في الجلسة

| المقياس | قبل (بعد local-ymd فقط) | بعد |
|---|---|---|
| MainView JS | 71.7 raw / 22.1 gzip | **62.7 / 19.5** |
| Host | 40.7 / 13.5 | **38.2 / 12.5** |
| `schedule-chrome-lite` | — | **9.1 / 3.6** |
| استيرادات Host الثابتة | 117 | **61** |
| Host → MainView | نعم | **لا** |
| Host → boot/persist pipeline | لا | لا |

InstantChrome ما زال داخل MainView (`data-schedule-snapshot`). لا تغيير بصري.

---

## التقييم

| البُعد | الدرجة | ملاحظة |
|---|---|---|
| أداء | 8 / 10 | MainView −9 KB خام؛ Host لم يعد يحلّل كسرة المنزل عند التركيب. TTFI هاتف غير مقيس |
| نظافة | 8 / 10 | رفض صريح لكسرة `legal-constants` الفارغة |
| أمان | 9 / 10 | بلا تغيير صلاحيات/تشفير |
| جودة كود | 8 / 10 | حدود manualChunks + حارس dist |
| موبايل | 7 / 10 | أقل تحليل JS على الفتح؛ الشجرتان والـkeep-alive كما هما |
| صدق | 9 / 10 | Host ما زال ~61 استيراداً ثابتاً عبر مسارات أخرى (boot-peek/orchestration). المهام تسحب persist |

---

## الحدود

- لم نُخرج PaintGate من MainView (يحمي TTFI التقويم).
- لم نقطع الـ61 اعتماداً المتبقي (ليست MainView).
- لم نُعدّ E2E Playwright في هذه الجولة.
- `detectConflictsFromUnifiedEvents` يبقى اسماً في Host بسبب `import()`.
