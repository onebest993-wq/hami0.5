# fail-open لحراسة الملكية الجنائية عند غياب هوية الجلسة — **مُغلق**

**اكتُشف:** 2026-08-10 · **تحديث visibility:** 2026-08-21

---

## الملخص (كان)

1. `canMutateCriminalCaseForLawyer` كان يُرجع `true` عند `!uid` — **أُغلق 2026-08-10**.
2. `isCriminalCaseVisibleToLawyer` / `filterCriminalCasesForLawyer` كانا fail-open عند `!uid` (تعرض كل الأضابير) — **أُغلق 2026-08-21**.

---

## الإصلاح المُنفَّذ

### موجة mutate (2026-08-10)
1. `canMutate…`: `!uid` → **false**.
2. حراسة merge/ops + اختبارات.

### موجة visibility (2026-08-21 — E-P1-2)
1. `isCriminalCaseVisibleToLawyer`: `!uid` → **false**.
2. `filterCriminalCasesForLawyer`: `!uid` → **[]**.
3. اليتامى (بلا owner) ما زالوا يُعرضون **عند وجود جلسة** فقط — حتى يُختَموا.

**حدود متبقية:** عرض اليتامى لمحامي مسجّل على جهاز مشترك (مقصود تراثي؛ mutate ما زال fail-closed على اليتيم).

**الأولوية:** Critical/High — **مُعالَج** (mutate + list visibility).
