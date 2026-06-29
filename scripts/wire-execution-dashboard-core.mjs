/**
 * يربط modal controls + orchestrators في useExecutionDashboardCore
 * node scripts/wire-execution-dashboard-core.mjs
 */
import fs from 'fs';

const hookPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let src = fs.readFileSync(hookPath, 'utf8');

// ── Modal controls (useShallow) ──
if (!src.includes('useExecutionDashboardModalControls')) {
    src = src.replace(
        "import type { ExecutionDashboardProps } from '../types';",
        `import { useExecutionDashboardModalControls } from './useExecutionDashboardModalControls';
import type { ExecutionDashboardProps } from '../types';`,
    );

    const oldModals = `    // 🚀 V11.0: نوافذ التنفيذ — مصدر واحد: Zustand (مفاتيح show*Modal)
    const modals = useExecutionDashboardStore((s) => s.modals) as ModalStates;
    const closeAllModals = useExecutionDashboardStore((s) => s.closeAllModals);
    const resetUIPanelsForExecutionContext = useExecutionDashboardStore(
        (s) => s.resetUIPanelsForExecutionContext
    );
    const activeBottomTab = useExecutionDashboardStore((s) => s.ui.activeBottomTab);
    const isHeaderExpanded = useExecutionDashboardStore((s) => s.ui.isHeaderExpanded);
    const toggleHeaderExpanded = useExecutionDashboardStore((s) => s.toggleHeaderExpanded);

    const setExecutionModal = useCallback((key: keyof ModalStates, show: boolean) => {
        const { openModal, closeModal } = useExecutionDashboardStore.getState();
        if (show) openModal(key);
        else closeModal(key);
    }, []);

    const executionDashboardFileId = executionData?.id ?? null;
    useEffect(() => {
        closeAllModals();
        resetUIPanelsForExecutionContext();
    }, [executionDashboardFileId, closeAllModals, resetUIPanelsForExecutionContext]);

    useEffect(() => {
        return () => {
            const st = useExecutionDashboardStore.getState();
            st.closeAllModals();
            st.resetUIPanelsForExecutionContext();
        };
    }, []);`;

    const newModals = `    const executionDashboardFileId = executionData?.id ?? null;
    const {
        modals,
        setExecutionModal,
        activeBottomTab,
        isHeaderExpanded,
        toggleHeaderExpanded,
    } = useExecutionDashboardModalControls(executionDashboardFileId);`;

    if (!src.includes(oldModals)) throw new Error('modal controls block not found');
    src = src.replace(oldModals, newModals);
}

// ── executionFileKey مبكراً للـ orchestrators ──
if (!src.includes('const executionFileKey = String(file?.id ?? executionId ?? \'\');')) {
    src = src.replace(
        "    const currentFileId = parentDossierId || executionId || file?.id || '';",
        `    const currentFileId = parentDossierId || executionId || file?.id || '';
    const executionFileKey = String(file?.id ?? executionId ?? '');`,
    );
}

const orchImport = `import {
    useExecutionCoercionOrchestrator,
    useExecutionDecisionsOrchestrator,
    useExecutionFollowupOrchestrator,
    useExecutionSeizureOrchestrator,
    useExecutionDossierLifecyclePanelOrchestrator,
    useExecutionDossierTabOrchestrator,
    useExecutionFinancialOrchestrator,
    useExecutionPartiesOrchestrator,
} from '../orchestrators';
`;

if (!src.includes('useExecutionFollowupOrchestrator')) {
    src = src.replace(
        "import { useExecutionDashboardModalControls } from './useExecutionDashboardModalControls';",
        `import { useExecutionDashboardModalControls } from './useExecutionDashboardModalControls';\n${orchImport}`,
    );
}

// ── Domain orchestrators (tabs, parties, financial, lifecycle) ──
if (!src.includes('useExecutionDossierTabOrchestrator(')) {
    src = src.replace(
        /    \/\*\* 🆕 التبويبات \(Parent-Child\)[\s\S]*?    \}, \[currentFileId\]\);\n\n    const baseExecutionData/,
        `    /** 🆕 التبويبات (Parent-Child) — orchestrator */
    const { activeTabId, setActiveTabId } = useExecutionDossierTabOrchestrator(String(currentFileId || ''));

    const baseExecutionData`,
    );
}

if (!src.includes('useExecutionPartiesOrchestrator(')) {
    src = src.replace(
        /    \/\*\* عند >2 دائن\/مدين: إظهار أول اثنين فقط حتى يضغط المستخدم لعرض الباقي \*\/\n    const \[showExtraCreditors, setShowExtraCreditors\] = useState\(false\);\n    const \[showExtraDebtors, setShowExtraDebtors\] = useState\(false\);\n\n/,
        `    const {
        showExtraCreditors,
        setShowExtraCreditors,
        showExtraDebtors,
        setShowExtraDebtors,
    } = useExecutionPartiesOrchestrator(executionFileKey);

`,
    );
}

if (!src.includes('useExecutionDossierLifecyclePanelOrchestrator(')) {
    src = src.replace(
        /    const \[dossierStatusDraft, setDossierStatusDraft\] = useState<DossierLifecycleStatus>\('active'\);[\s\S]*?    \} \| null>\(null\);\n    const \[showExecutionTrashModal/,
        `    const {
        dossierStatusDraft,
        setDossierStatusDraft,
        dossierReasonDraft,
        setDossierReasonDraft,
        dossierDateDraft,
        setDossierDateDraft,
        dossierLifecyclePanelOpen,
        setDossierLifecyclePanelOpen,
        dossierLifecyclePanelPhase,
        setDossierLifecyclePanelPhase,
        dossierPendingStatus,
        setDossierPendingStatus,
        dossierLifecyclePopoverRef,
        dossierLifecyclePanelPortalRef,
        dossierLifecyclePopStyle,
        setDossierLifecyclePopStyle,
        closeDossierLifecyclePanel,
    } = useExecutionDossierLifecyclePanelOrchestrator(executionData);

    const [showExecutionTrashModal`,
    );
}

if (!src.includes('useExecutionFinancialOrchestrator(')) {
    src = src.replace(
        /    \/\/ 🆕 V10\.8: ACCORDION STATES \(moved from line 484\+\)\n    const \[isFinancialCenterExpanded[\s\S]*?    \}, \[\]\);\n\n    useEffect\(\(\) => \{\n        const handler = \(e: Event\) => \{\n            const ce = e as CustomEvent<\{ executionId\?: string; decisionId\?: string; tab\?: string \}>/,
        `    const {
        isFinancialCenterExpanded,
        setIsFinancialCenterExpanded,
        activeFinancialTab,
        setActiveFinancialTab,
        showExecutionFinancialHub,
        setShowExecutionFinancialHub,
        financialHubAutoOpenMode,
        setFinancialHubAutoOpenMode,
        financialHubSeizedMovableId,
        setFinancialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        setFinancialHubSeizedPropertyId,
        openFinancialHubLedger,
    } = useExecutionFinancialOrchestrator({ setShowUnifiedExecutionModal });

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string; tab?: string }>`,
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

src = src.replace(
    /\n    \/\/ 🆕 V9: UNIFIED SUMMONS HUB STATE[\s\S]*?    const \[summonsHubInitialMainTab[\s\S]*?\}, \[setExecutionModal\]\);\n\n    (const coercionOrchestrator|\/\/ 🆕 V9: COERCION)/,
    `\n    // 🆕 V9: UNIFIED SUMMONS HUB STATE
    const showUnifiedSummonsModal = modals.showUnifiedSummonsModal;
    const setShowUnifiedSummonsModal = (show: boolean) => setExecutionModal('showUnifiedSummonsModal', show);
    
    $1`,
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

// Seizure orchestrator
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

    // يزيل فقط state المكرر للـ modals — لا يمسّ registry/toast/decisions
    src = src.replace(
        /    const \[propertySeizureRequestModalOpen[\s\S]*?openGuarantorDetailsModal,\n    \} = seizureOrchestrator;\n\n    const approvedSeizedAssets/,
        `${seizureOrchestrator}    const approvedSeizedAssets`,
    );
    if (!src.includes('seizureOrchestrator')) {
        src = src.replace(
            /    const \[propertySeizureRequestModalOpen[\s\S]*?\}, \[executionData\?\.id, executionId, openGuarantorDetailsModal\]\);\n\n    const approvedSeizedAssets/,
            `    const approvedSeizedAssets`,
        );
    }
}

// duplicate cleanup
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
src = src.replace(
    /\n    const executionFileKey = String\(file\?\.id \?\? executionId \?\? ''\);\n(?=    \/\*\* مزامنة)/,
    '\n',
);

// decisions modal handler → openDecisionsModalWithBoot
const oldHandler = `            const boot = resolveDecisionsModalBootState(
                tab || did ? { tab: tab ?? null, decisionId: did } : undefined
            );
            setDecisionsModalBootHubTab(boot.hubTab);
            setDecisionsModalBootListTab(boot.listTab);
            setDecisionsModalScrollToDecisionId(boot.scrollDecisionId);
            setAppealsModalScrollToDecisionId(boot.scrollAppealId);
            setShowDecisionsModal(true);`;
const newHandler = `            openDecisionsModalWithBoot(
                tab || did ? { tab: tab ?? undefined, decisionId: did } : undefined,
            );`;
if (src.includes(oldHandler)) {
    src = src.replace(oldHandler, newHandler);
}

// إزالة تكرار closeDossierLifecyclePanel + effects بعد ربط panel orchestrator
src = src.replace(
    /\n    const closeDossierLifecyclePanel = useCallback\(\(\) => \{\n        setDossierLifecyclePanelOpen\(false\);\n        setDossierLifecyclePanelPhase\('menu'\);\n        setDossierPendingStatus\(null\);\n    \}, \[\]\);\n\n    const handleDossierLifecyclePick/,
    '\n    const handleDossierLifecyclePick',
);
src = src.replace(
    /\n    useEffect\(\(\) => \{\n        if \(!dossierLifecyclePanelOpen\) return;\n        const onDocMouseDown = \(e: MouseEvent\) => \{[\s\S]*?\}, \[dossierLifecyclePanelOpen, closeDossierLifecyclePanel\]\);\n\n    useEffect\(\(\) => \{\n        if \(!dossierLifecyclePanelOpen\) return;\n        const onKey = \(e: KeyboardEvent\) => \{[\s\S]*?\}, \[dossierLifecyclePanelOpen, closeDossierLifecyclePanel\]\);\n\n    useLayoutEffect\(\(\) => \{\n        if \(!dossierLifecyclePanelOpen\) \{[\s\S]*?\}, \[dossierLifecyclePanelOpen, dossierLifecyclePanelPhase, dossierStatusDraft\]\);\n\n    const \{\n        showEditDossierMetaModal/,
    '\n\n    const {\n        showEditDossierMetaModal',
);

fs.writeFileSync(hookPath, src);
console.log('[wire-execution-dashboard-core] lines', src.split('\n').length);
