import React, { useMemo, useState, useCallback, useEffect } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { guarantorFollowupAwaitingDetailsSave } from '@/app/types/execution';
import {
    appendExecutiveDetentionJudgeDecision,
    appendPersonalCoerciveByExecutorOrder,
    appendPersonalCoerciveExecutorRequest,
    archiveExecutiveDetentionCycleDecisions,
    closePersonalCoerciveSubtypeDecisionCycle,
    DECISIONS_RELOAD_EVENT,
    dispatchDecisionsReload,
    hasActivePersonalCoerciveSubtypeCard,
    hasActivePersonalCoerciveSubtypeCardFromDecisions,
    resolvePersonalCoerciveDecisionsNav,
    resolvePersonalCoerciveDecisionsNavFromDecisions,
    resolveExecutorDecisionRowContext,
    isGuarantorRequestDecisionRow,
    patchExecutorDecisionRow,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getGoverningDossierPresentationRowFromDecisions,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    readExecutorDecisionsUnionAcrossCandidateIds,
    warmExecutorDecisionsStorage,
} from '@/app/utils/executionDecisionsNamespace';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { formatDateToLocalYmd, getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { isDebtorNotifiedForCoerciveActions } from '@/app/utils/noticeDebtorScope';
import {
    buildDebtorTravelBanActivePatch,
    buildDebtorTravelBanCycleWithdrawnPatch,
    buildDebtorTravelBanWithdrawnPatch,
    isDebtorTravelBanActive,
    isDebtorTravelBanCycleWithdrawn,
    isDebtorTravelBanWithdrawn,
    resolveDebtorDisplayNameForKey,
} from '@/app/utils/coerciveDebtorScope';
import {
    isExecutiveDetentionPeriodActive,
    isForcedBringCycleResolved,
    buildInvestigationCourtWithdrawExecutionPatch,
    buildForcedBringLifecycleRestartBase,
    buildForcedBringPersonalOutcomePatch,
    buildInvestigationDebtorAttendedPatch,
    buildInvestigationWarrantIssuedPatch,
    buildInvestigationSecuredBringPatch,
    isPersonalCoerciveCycleClosed,
    appendImplicitForcedBringBroughtPatch,
    buildExecutiveDetentionReleasePatch,
    buildExecutiveDetentionJudgeRejectedClosurePatch,
    resolveExecutiveDetentionJudgeUiOutcome,
    resolveForcedBringNeedsOutcomeUi,
    shouldShowInvestigationCourtBlock,
    type ForcedBringPersonalOutcome,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import {
    buildPersonalCoerciveExecutionMerge,
    syncPersonalCoerciveWithdrawn,
} from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import { resolveExecutorRequestFollowupBlockFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    buildPersonalCoerciveAppealExecutionSyncPatch,
    isExecutorRejectedAppealFollowupDismissed,
    resolveAllPersonalCoerciveAppealSync,
    type PersonalCoerciveAppealSyncView,
} from '@/app/utils/personalCoerciveAppealSync';
import {
    ExecutorRequestFollowupBlockPanel,
    WaiveInitialAppealButton,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import type { HiddenPersonalCoerciveRequestKey } from '@/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils';
import { isCustodyRemovalExecutionClaim } from '@/app/utils/executionClaimIsolation';
import { appealSyncForRequestSubtype } from '../utils/appealSyncMap';
import { coerciveOutcomeFromDecisionRow } from '../utils/coerciveOutcomeFromDecisionRow';
import { CoerciveSubsectionFold } from '../chrome/CoerciveSubsectionFold';
import type { PersonalCoerciveFollowupPanelProps } from '../types';

export type PersonalCoercivePanelState = ReturnType<typeof usePersonalCoercivePanelState>;

export function usePersonalCoercivePanelState(props: PersonalCoerciveFollowupPanelProps) {
    const {
        executionId,
        decisionsReloadEpoch,
        coerciveUiLocked,
        gracePeriodEndedFlag,
        forcedSummonAllowed,
        forcedSummonLockReason,
        executionData,
        debtorPresentEffective,
        debtRemainingIqd,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        showToast,
        onOpenDecisions,
        onOpenSummonsCenter,
        onGuarantorRequest,
        onOpenGuarantorDetails,
        kasabCoerciveEmphasis,
        kasabRelaxedGates,
        activeDebtorKey,
        primaryDebtorKey,
        isHistoricalMode,
        hideDossierJudgePresentation,
        hideExecutiveDetentionJudgeCard,
        earnerFinancialPersonalCoerciveActive,
        hideExecutorForcedBringActivation,
        activeDebtorIsEmployee,
        embeddedHiddenPath,
    } = props;

    /** الافتراضي: احترام التسلسل القانوني؛ الاسترخاء اختياري ومحدود من المستدعي */
    const relaxedPersonal = kasabRelaxedGates;

    const custodyRemovalClaimActive = useMemo(
        () => isCustodyRemovalExecutionClaim(executionData as Record<string, unknown> | null | undefined),
        [executionData]
    );
    const employeeDetentionRestricted = activeDebtorIsEmployee && !custodyRemovalClaimActive;

    const showEmbeddedSection = useCallback(
        (key: HiddenPersonalCoerciveRequestKey) =>
            !embeddedHiddenPath || embeddedHiddenPath === key,
        [embeddedHiddenPath]
    );

    type ActionGateKey =
        | 'forced_bring_in'
        | 'arrest_warrant_investigation'
        | 'travel_ban'
        | 'travel_ban_withdraw'
        | 'executive_dossier_presentation'
        | 'release_debtor';
    const [confirmingKey, setConfirmingKey] = useState<ActionGateKey | null>(null);
    const [sendingKey, setSendingKey] = useState<ActionGateKey | null>(null);
    const [forcedOutcomePick, setForcedOutcomePick] = useState<ForcedBringPersonalOutcome | ''>('');
    /** تحديث فوري للواجهة قبل اكتمال tick التخزين */
    const [optimisticForcedOutcome, setOptimisticForcedOutcome] = useState<ForcedBringPersonalOutcome | null>(
        null,
    );
    /** تحديث فوري لحقول الملف قبل اكتمال tick التخزين/العرض */
    const [optimisticPersistPatch, setOptimisticPersistPatch] = useState<Record<string, unknown> | null>(
        null,
    );
    const [localDecisionsTick, setLocalDecisionsTick] = useState(0);
    const [detentionRejectionOpen, setDetentionRejectionOpen] = useState(false);
    const [detentionRejectionReason, setDetentionRejectionReason] = useState('');
    const [detentionRejectionSaving, setDetentionRejectionSaving] = useState(false);
    const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false);
    const [releaseConfirmBusy, setReleaseConfirmBusy] = useState(false);
    const [releaseReason, setReleaseReason] = useState('');
    const [releaseReasonOpen, setReleaseReasonOpen] = useState(false);
    const [forcedBringWithdrawConfirmOpen, setForcedBringWithdrawConfirmOpen] = useState(false);
    const [forcedBringWithdrawBusy, setForcedBringWithdrawBusy] = useState(false);
    const [judgeDetailsOpen, setJudgeDetailsOpen] = useState(false);
    const [travelPanelOpen, setTravelPanelOpen] = useState(false);
    const [optionalRemainingProceduresOpen, setOptionalRemainingProceduresOpen] = useState(false);
    React.useEffect(() => {
        if (!embeddedHiddenPath) return;
        if (embeddedHiddenPath === 'executive_detention_judge') setJudgeDetailsOpen(true);
    }, [embeddedHiddenPath]);
    /** انتقال فوري بعد موافقة/رفض المنفذ من المحضر — قبل إعادة قراءة التخزين */
    const [forcedInlineResolved, setForcedInlineResolved] = useState<'approved' | 'rejected' | null>(
        null
    );
    const [dossierInlineResolved, setDossierInlineResolved] = useState<'approved' | 'rejected' | null>(
        null
    );
    /** مفتاح تخزين القرارات — يفضّل executionId المُمرَّر (الإضبارة الأصلية) على id الملف المعروض */

    return {
        confirmingKey,
        custodyRemovalClaimActive,
        detentionRejectionOpen,
        detentionRejectionReason,
        detentionRejectionSaving,
        dossierInlineResolved,
        employeeDetentionRestricted,
        forcedBringWithdrawBusy,
        forcedBringWithdrawConfirmOpen,
        forcedInlineResolved,
        forcedOutcomePick,
        judgeDetailsOpen,
        localDecisionsTick,
        optimisticForcedOutcome,
        optimisticPersistPatch,
        optionalRemainingProceduresOpen,
        relaxedPersonal,
        releaseConfirmBusy,
        releaseConfirmOpen,
        releaseReason,
        releaseReasonOpen,
        sendingKey,
        setConfirmingKey,
        setDetentionRejectionOpen,
        setDetentionRejectionReason,
        setDetentionRejectionSaving,
        setDossierInlineResolved,
        setForcedBringWithdrawBusy,
        setForcedBringWithdrawConfirmOpen,
        setForcedInlineResolved,
        setForcedOutcomePick,
        setJudgeDetailsOpen,
        setLocalDecisionsTick,
        setOptimisticForcedOutcome,
        setOptimisticPersistPatch,
        setOptionalRemainingProceduresOpen,
        setReleaseConfirmBusy,
        setReleaseConfirmOpen,
        setReleaseReason,
        setReleaseReasonOpen,
        setSendingKey,
        setTravelPanelOpen,
        showEmbeddedSection,
        travelPanelOpen,
    };
}
