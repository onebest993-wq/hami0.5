# إغلاق — المادة 210 مرافعات (تمييز مباشر + امتداد النقض)

**التاريخ:** 1 سبتمبر 2026  
**النطاق:** مهلة التمييز الفردية على بطاقات البداءة، قيد التمييز المباشر أثناء الاعتراض الغيابي، منطوقات النقض (بما فيها م/214)، وامتداد أثر النقض للشركاء عند إعادة الإضبارة.

**القاعدة الملزمة:** الاستئناف والتمييز ليسا غيابيَين. الغياب و`cassationDeadline` يُقرآن ويُكتبان على **البداءة المقفولة**. م/210 ≠ م/172.

---

## ما أُنجز

- بطاقة الطعن: `cassationDeadline` = اليوم التالي للتبليغ (غائب) أو لصدور الحكم (حاضر/بمثابة) + 30 يوماً. لا يُختم `lapsed` / `LAPSED_EXECUTABLE` ما دامت مهلة التمييز مفتوحة.
- تمييز مباشر من البداءة: يُحجب إن لم يُبلَّغ الغائب أو ما دامت مهلة اعتراضه قائمة، إلا بعد `waived`. بعد hop الاستئناف لا يُستدعى القيد.
- hop إلى التمييز يسم بطاقات البداءة `cassation` حتى لو كان المصدر الاستئناف (`findPriorFirstInstanceJudgmentIndex`).
- مهلة **مرحلة** التمييز بعد حكم الاستئناف تبقى `computeCassationDeadline` = تاريخ القرار + 30 يوماً دون يوم إضافي (`2026-08-04` → `2026-09-03`). مهلة البطاقة من التبليغ: `2026-08-04` → `2026-09-04`.
- منطوقات التمييز: تصديق / نقض وإعادة / **نقض والفصل في الموضوع (م/214)** / رد شكلاً. الفصل في الموضوع يختم الإضبارة بلا إعادة.
- عند نقض وإعادة: `cassationGroundsScope` = `COMMON` (افتراضي) | `PERSONAL`. امتداد م/210 فقط إذا `REVERSED_REMANDED` + `COMMON` + `indivisible`.
- حالة بطاقة جديدة: `REVIVED_BY_CASSATION_EXTENSION`. بانر إعلامي بنفس غلاف م/172.

ملفات محورية:
- `src/app/domain/lawsuit/cassationArt210.ts`
- `src/app/domain/lawsuit/partyChallengeLanes.ts`
- `src/app/components/lawyer/smart-modal/smartFile/art210CassationExtension.ts`
- `src/app/components/lawyer/smart-modal/smartFile/directCassationGate.ts`
- `src/app/components/lawyer/smart-modal/smartFile/appealChallengeTruth.ts`
- `src/app/components/lawyer/smart-modal/hooks/judgment/judgmentConfirm/scenarioCassation.ts`

---

## التقييم

| البُعد | الدرجة | السبب |
|--------|--------|--------|
| أداء | 8/10 | hop خطي؛ لا مرحلة تمييز غيابية موازية |
| نظافة | 8/10 | المحرك في domain؛ التطبيق في smartFile؛ لا نسخ غياب حي إلى التمييز |
| أمان | 8.5/10 | قيد التمييز المباشر من البداءة؛ الكتابة على بطاقات البداءة فقط |
| جودة كود | 8/10 | فصل م/210 عن م/172؛ اختبارات مستهدفة للمسارات الأربعة |
| موبايل | 7.5/10 | أزرار النطاق `s.toggle` بـ 44px؛ لا تغيير بصري للغلاف |
| صدق | 9/10 | النقص أدناه معلن؛ مهلة المرحلة بعد الاستئناف لم تُغيَّر عمداً |

---

## الحدود (ليست نقصاً مخفياً داخل الشريحة)

1. **لوحة تنفيذ** لـ `LAPSED_EXECUTABLE` — خارج النطاق.
2. **مساران نشطان** اعتراض + استئناف — ما زال خطّياً + استئخار م/172.
3. زر التذييل القديم `handleCassationDecision('quashed')` يمدّ م/210 بـ `COMMON` دون اختيار PERSONAL (الاختيار في نافذة الحكم).
4. تسجيل طعن الخصم تمييزاً من حكم غيابي يبقى مسار «ترك الاعتراض» القائم: القيد يُمرَّر بعد معاملة الطاعن `waived` لحظياً.
5. إضبارات قديمة بلا `cassationDeadline`: عند إعادة الدمج تُبذر المهلة من تاريخ الحكم، وتُعاد البطاقة من `lapsed` إلى `pending` إن كانت المهلة ما زالت مفتوحة.

**مراجعة لاحقة:** أُصلح إعادة فتح البطاقات القديمة، وقراءة وحدة النزاع من الملف إن غابت عن البداءة، وتضييق تمييز الطريقة حتى لا يلتقط تصحيح القرار. مسار الحفظ الكامل لنقض/إعادة وم/214 مُختبر (119 + 15).

---

## جاهز للانتقال؟

**نعم** بالنسبة لشريحة م/210 كما اعتُمدت (تمييز مباشر نسبي + امتداد النقض + م/214).

```bash
npx vitest run src/app/domain/lawsuit/__tests__/cassationArt210.test.ts src/app/domain/lawsuit/__tests__/partyChallengeLanes.test.ts src/app/components/lawyer/smart-modal/smartFile/__tests__/appealChallengeTruth.test.ts src/app/components/lawyer/smart-modal/smartFile/__tests__/directCassationGate.test.ts src/app/components/lawyer/smart-modal/smartFile/__tests__/art210CassationExtension.test.ts src/app/components/lawyer/smart-modal/__tests__/SmartJudgmentModal.test.tsx
```
