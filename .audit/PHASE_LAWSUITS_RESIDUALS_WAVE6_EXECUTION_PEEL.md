# PHASE: Lawsuits Residuals Wave 6 — Execution Types + Dashboard Store

**Status:** CLOSED (practical peels)  
**Date:** 2026-08-21  
**Rules:** صفر بصري · barrels محفوظة · لا commit  
**SKIP:** orchestration, DossierBody, JudgmentOutcomeActions, `common.ts` (اختياري — تُرك عمداً)

## LOC

| هدف | قبل | بعد | أسلوب |
|-----|-----|-----|--------|
| `types/execution/executionFile.ts` | ~692 | **37** | barrel + `ExecutionFile` composition |
| `executionFileCore` | — | 151 | أساسي + حجز + ملاحظات |
| `executionFileDebtor` | — | 109 | تبليغ/مهلة/ذمة |
| `executionFileDecisions` | — | 79 | إكراه شخصي/حبس/منع سفر |
| `executionFilePartyDeath` | — | 69 | وفاة/ورثة |
| `executionFileOrders` | — | 125 | توظيف/توحيد/مستندات/تسليم |
| `executionFileGuarantor` | — | 94 | كفيل + helpers |
| `executionFileEviction` | — | 96 | تخلية |
| `executionFileLegacyDisplay` | — | 45 | حقول عرض قديمة |
| `stores/executionDashboardStore.ts` | ~576 | **168** | create + persist + re-exports |
| `…/fileActions.ts` | — | 119 | ملف/جدول زمني |
| `…/modalUiActions.ts` | — | 54 | نوافذ/UI |
| `…/subFileActions.ts` | — | 188 | إنابة/تبديل |
| `…/unificationActions.ts` | — | 87 | توحيد |
| `…/lifecycleActions.ts` | — | 75 | lifecycle stubs + purge/reset |

Public paths unchanged: `@/app/types/execution`, `@/app/stores/executionDashboardStore`.  
`executionShared` الآن يعيد تصدير `executionFile` + `formAndUi` أيضاً.

## اختبارات

- `phase6Progress` — **executionTypes** كلها خضراء (20)
- `debtorEmploymentToggle` + `executionDashboardTimelineScope` + `foundationStorePersist` + `executionCoreDossierMetaResidentHonesty` → **24 passed**
- Honesty: قراءة `ModalStates` من `executionDashboardStore/types.ts` بعد نقل الواجهة

## حدود

- `common.ts` (~573) لم يُقسَّم — اختياري؛ عناقيد واضحة لكن خارج هدف Wave 6 الإلزامي.
- `phase6Progress` كامل الملف فيه فشل سابق (ملفات مفقودة / AdminLawEntry / phase-6-close.json) — غير ناتج عن هذه الموجة.
