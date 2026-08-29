# برنامج نظافة شاملة — قسم الدعاوى

**بدء:** 2026-08-21  
**منهج:** جرد بأدلة → موجات P0 فقط أولاً → اختبار → صدق عن الباقي  
**مصادر الجرد:** [inventory](cf9ae4a6-af40-459d-99d6-c4386c5e14d1) · [stubs](6303040a-17ff-4eda-b2fa-9b1ceb2d2d16)

## صدق

- لا ادّعاء «نظّفنا كل حرف في 875 ملفاً» دفعة واحدة.
- P0 = ثقة عالية (صفر مستوردين خارج التعريف).
- P1/P2 = توحيد/حكم لاحق — لا حذف أعمى.

## موجة 1 — P0 (منجزة)

ميت مثبت: barrels، shims deprecated، رموز urgent غير مستدعاة، توكنات PS_* ميتة، Lazy* مكررة في registry، noop `onToggleClient`، إلخ. (انظر نتائج وكيل Wave1).

## موجة 2 — نتائج (2026-08-21)

| بند | الحالة | ملاحظات |
|-----|--------|---------|
| A dead re-export `isPlaintiffRepresentedParty` من `absentJudgmentFlow` | Done | لا مستوردين من ذلك المسار؛ المصدر يبقى `representedPartySide` |
| B `urgentSectionStructure` host tab + line gate | Done | `LawsuitsWorkspaceUrgentTab`؛ عتبة الأسطر 602 (=562+40) مع تعليق smell gate |
| C demote same-file-only exports (≤15) | Done | 15 رمزاً تحت ArchivePortal + smartFile (انظر أدناه) |
| D lifecycle bars shared shell | **Skipped** | مخاطر بصرية: `pb-2.5` للتنفيذ، ظهور سلة مشروط للدعاوى، نصوص سلة مختلفة، aria/testIds مختلفة. المشاركة عبر `archiveLifecycleSegmentUi` كافية الآن |
| E تحديث هذا المستند | Done | |

### Wave2 C — الرموز المُنزَلة (export → داخلي)

ArchivePortal: `matchesExecutionJurisdictionFilter`, `matchesExecutionDossierStatusFilter`, `resolveExecutionDossierLifecycleStatus`, `countExecutionArchiveByJurisdiction`, `executionArchiveLocalStorageKey`, `formatExecutionArchiveClientDebtorLabel`

smartFile: `isDefendantFavorableAbsentOutcome`, `isAppealRouteFirstInstanceStage`, `collectTransferableAttachments`, `CORRECTION_JUDGMENT_REJECTED`, `listInterpleaderPartiesForAppeal`, `hasThirdPartyInAppealContext`, `extractAppealJudgmentTypeFromStage`, `sanitizeForPersist`, `isPartialMeritDecisionText`

## موجة 3 — نتائج (2026-08-21)

| بند | الحالة | ملاحظات |
|-----|--------|---------|
| A حذف `CORRECTION_JUDGMENT_ACCEPTED` | Done | معرّف بلا أي استخدام؛ حُذف. الشقيق `CORRECTION_JUDGMENT_REJECTED` مستعمل محلياً (مُنزَّل Wave2) — أُبقي |
| B demote same-file-only exports (≤20) | Done | 20 رمزاً — تحقق live grep (baseline Aug-13 قديم جزئياً) |
| C slim `domain/urgent/index.ts` | Done | يبقى فقط ما يُستورد من مسار الـ barrel |
| D ModalSuspense duplicate | **Verified closed** | `criminalDashboardLazyModals` يستخدم `lazyModal` من `criminalLazyModalCore` فقط؛ لا `ModalSuspense` محلي |
| E حذف `PARTIES_CARD_SHELL` | Done | dead بالكامل (صفر إشارات) — حذف لا demote |
| F تحديث هذا المستند | Done | |

### Wave3 B — الرموز المُنزَلة (export → داخلي)

civilLawTaxonomy: `CIVIL_PROCEDURE_TAXONOMY`, `EVIDENCE_TAXONOMY`, `articleMatchesTaxonomyBranch`, `articleMatchesTaxonomySection`

smartHeaderPresentation: `MAIN_FILE_CATEGORIES`

smartFile: `findPriorAppealStageIndex`, `extractCassationJudgmentTypeFromStage`, `findCassationStageIndexBeforeCorrection`, `resolveLitigationDegree`, `formatLitigationDegreeLabel`, `resolveLitigationDegreeKey`, `criminalCaseLinkCandidate`, `isCivilLawsuitHiddenSystemTask`, `isPartialMeritJudgmentType`, `CASSATION_CORRECTION_STAGE_NAME`, `isCassationCorrectionConsumedForStage`, `shouldAllowExtraordinaryAppealsWhenArchived`, `isExtraordinaryAppealInProgress`, `AppealStageFooterKind`

ArchivePortal: `LawsuitLifecycleViewMode`

### Wave3 C — barrel بعد التقليص

`@/app/domain/urgent` يصدّر فقط: `createCaseFromForm`, `normalizeLoadedCases`, `serializeCasesForStorage`  
(المستهلكون: `View_Urgent_And_Orders_Dashboard` + `useUrgentCasesStorage`. بقية الرموز تُستورد deep من ملفات الوحدة.)

### اختبارات Wave3

`vitest run` على urgent domain + caseConsolidationLinking + extraordinaryAppealGateway + appealStageJudgmentEngine + crossAppealEngine + appealStageTransition + archivePortalModuleLoad + archiveFinancialSync → **10 files / 77 tests passed**.

## موجة 4 — نتائج (2026-08-21)

| بند | الحالة | ملاحظات |
|-----|--------|---------|
| A حذف dead exports/ملفات ميتة (ثقة عالية) | Done | criminal + personal-status + Dashboard_Active_Order_File — انظر أدناه |
| B demote same-file-only (≤25) | Done | 25 رمزاً — Form_Urgent / domain/urgent / personal-status / Active_Order_File / resolveCaseClassification |
| C barrels/registries جنائية | Done | حذف `prefetchCriminalLegalCodesTab` + `prefetchCriminalProceduralCanvas` (صفر مستدعين؛ التبويب عبر `prefetchCriminalDashboardTab`) |
| D domain/urgent dead files | **Skipped** | كل ملفات الوحدة لها مستوردين deep؛ barrel يبقى 3 رموز |
| E تحديث هذا المستند | Done | |

### Wave4 A — محذوفات (Grep صفر خارج التعريف)

**criminal-system:** `isValidCaseClassification`, `caseClassificationLabel`, `misdemeanorTypeLabel`, `CASSATION_RESULT_FORM_OPTIONS`, `requestCardStarredClass`, `CRIMINAL_MODAL_BTN_PRIMARY/CANCEL_ALT/ACCENT`, `requestOpenCriminalCasesList` (+ demote داخلي لـ `CRIMINAL_CASES_ENTRY_SESSION_KEY`), `resolveMergeProceduralStageKey`, `countMergeEligibleTargets`, `filterJudicialDecisionsForLedger`, `countDecisionsLedgerKinds`, `filterInheritedTimelineEvents`, `filterInheritedStatements`, `isInheritedTimelineEvent`, `assertInvestigationTimelineMutable`, `itemIsExclusiveToDefendants`, `partitionItemsByDefendantsExclusive`, `trashCountForCase`, `CaseIdentityCorrectionModal` + `DepositionIdentityCorrectionModal` (بقي `PartyIdentityCorrectionModal`)

**Dashboard_Active_Order_File:** `safeMaxToday`, `URGENT_DOSSIER_SECTION_LABEL`, `URGENT_DOSSIER_INLINE_SECTION`, `DeadlinePhase`

**personal-status:** `PERSONAL_PROCEDURAL_LAW_TABS`, `isPersonalStatusJurisdiction`, `PERSONAL_STATUS_FORM_SHELL/GRADIENT/GRADIENT_2/ACCENT`, `PERSONAL_STATUS_PARTIES_*`, مكوّنات زجاج ميتة (`GlassPanel`/`PearlTile`/`PagePattern`/sheen)، توكنات PS_* بلا مستوردين (`PS_PEARL`, `PS_DOCK_BTN`, `PS_WORK_CHIP_*`, إلخ)

### Wave4 B — الرموز المُنزَلة (export → داخلي)

Form_Urgent: `UrgentPartyLabels`, `UrgentSubmitContext`

domain/urgent: `ProcedureCategory`, `CreateCaseFromFormOptions`

personal-status: `PERSONAL_FORM_STEPS`, `PERSONAL_STATUS_188_TAXONOMY`, `JAAFAARI_CODE_TAXONOMY`, `articleMatchesPersonalStatusTaxonomySection`, `articleMatchesPersonalStatusTaxonomyBranch`, `isPersonalExtraordinaryStage`, `PersonalStatusStage`

Dashboard_Active_Order_File: `OrderFilePartyEntry`, `AssembleActiveOrderFileViewInput`, `ComputeGrievancePhase2FinalizeReadyArgs`, `CassationDerivedDeps`, `GrievancePhase`, `ChronologyPhase`, `ActiveOrderFileLifecycleClusterInput`, `ActiveOrderFileWorkspaceClusterInput`, `UseDecisionNotificationSubmitArgs`, `UseOrderFileCasePathwayArgs`, `UseOrderFileLifecycleStateArgs`, `UseOrderFilePartyWorkspaceArgs`, `BuildLifecyclePanelPropsInput`

criminal: `resolveCaseClassification`

### اختبارات Wave4

`vitest run` على urgent + Form_Urgent_Actions + personal-status + Dashboard_Active_Order_File + casePhaseFilterEngine + criminalDashboardLazyRegistry + criminalCaseOwner + criminalStageUtils → **22 files / 160 tests passed**.

## موجة 5 — نتائج (2026-08-21)

| # | بند | الحالة | ملاحظات |
|---|-----|--------|---------|
| 1 | prefetchCriminalLegalCodesTab / prefetchCriminalProceduralCanvas | **Verified closed (W4)** | صفر إشارات — لا عمل إضافي |
| 2 | PS_CHROME_BTN | Done | حذف التوكن + import الميت من SmartFileChrome |
| 3 | dead pearl aliases | **Verified closed (W4) + demote** | PS_PEARL* محذوفة سابقاً؛ demote نفس-الملف: PS_GLASS_SHADOW* / PS_PANEL_ROSE_GLASS / PS_TILE_INTERACTIVE |
| 4 | Form_Urgent re-exports URGENT_PETITION_PRIMARY / actionTypeOptions | Done | أُزيلا من barrel Form constants؛ المستوردون deep من domain |
| 5 | onToggle noop legacy thirdParties | Done | PartyChip: isOpen/onToggle اختياريان؛ legacy chip بلا noop |
| 6 | isLawsuitFileArchived / isLawsuitArchived | Done | API عام واحد: `isLawsuitArchived`؛ الحارس يستخدم `lawsuitTargetIsArchived` داخلياً |
| 7 | UrgentSubmitContext | **Verified closed (W4)** | type نفس-الملف فقط في buildUrgentActionsSubmitPayload |
| 8 | criminalStageUtils dead helpers | Done | حذف سلسلة timeline/badge بلا مستوردين؛ demote LEGACY_INVESTIGATION_* + JUVENILE_DETENTION_OPTIONS + InvestigationLogStatus |
| 9 | fake lazy TrialsTab | Done | استيراد ثابت `TrialsTab` بدل `lazy(() => Promise.resolve(...))` |
| 10 | timeline filters store ↔ ExecutionDossierScope | **Skipped** | execution-only؛ مستوردون كثر من الـ store؛ توحيد محفوف بدون قيمة دعاوى مباشرة |
| 11 | personalHubTheme ≡ pearl | Done | حذف الغلاف؛ `hubTheme('personal')` → `personalPearlHubTheme()` مباشرة |

## موجة 6 — نتائج (2026-08-21)

| بند | الحالة | ملاحظات |
|-----|--------|---------|
| applyCaseRecord `as any` | Done | 0× `as any`؛ حقول عبر PersistedCaseRecord + guards (`ymdPrefix` / `asObjectRecord`) |
| useOrderFilePartyWorkspace `as any` | Done | 0× `as any`؛ `OrderFilePartyCaseData` ضيق |
| criminalStorePersistMigrate | **Skipped (by design)** | خارج نطاق الموجة |
| بقية hydrate setters `any` | باقٍ | `UseOrderFileHydrateArgs.caseData` / persist/lifecycle `setCaseData: any` — دين لاحق |

### اختبارات Waves 5–6

`vitest run` مركّز: criminalStageUtils + lawsuit mutation/trash + personal-status structure/overlay + Active_Order_File + Form_Urgent + domain/urgent + lazy registry + casePhaseFilter + execution timeline scope → **17 files / 123 tests passed**.

## موجة 7 — نتائج (2026-08-21)

| بند | الحالة | ملاحظات |
|-----|--------|---------|
| A Active Order File `as any` / `: any` (focus + cascade) | Done | Directory-wide **0× `as any`** و **0× `: any`** تحت `Dashboard_Active_Order_File/` (كان ~34 / ~25) |
| B demote same-file-only exports (≤15) | Done | 13 رمزاً — personal-status + View_Urgent (Form_Urgent + domain/urgent بلا مرشّحين جدد) |
| C criminal leftover dead | **Verified clean** | لا رموز Grep-صفر جديدة تحت نطاق urgent/criminal لهذه الموجة |
| D تحديث البرنامج + FINAL_STATUS | Done | انظر `.audit/PHASE_LAWSUITS_CLEANLINESS_FINAL_STATUS.md` |

### Wave7 A — ملفات الأنواع المضبوطة

Focus: `useLifecyclePhaseDerived`, `useOrderFileLifecycleState`, `useHearingChronologyDerived`, `useOrderFileMetaPartyEdit`, `useOrderFileCasePathway`, `GrievanceReadOnlySummaries` + `lifecycleDerived/types`.

Cascade (نفس شكل `Record<string, unknown>` بلا سلوك جديد): `useOrderFilePersist`, `lifecycleActions/*`, `useDefenderEntryHydrate`, `hydrate/types`, grievance digest/outcome، `useWorkspaceInsightsDerived`, `useGrievanceLegalEndAutoFill`.

### Wave7 B — الرموز المُنزَلة (export → داخلي)

personal-status: `PersonalStatusFlowConfirmProps`, `PersonalStatusLawReferencePanelProps`, `PersonalStatusLawTaxonomyNode`, `PersonalStatusLawTaxonomyBranch`, `PersonalStatusLawTaxonomySection`, `PersonalStatusLawTaxonomy`, `PersonalStatusNewCaseFormProps`, `PersonalStatusPartiesPanelProps`, `PersonalStatusStageFooterBarProps`, `PersonalStatusThirdPartiesPanelProps`, `PersonalStatusDossierDerivedInput`

View_Urgent: `UrgentScope`, `UrgentQuickLogModalState`  
(`UrgentQuickLogAction` بقي export — مستورد من `UrgentDashboardSections`)

### اختبارات Wave7

`vitest run` على Active_Order_File + Form_Urgent_Actions + domain/urgent + personal-status + View_Urgent_And_Orders_Dashboard → **20 files / 89 tests passed**.

## باقٍ صادق بعد Wave 7

1. **execution timeline filter duplication** — store ↔ `ExecutionDossierScope` (تخطي واعٍ).
2. **criminalStorePersistMigrate** — typing mass مؤجّل عمداً.
3. **P2 stubs / @deprecated model fields** — قرار منتج.
4. **ملفات ضخمة / mega splits** — خارج نطاق cleanliness الذري.
5. **ليس** ادّعاء نظافة 100% لكل ملف دعاوى خارج ما أعلاه.

## موجة 8 — ONE-SHOT demote/delete (2026-08-21)

| بند | العدد | ملاحظات |
|-----|------:|---------|
| Demote (export → داخلي) | **286** | صافي بعد حذف لاحق لـ 13 رمزاً كانت ضِمن الدفعة |
| Delete (ميت صفر/مرجع واحد) | **14** | 10 أولية + 4 cascade بعد حذف المستدعين فقط |
| Combined | **300** | هدف ≥100 — تحقّق |
| Demote خام قبل الحذف | 299 | `criminal-system` 233 + `smart-modal` 64 + `domain/lawsuit` 2 |
| ArchivePortal مرشّحون جدد | 0 | نظيف مسبقاً لهذه الفئة |

### قواعد التصفية

- Grep/probe: الرمز يظهر فقط في ملف التعريف
- تخطي: `*Props`، `PersistMigrate*`، `@deprecated … KEEP`، مستوردات اختبار فقط
- لا تغيير بصري — لا commit

### Deletes (14)

`CassationResultMark` + `CassationResultMarkProps`؛ `hasUnrevealedUnknownDefendantsLite` / `hasIdentifiedDefendantLite` / `countSeveranceSelectableDefendantsLite` + cascade `getUnknownIdentityDefendantsLite` / `filterSeveranceSelectableDefendantsLite`؛ `resolveAcceptablePurgeDefendantIds`؛ `LETTER_TRACKING_CATEGORIES` / `EVIDENCE_TRACKING_CATEGORIES`؛ `judicialDecisionMatchesPartyScope` + cascade `judicialTemplatesForPartyScope` / `resolveJuvenileJudgeDecisionTemplates`؛ `PROCEDURAL_STEP_STATUS_OPTIONS`

### اختبارات Wave 8

`vitest run` على `criminal-system` + `smart-modal` + `ArchivePortal` + `domain/lawsuit` + `Form_Urgent_Actions` → **190 files / 1375 tests passed**.

### باقٍ بعد Wave 8 (live probe)

| مقياس | قيمة |
|-------|------:|
| same-file-only exports في النطاق | **102** |
| منها `*Props` (مُتخطّاة عمداً) | **102** |
| demote candidates غير-Props | **0** |

الـ 102 المتبقية كلها عقود `*Props` لوثائق مكوّنات ما زالت مصدَّرة — خارج نطاق demote هذه الموجة.
