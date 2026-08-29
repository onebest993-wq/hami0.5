# useAutoSave يكتب active-only فوق lawyer_files ويكسر المرآة المقسّمة — **مُغلق (2026-08-10)**

**اكتُشف:** 2026-08-10 (فحص domain/lawsuit كامل).

---

## الملخص (كان)

`useLawsuitFilesState` كان يشغّل `useAutoSave` على `lawyer_files` بـ `active` فقط، متعارضاً مع `syncLawsuitMonolithicMirror`.

---

## الإصلاح المُنفَّذ

- إزالة `useAutoSave` من `useLawsuitFilesState.ts` — الاعتماد على `setFiles` / `syncLawsuitMonolithicMirror` فقط.
- C1: إضافة `lawyer_files_active|archived|trash|index` إلى `ENCRYPTED_EXACT_KEYS` في `secureStorageKeys.ts` + اختبار.

**التحقق:** `secureStorageKeys.test.ts` + اختبارات domain/lawsuit.

**الأولوية:** Critical (C2) — **مُعالَج**.
