# نظافة قسم الدعاوى — إغلاق صادق (2026-08-20)

## الحكم

| السؤال | الجواب |
|--------|--------|
| هل فُحصت النظافة بأدلة (grep + اختبارات)؟ | **نعم** |
| هل وصل القسم لـ«نظافة عالمية» لكل السطح؟ | **لا** — تحسّن واضح في P0 |
| هل أُزيل ميت مثبت؟ | **نعم** (مسار الأرشيف + SmartFile leftovers) |
| جاهز للانتقال؟ | **نعم** ضمن حدود معلنة |

## جولة 1 — مسار الأرشيف/النموذج
- إزالة `searchOpen` / `dossierSearchOpen` الميت عبر InstantShell→Host→Controller→Chrome→Toolbar
- توحيد `getAddPartyButtonText`
- حذف `applyLawsuitHardDeleteSegments` alias
- حذف أنواع ميتة

## جولة 2 — P0 من جرد SmartFile
مصدر الجرد: agent `26f577b0-5d7a-4021-b99d-5f5e03770d98`

- تقليص `lazySmartFileModalChunks` إلى الرموز المستخدمة فقط
- حذف `SmartFileModals.tsx` + `incidentalAndFlowModals.tsx`
- حذف `ResumeInterruptionModal.tsx` + `TransitionModal.tsx` + flag `showTransitionModal`
- تحديث prefetch إلى `SmartFileModalsPortal`
- توكنات ميتة: Archive toolbar / `NC_TAB_*`
- مساعدات ميتة: `clearClientFlagsOnSide`, `isLawsuitVaultArchived`, `isCriminalCaseLinkTaken`, `isDirectCassationOnlyPath`, `suggestHearingDate`, `REQUEST_FILTERS`, `readArchiveLedgerRaw`, `LegacyModalParty` / `TransitionModalProps`

## تحقق
- Vitest بعد جولة 2: **512/512** (83 ملفاً) — smart-modal + ArchivePortal + LawyerNewCase + domain/lawsuit + phase21

## التقييم (صادق)

| البُعد | الدرجة | ملاحظة |
|--------|------:|--------|
| نظافة (P0 المنفَّذ) | **9** | ميت مثبت أُغلق بأدلة |
| نظافة (قسم الدعاوى ككل) | **8–8.5** | P1/P2 متبقية |
| أداء | **8.5** | أقل lazy dead + أقل state inert |
| جودة كود | **8.5** | |
| صدق | — | ليس كمالاً مطلقاً؛ SmartJudgmentModal الضخم لم يُقسَّم |

## حدود متعمّدة (P1/P2 مؤجّلة بصدق)
- `canThirdPartyBeClient` stub (له اختبارات) — يحتاج قرار منتج
- `LAWSUIT_PORTAL_STUB` في مسار التنفيذ المشترك
- توحيد `isLawsuitFileArchived` / `isLawsuitArchived`
- `saveLawsuitFilesRawImmediate` alias
- un-export داخليات engines (P2)
- لم يُشغَّل `release:check:lawsuits`
