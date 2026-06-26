import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { computeSeizureMatrix } from '@/app/utils/seizureMatrix';
import { SPECIAL_REQUEST_MANUAL_MODE } from '@/app/components/lawyer/ExecutionDashboard/components/requestsTabConstants';
import type { DossierActionType } from '@/app/components/lawyer/ExecutionDashboard/components/DossierActionsModal';
import type { AlimonyBeneficiaryProfile } from '@/app/utils/alimonyBeneficiaryDeathUtils';
import type { InlineActionGateKey } from '@/app/components/lawyer/ExecutionDashboard/types';
import { useFollowupSpecialRequestInit } from './useFollowupSpecialRequestInit';
import type { FollowupUnifiedModalTab } from '../followupModalTabTypes';

export type UseExecutionFollowupControllerParams = {
    showUnifiedExecutionModal: boolean;
    executionData: ExecutionFile | null | undefined;
    setExecutionModal: (key: 'showUnifiedExecutionModal', show: boolean) => void;
};

/** حالة محضر المتابعة + إخلاء + modals الجوار — خارج ExecutionDashboard */
export function useExecutionFollowupController({
    showUnifiedExecutionModal,
    executionData,
    setExecutionModal,
}: UseExecutionFollowupControllerParams) {
    const showUnifiedExecutionModalRef = useRef(showUnifiedExecutionModal);
    showUnifiedExecutionModalRef.current = showUnifiedExecutionModal;

    const seizureMatrixRef = useRef(
        computeSeizureMatrix({
            remainingBalanceIqd: 0,
            debtorJob: 'kasib',
            debtorType: 'natural_person',
        }),
    );
    const openSeizureRequestsTabRef = useRef<() => void>(() => {});
    const setShowUnifiedExecutionModal = useCallback(
        (show: boolean) => setExecutionModal('showUnifiedExecutionModal', show),
        [setExecutionModal],
    );

    const [unifiedModalTab, setUnifiedModalTab] = useState<FollowupUnifiedModalTab>('seizure_requests');
    const [specialRequestDate, setSpecialRequestDate] = useState('');
    const [specialRequestContent, setSpecialRequestContent] = useState('');
    const [specialRequestTemplatePick, setSpecialRequestTemplatePick] = useState(SPECIAL_REQUEST_MANUAL_MODE);
    const [specialRequestManualTitle, setSpecialRequestManualTitle] = useState('');
    const [specialRequestTemplateMenuOpen, setSpecialRequestTemplateMenuOpen] = useState(false);
    const specialRequestTemplateMenuRef = useRef<HTMLDivElement | null>(null);
    const [showStayOfExecutionModal, setShowStayOfExecutionModal] = useState(false);
    const [inlineActionGateKey, setInlineActionGateKey] = useState<InlineActionGateKey | null>(null);
    const [dossierActionModalOpen, setDossierActionModalOpen] = useState(false);
    const [dossierActionModalType, setDossierActionModalType] = useState<DossierActionType | null>(null);
    const [dossierActionModalSaving, setDossierActionModalSaving] = useState(false);
    const [executionDebtorTabIndex, setExecutionDebtorTabIndex] = useState(0);
    const [employeeCompulsoryBannerDismissed, setEmployeeCompulsoryBannerDismissed] = useState(false);
    const [showSolidaryCoerciveTargetModal, setShowSolidaryCoerciveTargetModal] = useState(false);
    const [solidaryCoerciveActionPending, setSolidaryCoerciveActionPending] = useState<string | null>(null);
    const [followupSolidaryDebtorIndex, setFollowupSolidaryDebtorIndex] = useState(0);
    const coerciveSubjectRef = useRef<{ id: string; name: string }>({ id: '', name: '' });
    const followupModalChipTablistRef = useRef<HTMLDivElement>(null);
    const followupModalDebtorTabsRef = useRef<HTMLDivElement>(null);
    const followupModalSectionTabsRef = useRef<HTMLDivElement>(null);
    const followupModalBodyScrollRef = useRef<HTMLDivElement>(null);
    const followupModalOpenGenerationRef = useRef(0);
    const debtorWorkspaceChipStripRef = useRef<HTMLDivElement>(null);
    const [partyDeathModalParty, setPartyDeathModalParty] = useState<'creditor' | 'debtor' | null>(null);
    const [partyDeathModalDecisionId, setPartyDeathModalDecisionId] = useState<string | null>(null);
    const [alimonyBeneficiaryDeathModalOpen, setAlimonyBeneficiaryDeathModalOpen] = useState(false);
    const [alimonyBeneficiaryDeathModalProfile, setAlimonyBeneficiaryDeathModalProfile] =
        useState<AlimonyBeneficiaryProfile | null>(null);
    const lastHeirSubRequestAtRef = useRef<{ creditor: number; debtor: number }>({
        creditor: 0,
        debtor: 0,
    });

    const [evictionVacateDeadlineLocal, setEvictionVacateDeadlineLocal] = useState<string | null>(null);
    const [evictionAssetsTabUnlocked, setEvictionAssetsTabUnlocked] = useState(false);
    const [evictionCaseExpenses, setEvictionCaseExpenses] = useState<
        Array<{ id: string; amount: number; note: string; date: string }>
    >([]);
    const [encroachmentCaseExpenses, setEncroachmentCaseExpenses] = useState<
        import('@/app/utils/unifiedFundsLedgerStorage').EncroachmentCaseExpenseRow[]
    >([]);
    const [specificDeliveryCaseExpenses, setSpecificDeliveryCaseExpenses] = useState<
        import('@/app/utils/specificDeliveryPropertyExpertRequest').SpecificDeliveryCaseExpenseRow[]
    >([]);
    const [evictionVacateDraft, setEvictionVacateDraft] = useState('');
    const [showEvictionExpenseModal, setShowEvictionExpenseModal] = useState(false);
    const [evictionExpenseAmount, setEvictionExpenseAmount] = useState('');
    const [evictionExpenseNote, setEvictionExpenseNote] = useState('');
    const [showHeirsNotificationModal, setShowHeirsNotificationModal] = useState(false);
    const [showVisitationCalendarModal, setShowVisitationCalendarModal] = useState(false);
    const [heirNoticeDateDrafts, setHeirNoticeDateDrafts] = useState<Record<string, string>>({});
    const [heirSummonsDatePickerOpenByHeir, setHeirSummonsDatePickerOpenByHeir] = useState<
        Record<string, boolean>
    >({});
    const [evictionExpensePayMode, setEvictionExpensePayMode] = useState<
        'salary_fifth' | 'lump_sum' | 'installments'
    >('lump_sum');
    const [showEvictionLawyerFeeModal, setShowEvictionLawyerFeeModal] = useState(false);
    const [lawyerFeeDisburseMode, setLawyerFeeDisburseMode] = useState<
        'salary_fifth' | 'lump_sum' | 'settlement'
    >('lump_sum');
    const [lawyerFeeDisburseNotes, setLawyerFeeDisburseNotes] = useState('');
    const [evictionExecutorVacateGrantApproved, setEvictionExecutorVacateGrantApproved] = useState(false);
    const [evictionResidentialGracePeriodStart, setEvictionResidentialGracePeriodStart] = useState<string | null>(
        null,
    );
    const [showEvictionResidentialGraceModal, setShowEvictionResidentialGraceModal] = useState(false);
    const [evictionGraceDecisionId, setEvictionGraceDecisionId] = useState<string | null>(null);
    const [graceModalStartYmd, setGraceModalStartYmd] = useState('');
    const [graceModalEndYmd, setGraceModalEndYmd] = useState('');
    const [graceModalAllowResave, setGraceModalAllowResave] = useState(false);
    const [evictionResidentialGraceManuallyEndedAt, setEvictionResidentialGraceManuallyEndedAt] = useState<
        string | null
    >(null);
    const [policeAssistanceModalOpen, setPoliceAssistanceModalOpen] = useState(false);
    const [followupExpandProcedureKey, setFollowupExpandProcedureKey] = useState<
        | 'field_visit'
        | 'police'
        | 'break_inventory'
        | 'marital_furniture_delivery'
        | 'custodian'
        | 'forced_eviction'
        | null
    >(null);
    const consumeFollowupExpandProcedure = useCallback(() => {
        setFollowupExpandProcedureKey(null);
    }, []);
    const [policeAssistanceDecisionId, setPoliceAssistanceDecisionId] = useState<string | null>(null);
    const [policeAssistanceRequestTitle, setPoliceAssistanceRequestTitle] = useState('');
    const [policeAssistanceAgencyDraft, setPoliceAssistanceAgencyDraft] = useState('');
    const [evictionHeirsNotificationDateYmd, setEvictionHeirsNotificationDateYmd] = useState('');
    const openEvictionExecutorCompletionRef = useRef<((decisionId: string) => void) | null>(null);

    useFollowupSpecialRequestInit({
        showUnifiedExecutionModal,
        unifiedModalTab,
        setSpecialRequestTemplatePick,
        setSpecialRequestContent,
        setSpecialRequestManualTitle,
        setSpecialRequestDate,
    });

    useEffect(() => {
        if (!showUnifiedExecutionModal) setFollowupSolidaryDebtorIndex(0);
    }, [showUnifiedExecutionModal]);

    useEffect(() => {
        if (!executionData?.id) return;
        setEvictionVacateDeadlineLocal(executionData.eviction_vacate_deadline ?? null);
        setEvictionAssetsTabUnlocked(!!executionData.eviction_assets_tab_unlocked);
        setEvictionCaseExpenses(
            Array.isArray(executionData.eviction_case_expenses) ? executionData.eviction_case_expenses : [],
        );
        setEncroachmentCaseExpenses(
            Array.isArray(executionData.encroachment_case_expenses)
                ? executionData.encroachment_case_expenses
                : [],
        );
        setSpecificDeliveryCaseExpenses(
            Array.isArray(
                (executionData as { specific_delivery_case_expenses?: unknown }).specific_delivery_case_expenses,
            )
                ? ((executionData as { specific_delivery_case_expenses?: import('@/app/utils/specificDeliveryPropertyExpertRequest').SpecificDeliveryCaseExpenseRow[] })
                      .specific_delivery_case_expenses as import('@/app/utils/specificDeliveryPropertyExpertRequest').SpecificDeliveryCaseExpenseRow[])
                : [],
        );
        const grant = executionData.eviction_executor_vacate_grant_approved;
        setEvictionExecutorVacateGrantApproved(grant === true);
        const vd = executionData.eviction_vacate_deadline;
        setEvictionVacateDraft(typeof vd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(vd) ? vd : '');
        const gs = executionData.eviction_residential_grace_period_start;
        setEvictionResidentialGracePeriodStart(
            typeof gs === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(gs) ? gs : null,
        );
        const me = executionData.eviction_residential_grace_manually_ended_at;
        setEvictionResidentialGraceManuallyEndedAt(typeof me === 'string' && me.trim() ? me.trim() : null);
        const hnd = executionData.eviction_heirs_notification_date_ymd;
        setEvictionHeirsNotificationDateYmd(
            typeof hnd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(hnd) ? hnd : '',
        );
    }, [
        executionData?.id,
        executionData?.eviction_vacate_deadline,
        executionData?.eviction_residential_grace_period_start,
        executionData?.eviction_executor_vacate_grant_approved,
        executionData?.eviction_residential_grace_manually_ended_at,
        executionData?.eviction_heirs_notification_date_ymd,
        executionData?.eviction_assets_tab_unlocked,
        executionData?.eviction_case_expenses,
        executionData?.encroachment_case_expenses,
        (executionData as { specific_delivery_case_expenses?: unknown })?.specific_delivery_case_expenses,
    ]);

    return {
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
    };
}
