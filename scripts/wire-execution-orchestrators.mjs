/**
 * يربط orchestrators في useExecutionDashboardState ويزيل التكرار المضمّن.
 * node scripts/wire-execution-orchestrators.mjs
 */
import fs from 'fs';

const hookPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardState.ts';
let src = fs.readFileSync(hookPath, 'utf8');

const orchImport = `import {
    useExecutionCoercionOrchestrator,
    useExecutionDecisionsOrchestrator,
    useExecutionFollowupOrchestrator,
    useExecutionSeizureOrchestrator,
} from '../orchestrators';
`;

if (!src.includes('useExecutionFollowupOrchestrator')) {
    src = src.replace(
        "import { useExecutionDashboardLazyChunkSetup } from './useExecutionDashboardLazyChunkSetup';",
        `import { useExecutionDashboardLazyChunkSetup } from './useExecutionDashboardLazyChunkSetup';\n${orchImport}`,
    );
}

if (!src.includes('const executionFileKey = String(file?.id ?? executionId')) {
    src = src.replace(
        "    const currentFileId = parentDossierId || executionId || file?.id || '';",
        `    const currentFileId = parentDossierId || executionId || file?.id || '';\n    const executionFileKey = String(file?.id ?? executionId ?? '');`,
    );
}

// ── Followup + summons orchestrator ──
const followupStart = '    // NEW: Unified Execution & Assets Modal with Tabs';
const followupEnd = '    }, [showUnifiedExecutionModal, unifiedModalTab]);\n\n    // NEW: Timeline Accordion';
if (src.includes(followupStart) && src.includes('const showUnifiedExecutionModalRef = useRef(showUnifiedExecutionModal)')) {
    const followupOrchestrator = `    // NEW: Unified Execution & Assets Modal with Tabs
    const showUnifiedExecutionModal = modals.showUnifiedExecutionModal;
    const followupOrchestrator = useExecutionFollowupOrchestrator({
        showUnifiedExecutionModal,
        executionData,
        setExecutionModal,
        executionDashboardFileId,
    });
    const {
        showUnifiedExecutionModalRef,
        seizureMatrixRef,
        openSeizureRequestsTabRef,
        setShowUnifiedExecutionModal,
        unifiedModalTab,
        setUnifiedModalTab,
        specialRequestDate,
        setSpecialRequestDate,
        specialRequestContent,
        setSpecialRequestContent,
        specialRequestTemplatePick,
        setSpecialRequestTemplatePick,
        specialRequestManualTitle,
        setSpecialRequestManualTitle,
        specialRequestTemplateMenuOpen,
        setSpecialRequestTemplateMenuOpen,
        specialRequestTemplateMenuRef,
        showStayOfExecutionModal,
        setShowStayOfExecutionModal,
        inlineActionGateKey,
        setInlineActionGateKey,
        dossierActionModalOpen,
        setDossierActionModalOpen,
        dossierActionModalType,
        setDossierActionModalType,
        dossierActionModalSaving,
        setDossierActionModalSaving,
        executionDebtorTabIndex,
        setExecutionDebtorTabIndex,
        employeeCompulsoryBannerDismissed,
        setEmployeeCompulsoryBannerDismissed,
        showSolidaryCoerciveTargetModal,
        setShowSolidaryCoerciveTargetModal,
        solidaryCoerciveActionPending,
        setSolidaryCoerciveActionPending,
        followupSolidaryDebtorIndex,
        setFollowupSolidaryDebtorIndex,
        coerciveSubjectRef,
        followupModalChipTablistRef,
        followupModalDebtorTabsRef,
        followupModalSectionTabsRef,
        followupModalBodyScrollRef,
        followupModalOpenGenerationRef,
        debtorWorkspaceChipStripRef,
        partyDeathModalParty,
        setPartyDeathModalParty,
        partyDeathModalDecisionId,
        setPartyDeathModalDecisionId,
        alimonyBeneficiaryDeathModalOpen,
        setAlimonyBeneficiaryDeathModalOpen,
        alimonyBeneficiaryDeathModalProfile,
        setAlimonyBeneficiaryDeathModalProfile,
        lastHeirSubRequestAtRef,
        evictionVacateDeadlineLocal,
        setEvictionVacateDeadlineLocal,
        evictionAssetsTabUnlocked,
        setEvictionAssetsTabUnlocked,
        evictionCaseExpenses,
        setEvictionCaseExpenses,
        encroachmentCaseExpenses,
        setEncroachmentCaseExpenses,
        specificDeliveryCaseExpenses,
        setSpecificDeliveryCaseExpenses,
        evictionVacateDraft,
        setEvictionVacateDraft,
        showEvictionExpenseModal,
        setShowEvictionExpenseModal,
        evictionExpenseAmount,
        setEvictionExpenseAmount,
        evictionExpenseNote,
        setEvictionExpenseNote,
        showHeirsNotificationModal,
        setShowHeirsNotificationModal,
        showVisitationCalendarModal,
        setShowVisitationCalendarModal,
        heirNoticeDateDrafts,
        setHeirNoticeDateDrafts,
        heirSummonsDatePickerOpenByHeir,
        setHeirSummonsDatePickerOpenByHeir,
        evictionExpensePayMode,
        setEvictionExpensePayMode,
        showEvictionLawyerFeeModal,
        setShowEvictionLawyerFeeModal,
        lawyerFeeDisburseMode,
        setLawyerFeeDisburseMode,
        lawyerFeeDisburseNotes,
        setLawyerFeeDisburseNotes,
        evictionExecutorVacateGrantApproved,
        setEvictionExecutorVacateGrantApproved,
        evictionResidentialGracePeriodStart,
        setEvictionResidentialGracePeriodStart,
        showEvictionResidentialGraceModal,
        setShowEvictionResidentialGraceModal,
        evictionGraceDecisionId,
        setEvictionGraceDecisionId,
        graceModalStartYmd,
        setGraceModalStartYmd,
        graceModalEndYmd,
        setGraceModalEndYmd,
        graceModalAllowResave,
        setGraceModalAllowResave,
        evictionResidentialGraceManuallyEndedAt,
        setEvictionResidentialGraceManuallyEndedAt,
        policeAssistanceModalOpen,
        setPoliceAssistanceModalOpen,
        followupExpandProcedureKey,
        setFollowupExpandProcedureKey,
        consumeFollowupExpandProcedure,
        policeAssistanceDecisionId,
        setPoliceAssistanceDecisionId,
        policeAssistanceRequestTitle,
        setPoliceAssistanceRequestTitle,
        policeAssistanceAgencyDraft,
        setPoliceAssistanceAgencyDraft,
        evictionHeirsNotificationDateYmd,
        setEvictionHeirsNotificationDateYmd,
        openEvictionExecutorCompletionRef,
        summonsHubInitialMainTab,
        setSummonsHubInitialMainTab,
        summonsContextDebtorKey,
        setSummonsContextDebtorKey,
        openExecutionSeizuresTab,
    } = followupOrchestrator;

    // NEW: Timeline Accordion`;
    const i0 = src.indexOf(followupStart);
    const i1 = src.indexOf(followupEnd);
    if (i0 >= 0 && i1 > i0) {
        src = src.slice(0, i0) + followupOrchestrator + src.slice(i1 + followupEnd.length - '    // NEW: Timeline Accordion'.length);
    }
}

// Remove duplicate summons hub block
src = src.replace(
    /\n    \/\/ 🆕 V9: UNIFIED SUMMONS HUB STATE[\s\S]*?\}, \[setExecutionModal\]\);\n\n    \/\/ 🆕 V9: COERCION/,
    '\n    // 🆕 V9: COERCION',
);

// Coercion orchestrator
const coercionMarker = '    // 🆕 V9: COERCION RESOLUTION ENGINE STATE';
if (src.includes(coercionMarker) && !src.includes('coercionOrchestrator')) {
    const coercionBlock = `    const coercionOrchestrator = useExecutionCoercionOrchestrator(executionFileKey, executionData);
    const {
        activeNoticeState,
        setActiveNoticeState,
        debtorAttendedVoluntarily,
        setDebtorAttendedVoluntarily,
        debtorForcedToAttend,
        setDebtorForcedToAttend,
        debtorArrested,
        setDebtorArrested,
        nonInterferenceIssued,
        setNonInterferenceIssued,
        summoningRound,
        setSummoningRound,
        voluntaryAttendanceCount,
        setVoluntaryAttendanceCount,
        investigationCourtRequested,
        setInvestigationCourtRequested,
        investigationMemoIssued,
        setInvestigationMemoIssued,
        investigationPathDebtorPresent,
        setInvestigationPathDebtorPresent,
        forcedPathAttendanceSecured,
        setForcedPathAttendanceSecured,
    } = coercionOrchestrator;

    // ===========================
    // 7-YEAR STATUTE`;
    src = src.replace(
        /    \/\/ 🆕 V9: COERCION RESOLUTION ENGINE STATE[\s\S]*?    \);\n    \n    \/\/ ===========================\n    \/\/ 7-YEAR STATUTE/,
        coercionBlock,
    );
}

// Decisions orchestrator
if (src.includes('const [decisionsReloadEpoch, setDecisionsReloadEpoch]') && !src.includes('decisionsOrchestrator')) {
    src = src.replace(
        /    const \[decisionsReloadEpoch, setDecisionsReloadEpoch\] = useState\(0\);[\s\S]*?    \}, \[showDecisionsModal, clearDecisionsModalBootState\]\);\n\n    \/\*\* تعبئة مسبقة/,
        `    const decisionsOrchestrator = useExecutionDecisionsOrchestrator({
        showDecisionsModal,
        setShowDecisionsModal,
    });
    const {
        decisionsReloadEpoch,
        setDecisionsReloadEpoch,
        decisionsModalBootHubTab,
        setDecisionsModalBootHubTab,
        decisionsModalBootListTab,
        setDecisionsModalBootListTab,
        decisionsModalScrollToDecisionId,
        setDecisionsModalScrollToDecisionId,
        appealsModalScrollToDecisionId,
        setAppealsModalScrollToDecisionId,
        clearDecisionsModalBootState,
        openDecisionsModalWithBoot,
    } = decisionsOrchestrator;

    /** تعبئة مسبقة`,
    );
}

// Seizure orchestrator — after focus refs
const seizureAnchor = '    const focusSeizureNoticeInlineRef = useRef<(decisionId: string, subject?: string) => void>(() => {});\n\n';
if (src.includes(seizureAnchor) && !src.includes('seizureOrchestrator')) {
    const seizureOrchestrator = `${seizureAnchor}    const seizureOrchestrator = useExecutionSeizureOrchestrator({
        executionData,
        executionId,
        decisionsStorageExecutionId,
        executionDataRef,
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
    });
    const {
        propertySeizureRequestModalOpen,
        setPropertySeizureRequestModalOpen,
        propertySeizureSubjectDraft,
        setPropertySeizureSubjectDraft,
        movableSeizureRequestModalOpen,
        setMovableSeizureRequestModalOpen,
        movableSeizureSubjectDraft,
        setMovableSeizureSubjectDraft,
        seizedPropertyStepModalOpen,
        setSeizedPropertyStepModalOpen,
        seizedPropertyStepDecisionId,
        setSeizedPropertyStepDecisionId,
        seizedPropertyStepPropertyId,
        setSeizedPropertyStepPropertyId,
        seizedPropertyStepEntityKind,
        setSeizedPropertyStepEntityKind,
        seizedPropertyStepKind,
        setSeizedPropertyStepKind,
        seizedPropertyExpertsNamesDraft,
        setSeizedPropertyExpertsNamesDraft,
        seizedPropertyExpertReportDateDraft,
        setSeizedPropertyExpertReportDateDraft,
        seizedPropertyExpertPriceDraft,
        setSeizedPropertyExpertPriceDraft,
        seizedPropertyAuctionDateDraft,
        setSeizedPropertyAuctionDateDraft,
        linkSeizureAuctionToAppointments,
        setLinkSeizureAuctionToAppointments,
        seizedPropertyBuyerNameDraft,
        setSeizedPropertyBuyerNameDraft,
        seizedPropertyAwardAmountDraft,
        setSeizedPropertyAwardAmountDraft,
        seizedPropertyStepNotesDraft,
        setSeizedPropertyStepNotesDraft,
        seizedPropertyAuctionResultModalOpen,
        setSeizedPropertyAuctionResultModalOpen,
        seizedPropertyAuctionResultPropertyId,
        setSeizedPropertyAuctionResultPropertyId,
        seizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultEntityKind,
        seizedPropertyAuctionResultOutcome,
        setSeizedPropertyAuctionResultOutcome,
        seizedPropertyAuctionResultBuyerNameDraft,
        setSeizedPropertyAuctionResultBuyerNameDraft,
        seizedPropertyAuctionResultAmountDraft,
        setSeizedPropertyAuctionResultAmountDraft,
        seizedPropertyAuctionDepositAmountDraft,
        setSeizedPropertyAuctionDepositAmountDraft,
        seizureMarkModalOpen,
        setSeizureMarkModalOpen,
        seizureMarkModalEntityKind,
        setSeizureMarkModalEntityKind,
        seizureMarkModalEntityId,
        setSeizureMarkModalEntityId,
        seizureMarkLetterNumberDraft,
        setSeizureMarkLetterNumberDraft,
        seizureMarkDateDraft,
        setSeizureMarkDateDraft,
        seizureMarkEntityDraft,
        setSeizureMarkEntityDraft,
        publicationModalOpen,
        setPublicationModalOpen,
        publicationModalEntityKind,
        setPublicationModalEntityKind,
        publicationModalEntityId,
        setPublicationModalEntityId,
        publicationNewspaperNameDraft,
        setPublicationNewspaperNameDraft,
        publicationDateYmdDraft,
        setPublicationDateYmdDraft,
        showRealEstateSeizureModal,
        setShowRealEstateSeizureModal,
        realEstateSeizureModalDecisionId,
        setRealEstateSeizureModalDecisionId,
        showGuarantorDetailsModal,
        setShowGuarantorDetailsModal,
        guarantorDetailsDecisionId,
        setGuarantorDetailsDecisionId,
        guarantorNameDraft,
        setGuarantorNameDraft,
        guarantorWorkplaceDraft,
        setGuarantorWorkplaceDraft,
        guarantorSalaryDraft,
        setGuarantorSalaryDraft,
        guarantorDeductionDraft,
        setGuarantorDeductionDraft,
        guarantorPanelExpanded,
        setGuarantorPanelExpanded,
        openGuarantorDetailsModal,
    } = seizureOrchestrator;

`;
    src = src.replace(seizureAnchor, seizureOrchestrator);

    // Remove inline seizure modal state through guarantor listener
    src = src.replace(
        /    const \[propertySeizureRequestModalOpen[\s\S]*?\}, \[executionData\?\.id, executionId, openGuarantorDetailsModal\]\);\n\n    const forcedBringDecisionState/,
        '    const forcedBringDecisionState',
    );
}

// Remove duplicate effects
src = src.replace(
    /\n    useEffect\(\(\) => \{\n        if \(!showUnifiedExecutionModal\) setFollowupSolidaryDebtorIndex\(0\);\n    \}, \[showUnifiedExecutionModal\]\);\n/,
    '\n',
);

src = src.replace(
    /\n    useEffect\(\(\) => \{\n        if \(!executionData\?\.id\) return;\n        setEvictionVacateDeadlineLocal\(executionData\.eviction_vacate_deadline[\s\S]*?executionData\?\.eviction_heirs_notification_date_ymd,\n    \]\);\n/,
    '\n',
);

src = src.replace(
    /\n    useEffect\(\(\) => \{\n        if \(!executionData\?\.id\) return;\n        setSummoningRound\(executionData\.summoningRound[\s\S]*?\}, \[executionFileKey\]\);\n/,
    '\n',
);

// Remove duplicate executionFileKey if script added twice at old location
src = src.replace(
    /\n    const executionFileKey = String\(file\?\.id \?\? executionId \?\? ''\);\n(?=    \/\*\* مزامنة لمرة واحدة)/,
    '\n',
);

fs.writeFileSync(hookPath, src);
console.log('wired orchestrators into useExecutionDashboardState.ts');
