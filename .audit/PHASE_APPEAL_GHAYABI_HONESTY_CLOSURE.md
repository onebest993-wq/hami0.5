# إغلاق شريحة أمانة الاستئناف والحكم الغيابي/المختلط

**التاريخ:** 1 سبتمبر 2026  
**النطاق:** hop البداءة → الاستئناف (والتمييز المباشر من البداءة)  
**الحكم:** الشريحة **مغلقة داخل حدودها**. محرك الغياب داخل محكمة الاستئناف (م/188) ومهلة التمييز من التبليغ (م/210) **ليسا** ضمن هذه الشريحة.

---

## ما أُنجز

- `JudgmentFormType` يشمل `MIXED`. `parseJudgmentFormType('مختلط')` → `MIXED` لا `null`.
- `resolveStructuredJudgmentForm` يقرأ الصفات الفردية قبل الملخص السُلّمي. بمثابة الحضوري = حضور-مثل (`HADORI`).
- عند فتح الاستئناف/التمييز من البداءة: `priorJudgmentForm` صادق، وتُنسخ `partyJudgmentDispositions` + `disputeIntegrity` + `partyChallengeLanes`.
- hop الاستئناف → التمييز **لا** يعيد ختم المختلط من النسخة المحمولة؛ شكل الحكم السابق هو حكم الاستئناف نفسه.
- مرحلة الاعتراض الغيابي لا تستلم بطاقات البداءة (تبقى على البداءة المقفولة).
- بعد hop الموكل أو الخصم: بطاقة المستأنف تُوسم `appeal` على البداءة وتُنسخ إلى الاستئناف.

ملفات محورية:
- `src/app/components/lawyer/lawyerShared/stageTransitionMetadataTypes.ts`
- `src/app/components/lawyer/smart-modal/smartFile/judgmentStageMetadataTypes.ts`
- `src/app/components/lawyer/smart-modal/smartFile/appealChallengeTruth.ts`
- `src/app/components/lawyer/smart-modal/smartFile/appealStageTransitionApply.ts`
- `src/app/components/lawyer/smart-modal/hooks/judgment/useAppealTransitionAction.ts`
- `src/app/components/lawyer/smart-modal/hooks/useSmartFilePleadingsActions.ts`

اختبارات: `appealChallengeTruth.test.ts` + تحديث parse/resolve. جولة مستهدفة خضراء (84 + 43).

---

## التقييم بالأبعاد

| البُعد | الدرجة | السبب |
|--------|--------|--------|
| أداء | 8/10 | hop خطي كما كان؛ نسخ مصفوفات صغيرة |
| نظافة | 8/10 | وحدة `appealChallengeTruth` بدل ختم HADORI الصامت |
| أمان | 8/10 | لا يُعامل المختلط حضورياً في metadata؛ الاعتراض ما زال بدائياً فقط |
| جودة كود | 8/10 | مصدر حقيقة واحد للشكل + نسخة بعد وسم المستأنف |
| موبايل | 7/10 | لا تغيير بصري؛ التدفق نفسه على اللمس |
| صدق | 9/10 | م/188 وم/210 ومسارات متوازية معلنة غير منفَّذة |

---

## الحدود — ليست «لاحقاً داخل الشريحة» بل خارجها

1. **م/188** — حكم غيابي صادر من محكمة الاستئناف: لا اعتراض غيابي استئنافي.
2. **م/210** — مهلة التمييز من تبليغ الحكم الغيابي: التمييز ما زال 30 يوماً من القرار في المحرك.
3. **مساران نشطان معاً** — اعتراض + استئناف: ما زال الخط واحداً + استئخار م/172.
4. **التنفيذ** — `LAPSED_EXECUTABLE` ختم لا لوحة تنفيذ.
5. **ملفات قديمة** — استئناف محفوظ سابقاً بـ `priorJudgmentForm: HADORI` رغم مختلط البداءة لا يُهاجَر تلقائياً.

---

## جاهز للانتقال؟

**نعم** إلى شريحة م/188 أو م/210 إذا طُلبت.  
**لا** إذا شُرط أن الاستئناف نفسه أصبح محرك حكم غيابي كامل.

```bash
npx vitest run src/app/components/lawyer/smart-modal/smartFile/__tests__/appealChallengeTruth.test.ts src/app/components/lawyer/smart-modal/smartFile/__tests__/judgmentStageMetadataTypes.test.ts src/app/components/lawyer/smart-modal/smartFile/__tests__/art172AppealStay.test.ts
```
