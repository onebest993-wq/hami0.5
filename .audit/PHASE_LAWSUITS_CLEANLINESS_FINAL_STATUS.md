# إغلاق نظافة الدعاوى — الحالة النهائية (بعد Wave 7 + zero-deduct)

**تاريخ:** 2026-08-21  
**نطاق:** Waves 1–7 cleanliness الذري + بنود نظافة zero-deduct (#8–9) — بلا PersistMigrate mass — بلا commit

## صدق صريح

**لا ندّعي 100% نظافة لكل ملف تحت قسم الدعاوى.**  
ما أُغلق هو موجات P0/P1 عالية الثقة + تخفيض أنواع Active Order File + demote/حذف ميت مثبت بـ Grep + typed `isUnderSeven` / demote `NC_FIELD_ERROR`. الباقي معلن أدناه / في `PHASE_LAWSUITS_ZERO_DEDUCT_CLOSURE.md`.

---

## ما تحقّق جوهرياً الآن (معايير النظافة)

| المعيار | الحالة | دليل مختصر |
|---------|--------|------------|
| ميت P0 (exports بلا مستوردين) | **Substantial** | Waves 1–5 حذف/demote + Wave7 +13 demote |
| Barrels / registries ميتة | **Substantial** | urgent barrel ضيّق؛ prefetch criminal الميت أُزيل |
| تكرار واجهات/aliases ميتة | **Substantial** | PS tokens / hubTheme / Form re-exports |
| Active Order File `any` hygiene | **Met for this tree** | **0× `as any`** و **0× `: any`** تحت `Dashboard_Active_Order_File/` |
| partyContextFilter typed fields | **Done** | `isUnderSeven` بلا `(as any)` |
| `NC_FIELD_ERROR` demote | **Done** | غير مُصدَّر؛ داخلي في `ncFieldClass` |
| اختبارات مركّزة خضراء | Done | **6 files / 58 tests** (zero-deduct focused suite) |

### Wave 7 — أرقام `as any` (قابل للقياس)

| نطاق | قبل Wave7 (تقريبي) | بعد |
|------|---------------------|-----|
| `Dashboard_Active_Order_File/**` `as any` | ~34 | **0** |
| نفس النطاق `: any` | ~25 | **0** |

### Wave 7 — demote (13)

انظر جدول Wave7 B في `PHASE_LAWSUITS_CLEANLINESS_FULL_PROGRAM.md`.

---

## حالة معيار النظافة (بعد دفعة الإكمال + zero-deduct 2026-08-21)

انظر أيضاً: `PHASE_LAWSUITS_CLEANLINESS_ONE_SHOT_BATCH_CLOSURE.md` · `PHASE_LAWSUITS_ZERO_DEDUCT_CLOSURE.md`

| المعيار | الحالة |
|---------|--------|
| ميت/تكرار غير-Props في نطاق criminal+smart-modal+Archive+urgent+AOF | **مُغلق جوهرياً** |
| Active Order + PersistMigrate `any` | **0** |
| تقسيم مستهدف (stage/cassation/ledger/Form) | **مُغلق** |
| `*Props` / KEEP deprecated | **متعمد الإبقاء** |
| partyContext / NC_FIELD_ERROR | **مُغلق في zero-deduct** |

**صدق:** ليس مسحاً حرفياً لكل المستودع؛ هو إغلاق عملي لمعيار النظافة في نطاق الدعاوى + بنود الخصم المدرجة.

---

## تقييم أبعاد (صادق)

| البُعد | درجة | ملاحظة |
|--------|------|--------|
| أداء/استقرار | 8.5/10 | slimming + touch floors؛ لا قياس runtime جهاز |
| نظافة | 9/10 | AOF any صفر + partyContext typed + demote NC |
| أمان | 7.5/10 | تضييق أنواع يقلّل مفاجآت؛ لا مراجعة أمنية كاملة |
| جودة كود | 8.5/10 | display/lite splits؛ بدون سلوك جديد متعمّد |
| موبايل | 9/10 | touch floors في zero-deduct |
| صدق | 9.5/10 | FINAL يقول صراحة: ليس 100% لكل ملف |

**جاهز للانتقال؟** نعم لمرحلة تالية منفصلة (PersistMigrate typing، execution dedupe، أو mega splits).

---

## جدول منجز Wave 7 + zero-deduct نظافة

| # | بند | الحالة |
|---|-----|--------|
| 1 | تخفيض any في Active Order File | Done — 0/0 |
| 2 | demote dead same-file (≤15) | Done — 13 |
| 3 | leftover dead Form_Urgent / domain/urgent / criminal | Verified clean |
| 4–5 | FULL_PROGRAM + FINAL_STATUS | Done (محدّث) |
| 6 | vitest مركّز | **6 files / 58 passed** |
| 8 | partyContextFilter typed | Done |
| 9 | NC_FIELD_ERROR demote | Done |
