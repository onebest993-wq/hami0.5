# إغلاق — طعن متبقٍ في شريط الأحوال الشخصية (بلا استئناف)

**التاريخ:** 2026-09-05  
**النطاق:** تطبيق سلوك post-hop challenge chrome على إضبارة الأحوال الشخصية، مع منع الاستئناف مطلقاً.

---

## السلوك

1. بعد hop تمييز/اعتراض في الأحوال: زر الطعن المتبقي يظهر **بجانب شريط المراحل** في `PersonalStatusSmartFileChrome` (نفس testIds المدنية).
2. المسارات المتبقية تُصفّى عبر `filterPersonalStatusAppealMethods` — **لا استئناف** أبداً.
3. زر «إنشاء طعن استئنافي مستقل» **مقفول** في الأحوال (`showIndependentClientChallenge = false`) ولا يُرسم في كروم الأحوال.
4. تسمية الزر عند تمييز فقط: «قام الخصم بالتمييز».

---

## الملفات

- `PersonalStatusSmartFileChrome.tsx` — رقاقة الطعن المتبقي بجانب السكة
- `postHopChallengeChrome.ts` + `opponentRegistrationContext.ts` — فلتر أحوال + قفل الاستئناف المستقل
- `buildSmartFileChromeProps.ts` / `resolveSmartFileMainPanelFooterFlags` / `SmartFileModalsJudgmentSection` — تمرير `file`
- اختبارات: `personalStatusPostHopChallengeChrome.test.tsx` + توسيع `opponentRegistrationContext.test.ts`

---

## التقييم

| بُعد | درجة | ملاحظة |
|------|------|--------|
| أداء | 8/10 | لا مسار جديد ثقيل؛ نفس النافذة |
| نظافة | 9/10 | مصدر حقيقة مشترك مدني/أحوال |
| أمان | 8/10 | لا تسريب استئناف في خيارات الأحوال |
| جودة | 8/10 | فلتر صريح + اختبارات |
| موبايل | 8/10 | `min-h-[44px]` + touch-manipulation |
| صدق | — | لم يُعاد تشغيل E2E Playwright للأحوال في هذه الجولة |

## الموقع

جاهز للانتقال: نعم (بعد اخضرار vitest المحلي للمسارات أعلاه)
