# إنشاء CaseShare بلا تحقق خادمي من ملكية الإضبارة — **مُغلق (2026-08-10)**

**اكتُشف:** 2026-08-10 (فحص ذرّي Archive/caseShare ضمن قسم الدعاوى).

---

## الملخص (كان)

`POST /api/case-share` قبل `source` من العميل دون إثبات ملكية `dossierId`؛ fallback محلي في الإنتاج.

---

## الإصلاح المُنفَّذ

1. **جديد** `caseShareDossierOwnership.ts` — `assertShareSourceOwnedByUser` (محلي + Supabase lawsuit/execution؛ جنائي client-only).
2. `caseShareRepository.ts` — يستدعي التحقق قبل `createShare`.
3. `src/app/api/case-share/route.ts` — تحقق ملكية قبل الإنشاء؛ رفض الجنائي على الخادم.
4. `caseShareApiService.ts` — لا fallback محلي لـ `create` في `import.meta.env.PROD`.
5. اختبارات السيناريو — `seedOwnedLawsuitForShareTests()` في `caseShareTestFixtures.ts`.

**التحقق:** `npx vitest run src/app/services/caseShare` — 52/52 ناجح.

**حدود:** التحقق الجنائي على الخادم مرفوض (client-only) — يُعتمد على مسار محلي + `useCriminalStore`.

**الأولوية:** Critical — **مُعالَج** (مع حد الجنائي أعلاه).
