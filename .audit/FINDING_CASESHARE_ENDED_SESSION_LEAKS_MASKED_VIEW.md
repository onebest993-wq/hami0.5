# إنهاء جلسة CaseShare لا يسحب اللقطة المقنّعة — **مُغلق (2026-08-10)**

**اكتُشف:** 2026-08-10 (فحص ذرّي Archive/caseShare ضمن قسم الدعاوى).

---

## الملخص (كان)

عند `status === 'ended'` أو `declined`، المستقبل كان يحتفظ بـ `maskedView` كاملاً.

---

## الإصلاح المُنفَّذ

1. `caseShareAccessControl.ts` — `stripRecipientSensitiveView` / `buildEndedRecipientPreview`؛ `applyShareAccessPolicy` يُفرّغ المحتوى للمستقبل عند `ended`/`declined`/انتهاء المدة.
2. `canFetchShareDetail` — يرفض `ended`/`declined`/غير النشط للمستقبل.
3. `SharedDossierViewer.tsx` — حارس `recipientContentBlocked` (defense in depth).
4. اختبار: `caseShareAccessControl.test.ts` — «بعد endSession لا يعيد المستقبل catalog/parties».

**التحقق:** `npx vitest run src/app/services/caseShare` — 52/52 ناجح.

**متابعة (2026-08-10):**
- `revokeSharesForDossier` + `caseShareDossierRevocation.ts` — واجهة موحّدة للدعاوى والتنفيذ.
- ربط `permanentlyDeleteLawsuits` و`permanentlyDeleteExecutions` — ينهي `pending`/`accepted` عند الحذف النهائي (`system:dossier-deleted`).
- اختبارات: `caseShareDossierRevocation.test.ts` (تنفيذ + عزل معرّف).

**الأولوية:** Critical — **مُعالَج**.
