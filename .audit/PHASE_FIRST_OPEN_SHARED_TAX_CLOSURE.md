# عزل الضريبة المشتركة لأول فتح — إغلاق (نوع إضبارة الأحوال بلا wordLists)

**التاريخ:** ٣١ آب ٢٠٢٦  
**النطاق:** persist كان يسحب `wordLists` + تحقق الدعوى الجديدة لأن مساعدات المرآة استوردت `personalStatusValidation`.  
**ليس نطاقاً:** `ui-icon-*`، رفع سقف، تقسيم التغذية، FOC يستورد persist عن حق.

---

## القرار

`isPersonalStatusFile` و`PERSONAL_STATUS_STAGE_OPTIONS` لا يحتاجان كلمات الحظر ولا `LawyerNewCase/validation`. نُقلا إلى `personalStatusFileKind.ts`. المساعدات تستورد الورقة. التحقق يعيد التصدير ويبقى على wordLists لنموذج الإضبارة الجديدة فقط.

`FinancialOperationsCenter` يستورد persist ثابتاً لأنه سطح تنفيذ/مالي — ليست حافة خاطئة.

---

## ما أُنجز

| القطع | السلوك |
|---|---|
| `personalStatusFileKind.ts` | مراحل + `isPersonalStatusFile` |
| `personalStatusAppealStageHelpers.ts` | من الورقة لا من التحقق |
| `personalStatusValidation.ts` | إعادة تصدير؛ wordLists للنموذج |
| أمانة أول فتح | المساعدات بلا wordLists/validation |

---

## القياس — `dist` إنتاج، بلا `VITE_SHELL_AUTH_OPEN`

| المقياس | قبل | بعد |
|---|---|---|
| persist خام | 161272 | **151560** (سقف 212992) |
| مستوردو persist | 147 | **139** |
| منتدى / مضيف / AddTask / OTP | 271 / 70 / 90 / 21 | **بلا تغيّر** |
| جزائي معزول | 1768 | **1760** |
| تمييز / مالية / تنفيذ | 1600 / 1454 / 1664 | **1591 / 1444 / 1655** |
| SmartFile معزول | 1519 | **1514** |
| حارس + ميزانية مسماة | OK | **OK** |

persist أعضاء: `personalStatusFileKind` + مساعدات. **لا** `wordLists` ولا `LawyerNewCase/validation` ولا `lawsuitStageOptions`.

### TTFI

لم يُحسب.

---

## التقييم

| البُعد | الدرجة | ملاحظة |
|---|---|---|
| أداء | 7 / 10 | persist −10 ك.ب. المنتدى 271. الجزائي ~1.76 م.ب |
| نظافة | 8 / 10 | ورقة نوع بلا برميل تحقق |
| أمان | 9 / 10 | لا تغيير قواعد اختصاص |
| جودة كود | 8 / 10 | أمانة المساعدات |
| موبايل | 7 / 10 | بلا بصري |
| صدق | 9 / 10 | FOC→persist معلن كسطح تنفيذ |

---

## الحدود

- Dump Host → `ChevronLeft` في المحور. عزل 70.
- persist ما زال يحمل تقويم سحابي + Threading لأجل مزامنة الجسر.
- التفاف peek-lite. TTFI غير مقيس. أول فتح كل الأقسام لحظي: لا.

---

## الموقع

جاهز للانتقال: **نعم**.

جاهز لإعلان أن مرآة الجدول لم تعد تسحب كلمات الحظر ولا تحقق الدعوى الجديدة: **نعم**.
