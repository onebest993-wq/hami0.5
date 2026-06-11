import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { UserX, Plane, ShieldAlert, Gavel, X, ChevronDown, Unlock, Send, Scale } from 'lucide-react';
import { RejectedExecutorResubmitStrip } from '@/app/components/lawyer/execution/RejectedExecutorResubmitStrip';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { guarantorFollowupAwaitingDetailsSave } from '@/app/types/execution';
import {
    appendExecutiveDetentionJudgeDecision,
    appendPersonalCoerciveByExecutorOrder,
    appendPersonalCoerciveExecutorRequest,
    archiveExecutiveDetentionCycleDecisions,
    closePersonalCoerciveSubtypeDecisionCycle,
    DECISIONS_RELOAD_EVENT,
    dispatchDecisionsReload,
    getDossierPresentationOutcome,
    getGuarantorRequestOutcome,
    getGoverningDossierPresentationRow,
    getGoverningPersonalCoerciveSubtypeRow,
    getPersonalCoerciveSubtypeOutcome,
    hasActivePersonalCoerciveSubtypeCard,
    resolvePersonalCoerciveDecisionsNav,
    resolveExecutorDecisionRowContext,
    isGuarantorRequestDecisionRow,
    patchExecutorDecisionRow,
    readExecutorDecisionsArray,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import { formatDateToLocalYmd, getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { isDebtorNotifiedForCoerciveActions } from '@/app/utils/noticeDebtorScope';
import { CryptoService } from '@/app/services/CryptoService';
import {
    isExecutiveDetentionPeriodActive,
    isForcedBringCycleResolved,
    isInvestigationCourtWithdrawn,
    resolveForcedBringNeedsOutcomeUi,
    isPersonalCoerciveCycleClosed,
    appendImplicitForcedBringBroughtPatch,
    isTravelBanLaneSettled,
    isTravelBanRequestWithdrawn,
    resolveExecutiveDetentionJudgeUiOutcome,
    shouldShowInvestigationCourtBlock,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import {
    buildPersonalCoerciveExecutionMerge,
    syncPersonalCoerciveWithdrawn,
} from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import { resolveExecutorRequestFollowupBlockFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    buildPersonalCoerciveAppealExecutionSyncPatch,
    resolveAllPersonalCoerciveAppealSync,
    type PersonalCoerciveAppealSyncSubtype,
    type PersonalCoerciveAppealSyncView,
} from '@/app/utils/personalCoerciveAppealSync';
import {
    ExecutorRequestFollowupBlockPanel,
    WaiveInitialAppealButton,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import type { HiddenPersonalCoerciveRequestKey } from '@/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils';

export interface PersonalCoerciveFollowupPanelProps {
    executionId: string | undefined;
    decisionsReloadEpoch: number;
    coerciveUiLocked: boolean;
    /** مهلة الإخبار انتهت أو مسار جاهز للإجراءات الجبرية */
    gracePeriodEndedFlag: boolean;
    /** يُسمح بمسار الإحضار الجبري وفق محرك الحصانة */
    forcedSummonAllowed: boolean;
    forcedSummonLockReason?: string;
    executionData: ExecutionFile | null;
    debtorPresentEffective: boolean;
    debtRemainingIqd: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (e: TimelineEvent) => void;
    nextTimelineId: () => string;
    showToast: (
        msg: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: {
            decisionsLink?: boolean;
            decisionsTab?: 'current' | 'previous' | 'appeals';
            decisionId?: string;
            action?: { label: string; onClick: () => void };
        }
    ) => void;
    onOpenDecisions: (opts?: { tab?: 'current' | 'previous' | 'appeals'; decisionId?: string | null }) => void;
    onOpenSummonsCenter: () => void;
    /** طلب كفيل ضامن — يُسجَّل لدى منفذ العدل للبتّ */
    onGuarantorRequest?: () => void;
    /** فتح واجهة إكمال بيانات الكفيل (شارة المدين) بعد موافقة المنفذ دون حفظ */
    onOpenGuarantorDetails?: () => void;
    /** بعد إنهاء وظيفة — إبراز إجراءات الإكراه المقترحة */
    kasabCoerciveEmphasis?: boolean;
    /**
     * للمدين الكاسب فقط: فتح مسارات الإحضار/المفاتحة/الحبس دون انتظار مهلة إخبار أو محرك الحصانة.
     * لا يؤثر على مسار الموظف.
     */
    kasabRelaxedGates?: boolean;
    /** مفتاح المدين النشط في الذمة المقسومة */
    activeDebtorKey?: string;
    /** مفتاح المدين الأساسي للتوافق مع الطلبات القديمة */
    primaryDebtorKey?: string;
    /** معاينة تاريخية — تعطيل أزرار الإكراه والطلبات */
    isHistoricalMode?: boolean;
    /** استحصال مالي + موظف: إخفاء عرض الإضبارة على قاضي البداءة وقرار الحبس */
    hideDossierJudgePresentation?: boolean;
    /** استحصال مالي + موظف: إخفاء تفعيل الإحضار بقرار المنفذ */
    hideExecutorForcedBringActivation?: boolean;
    /** المدين موظف — لا مفاتحة تحقيق ولا عرض إضبارة ولا حبس */
    activeDebtorIsEmployee?: boolean;
    /** من الطلبات المخفية — إظهار مسار واحد فقط بنفس دورة الحياة الكاملة */
    embeddedHiddenPath?: HiddenPersonalCoerciveRequestKey;
}

const BTN_BASE =
    'w-full text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] relative z-10 cursor-pointer active:scale-[0.99]';
const BTN_DISABLED = 'opacity-45 cursor-not-allowed hover:border-white/5';

const APPEAL_SYNC_REQUEST_MAP: Partial<Record<PersonalCoerciveSubtype, PersonalCoerciveAppealSyncSubtype>> = {
    forced_bring_in: 'forced_bring_in',
    travel_ban: 'travel_ban',
    arrest_warrant_investigation: 'arrest_warrant_investigation',
    executive_dossier_presentation: 'executive_dossier_presentation',
};

function appealSyncForRequestSubtype(
    all: Record<PersonalCoerciveAppealSyncSubtype, PersonalCoerciveAppealSyncView>,
    subtype: PersonalCoerciveSubtype
): PersonalCoerciveAppealSyncView | null {
    const key = APPEAL_SYNC_REQUEST_MAP[subtype];
    return key ? all[key] : null;
}

/** فوق غلاف محضر المتابعة (280) — يمنع تسرّب النقرات للإجراءات خلف النافذة */
const PERSONAL_COERCIVE_PORTAL_Z = EXEC_MODAL_Z.nestedOverFollowUpPortal;

function PersonalCoerciveFollowUpPortal(props: {
    open: boolean;
    onDismiss: () => void;
    children: React.ReactNode;
    dismissDisabled?: boolean;
}) {
    const { open, onDismiss, children, dismissDisabled = false } = props;
    if (!open || typeof document === 'undefined') return null;
    return createPortal(
        <div
            className={`fixed inset-0 flex items-center justify-center p-4 pointer-events-auto ${EXEC_MODAL_BACKDROP_STRONG}`}
            style={{ zIndex: PERSONAL_COERCIVE_PORTAL_Z }}
            role="presentation"
            onMouseDown={(e) => {
                if (dismissDisabled) return;
                if (e.target === e.currentTarget) onDismiss();
            }}
            onKeyDown={(e) => {
                if (dismissDisabled) return;
                if (e.key === 'Escape') onDismiss();
            }}
        >
            {children}
        </div>,
        document.body
    );
}

/** طي داخلي مسطح — بدون إطار مزدوج داخل الحاوية البنفسجية */
function CoerciveSubsectionFold({
    title,
    defaultOpen = true,
    flat = false,
    titleClassName = 'text-rose-200',
    children,
}: {
    title: string;
    defaultOpen?: boolean;
    /** عرض مسطح دون سهم طي إضافي داخل الحاوية المفتوحة */
    flat?: boolean;
    titleClassName?: string;
    children: React.ReactNode;
}) {
    if (flat) {
        return (
            <div className="border-t border-white/10 text-right first:border-t-0">
                <p className={`px-1 py-2.5 text-[11px] font-black text-right ${titleClassName}`}>{title}</p>
                <div className="space-y-2 px-1 pb-2">{children}</div>
            </div>
        );
    }
    return (
        <details className="group/sub border-t border-white/10 text-right first:border-t-0" open={defaultOpen}>
            <summary className="flex cursor-pointer list-none flex-row-reverse items-center justify-between gap-2 px-1 py-2.5 transition-colors hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                <span className={`text-[11px] font-black text-right ${titleClassName}`}>{title}</span>
                <ChevronDown
                    size={16}
                    className="shrink-0 text-slate-400 transition-transform duration-200 group-open/sub:rotate-180"
                    aria-hidden
                />
            </summary>
            <div className="space-y-2 px-1 pb-2">{children}</div>
        </details>
    );
}

const COERCIVE_SECTION_DETAILS_CLASS =
    'group overflow-hidden rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right transition-all duration-300 open:border-violet-400/40';

export const PersonalCoerciveFollowupPanel: React.FC<PersonalCoerciveFollowupPanelProps> = ({
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
    kasabCoerciveEmphasis = false,
    kasabRelaxedGates = false,
    activeDebtorKey = 'primary_debtor',
    primaryDebtorKey = 'primary_debtor',
    isHistoricalMode = false,
    hideDossierJudgePresentation = false,
    hideExecutorForcedBringActivation = false,
    activeDebtorIsEmployee = false,
    embeddedHiddenPath,
}) => {
    /** الافتراضي: احترام التسلسل القانوني؛ الاسترخاء اختياري ومحدود من المستدعي */
    const relaxedPersonal = kasabRelaxedGates;

    const showEmbeddedSection = useCallback(
        (key: HiddenPersonalCoerciveRequestKey) =>
            !embeddedHiddenPath || embeddedHiddenPath === key,
        [embeddedHiddenPath]
    );

    type ActionGateKey =
        | 'forced_bring_in'
        | 'arrest_warrant_investigation'
        | 'travel_ban'
        | 'executive_dossier_presentation'
        | 'release_debtor';
    const [confirmingKey, setConfirmingKey] = useState<ActionGateKey | null>(null);
    const [sendingKey, setSendingKey] = useState<ActionGateKey | null>(null);
    const [forcedOutcomePick, setForcedOutcomePick] = useState<'brought' | 'absconded' | ''>('');
    const [localDecisionsTick, setLocalDecisionsTick] = useState(0);
    const [detentionRejectionOpen, setDetentionRejectionOpen] = useState(false);
    const [detentionRejectionReason, setDetentionRejectionReason] = useState('');
    const [detentionRejectionSaving, setDetentionRejectionSaving] = useState(false);
    const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false);
    const [releaseConfirmBusy, setReleaseConfirmBusy] = useState(false);
    const [forcedBringWithdrawConfirmOpen, setForcedBringWithdrawConfirmOpen] = useState(false);
    const [forcedBringWithdrawBusy, setForcedBringWithdrawBusy] = useState(false);
    const [dossierDetailsOpen, setDossierDetailsOpen] = useState(false);
    const [judgeDetailsOpen, setJudgeDetailsOpen] = useState(false);
    const [travelDetailsOpen, setTravelDetailsOpen] = useState(false);
    React.useEffect(() => {
        if (!embeddedHiddenPath) return;
        if (embeddedHiddenPath === 'travel_ban') setTravelDetailsOpen(true);
        if (embeddedHiddenPath === 'executive_dossier_presentation') setDossierDetailsOpen(true);
        if (embeddedHiddenPath === 'executive_detention_judge') setJudgeDetailsOpen(true);
    }, [embeddedHiddenPath]);
    /** انتقال فوري بعد موافقة/رفض المنفذ من المحضر — قبل إعادة قراءة التخزين */
    const [forcedInlineResolved, setForcedInlineResolved] = useState<'approved' | 'rejected' | null>(
        null
    );
    const detentionDetailsRef = React.useRef<HTMLDetailsElement>(null);

    /** مفتاح تخزين القرارات — يفضّل executionId المُمرَّر (الإضبارة الأصلية) على id الملف المعروض */
    const exId = String(executionId ?? executionData?.id ?? '').trim();
    const exKey = exId || undefined;
    const debtorScopeOpts = useMemo(
        () => ({ debtorKey: activeDebtorKey, primaryDebtorKey }),
        [activeDebtorKey, primaryDebtorKey]
    );
    const decisionsNavForSubtype = useCallback(
        (subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype']) =>
            resolvePersonalCoerciveDecisionsNav(exKey, subtype, debtorScopeOpts),
        [debtorScopeOpts, exKey]
    );
    const hasOpenCardForSubtype = useCallback(
        (subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype']) =>
            hasActivePersonalCoerciveSubtypeCard(exKey, subtype, debtorScopeOpts),
        [debtorScopeOpts, exKey]
    );
    const debtorNotified = useMemo(
        () =>
            isDebtorNotifiedForCoerciveActions(
                executionData,
                activeDebtorKey,
                primaryDebtorKey,
            ),
        [executionData, activeDebtorKey, primaryDebtorKey],
    );
    const debtorTimelineMeta = useMemo(
        () => timelineDebtorMetadata(activeDebtorKey),
        [activeDebtorKey]
    );
    const coerciveDecisionStates = useMemo(
        () => ({
            forced: getPersonalCoerciveSubtypeOutcome(exKey, 'forced_bring_in', {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
            arrest: getPersonalCoerciveSubtypeOutcome(exKey, 'arrest_warrant_investigation', {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
            travel: getPersonalCoerciveSubtypeOutcome(exKey, 'travel_ban', {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
            dossier: getDossierPresentationOutcome(exKey, {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
            guarantor: getGuarantorRequestOutcome(exKey),
        }),
        [exKey, decisionsReloadEpoch, localDecisionsTick, activeDebtorKey, primaryDebtorKey]
    );

    const coerciveWriteLocked = coerciveUiLocked || isHistoricalMode;

    const forced = coerciveDecisionStates.forced;
    const forcedEffective = useMemo(
        () => ({
            pending: forced.pending && forcedInlineResolved !== 'approved',
            approved: forced.approved || forcedInlineResolved === 'approved',
            rejected: forced.rejected || forcedInlineResolved === 'rejected',
            alternative: forced.alternative,
        }),
        [forced, forcedInlineResolved]
    );
    const arrest = coerciveDecisionStates.arrest;
    const travel = coerciveDecisionStates.travel;
    const dossier = coerciveDecisionStates.dossier;
    const dossierPhase = executionData?.executive_dossier_phase ?? null;
    const fullPersonalCoerciveCycleClosed = isPersonalCoerciveCycleClosed(executionData);
    const detentionReleasedAt = String(
        executionData?.executive_detention_released_or_closed_at ?? ''
    ).trim();
    /** انتهاء مسار الحبس/عرض الإضبارة فقط — لا يمسح إحضاراً أو منع سفر أو مفاتحة */
    const detentionLaneEnded =
        fullPersonalCoerciveCycleClosed || Boolean(detentionReleasedAt);
    const guarantorDec = coerciveDecisionStates.guarantor;
    const guarantorAwaitingSave = guarantorFollowupAwaitingDetailsSave(executionData?.guarantor_followup);

    const allDecisionRows = useMemo(
        () => readExecutorDecisionsArray(exId),
        [exId, decisionsReloadEpoch, localDecisionsTick]
    );

    const appealSync = useMemo(
        () =>
            resolveAllPersonalCoerciveAppealSync({
                executionId: exId,
                allDecisions: allDecisionRows,
                executionData: executionData as Record<string, unknown> | null,
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
        [
            exId,
            allDecisionRows,
            executionData,
            activeDebtorKey,
            primaryDebtorKey,
            decisionsReloadEpoch,
            localDecisionsTick,
        ]
    );
    const forcedSync = appealSync.forced_bring_in;
    const travelSync = appealSync.travel_ban;
    const arrestSync = appealSync.arrest_warrant_investigation;
    const dossierSync = appealSync.executive_dossier_presentation;
    const judgeSync = appealSync.executive_detention_judge;

    const outcome = executionData?.forced_bring_in_personal_outcome ?? null;
    const forcedOutcomeRecorded = useMemo(() => {
        const o = String(outcome ?? '').trim();
        return o === 'brought' || o === 'absconded';
    }, [outcome]);
    const forcedBringCycleResolved = useMemo(() => {
        if (forcedInlineResolved === 'approved') return false;
        if (forcedOutcomeRecorded) return true;
        /** موافقة منفذ بانتظار نتيجة — لا تُغلق الدورة بأعلام قديمة (debtorForcedToAttend…) */
        if (forcedEffective.approved && !forcedEffective.pending) return false;
        return isForcedBringCycleResolved(executionData);
    }, [
        executionData,
        forcedEffective.approved,
        forcedEffective.pending,
        forcedInlineResolved,
        forcedOutcomeRecorded,
    ]);
    /** مصدر واحد لعنوان البطاقة + حاوية «تسجيل النتيجة» — يعتمد على نتيجة صريحة فقط */
    const forcedNeedsOutcomeUi = resolveForcedBringNeedsOutcomeUi({
        forcedApproved: forcedEffective.approved,
        forcedPending: forcedEffective.pending,
        outcome,
        appealBlocksFieldwork: forcedSync.blocksFieldwork,
    });


    const arrestStage = executionData?.personal_arrest_warrant_stage ?? 'none';
    const travelBanWithdrawn = isTravelBanRequestWithdrawn(executionData);
    const travelCycleActive = hasOpenCardForSubtype('travel_ban');
    const travelLaneSettled = isTravelBanLaneSettled(executionData, { travelCycleActive });
    const travelUiApproved = travel.approved && !travelLaneSettled;
    const judgeDetentionStored =
        (executionData?.executive_detention_judge_outcome as 'approved' | 'rejected' | null) ?? null;
    const detentionJudgeEligibleDecisionId =
        executionData?.executive_detention_judge_eligible_decision_id ?? null;
    const dossierGoverningRow = useMemo(
        () =>
            getGoverningDossierPresentationRow(exKey, {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
        [activeDebtorKey, exKey, primaryDebtorKey, decisionsReloadEpoch, localDecisionsTick]
    );
    const dossierCycleActive = Boolean(dossierGoverningRow);
    const judgeDetention = useMemo(
        () =>
            resolveExecutiveDetentionJudgeUiOutcome({
                storedOutcome: judgeDetentionStored,
                judgeRow: judgeSync.governingRow,
            }),
        [judgeSync.governingRow, judgeDetentionStored]
    );
    const travelBanEnforced =
        !travelBanWithdrawn && executionData?.debtor_travel_ban_active === true;
    const travelLiftReady =
        travelUiApproved &&
        travelBanEnforced &&
        debtRemainingIqd <= 0 &&
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !travelBanWithdrawn;
    const travelShowLiftAction = travelLiftReady;
    const travelShowInitialSubmit =
        !travel.alternative &&
        !travel.pending &&
        !travelUiApproved &&
        !travelBanEnforced &&
        !(travel.rejected && travelCycleActive);
    const travelShowEnforcedAwaitingDebt =
        travelUiApproved && travelBanEnforced && debtRemainingIqd > 0 && !travelBanWithdrawn;
    const travelActive = travelBanEnforced && travelCycleActive;
    const wanted = executionData?.debtor_wanted_arrest_warrant === true;
    const detentionActive = isExecutiveDetentionPeriodActive(executionData);
    const detentionUntil = executionData?.executive_detention_until ?? null;
    const detentionInAbsentia = executionData?.executive_detention_request_in_absentia === true;
    const inAbsentia = detentionInAbsentia;

    const executionPatchDiffers = useCallback(
        (patch: Record<string, unknown> | null | undefined): boolean => {
            if (!patch || Object.keys(patch).length === 0) return false;
            const ed = executionData as Record<string, unknown> | null | undefined;
            if (!ed) return true;
            return Object.entries(patch).some(([key, value]) => ed[key] !== value);
        },
        [executionData]
    );

    /** مزامنة ملف التنفيذ مع مركز القرارات — تصفير أعلام عالقة + نتيجة قاضي البداءة */
    useEffect(() => {
        if (!exId || isHistoricalMode) return;
        const patch = buildPersonalCoerciveAppealExecutionSyncPatch({
            executionId: exId,
            executionData: executionData as Record<string, unknown> | null,
            allDecisions: allDecisionRows,
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        if (executionPatchDiffers(patch)) persistExecutionMerge(patch!);
    }, [
        activeDebtorKey,
        allDecisionRows,
        decisionsReloadEpoch,
        executionData,
        exId,
        isHistoricalMode,
        localDecisionsTick,
        persistExecutionMerge,
        primaryDebtorKey,
        executionPatchDiffers,
    ]);

    /** جلسات قديمة: إزالة أعلام دورة كاملة أو إشعار حضور عالق بعد إخلاء السبيل */
    useEffect(() => {
        if (isHistoricalMode || !executionData) return;
        let patch: Record<string, unknown> | null = null;
        const notice = String(executionData.activeNoticeState ?? '').trim();
        if (fullPersonalCoerciveCycleClosed && detentionReleasedAt) {
            patch = { ...(patch || {}), personal_coercive_cycle_closed_at: null };
        }
        if (notice === 'forced_attendance' && forcedBringCycleResolved) {
            patch = {
                ...(patch || {}),
                activeNoticeState: null,
                forcedAttendanceIssued: false,
            };
        }
        if (
            notice === 'arrest_warrant' &&
            (executionData.debtorArrested === true || executionData.debtor_arrest_warrant_cleared_after_custody === true)
        ) {
            patch = { ...(patch || {}), activeNoticeState: null };
        }
        if (executionPatchDiffers(patch)) persistExecutionMerge(patch!);
    }, [
        detentionLaneEnded,
        detentionReleasedAt,
        executionData?.activeNoticeState,
        executionData?.debtorArrested,
        executionData?.debtor_arrest_warrant_cleared_after_custody,
        executionData?.personal_coercive_cycle_closed_at,
        forcedBringCycleResolved,
        fullPersonalCoerciveCycleClosed,
        isHistoricalMode,
        persistExecutionMerge,
        executionPatchDiffers,
    ]);

    const warrantCustodyRecorded = executionData?.debtor_arrest_warrant_cleared_after_custody === true;
    const investigationSessionOpen =
        executionData?.personal_arrest_investigation_session_open === true ||
        (executionData?.personal_arrest_investigation_session_open !== false &&
            arrest.approved &&
            arrestStage === 'pending_court');
    const investigationPostApprovalActive =
        arrest.approved &&
        !warrantCustodyRecorded &&
        (executionData?.investigationCourtRequested === true || investigationSessionOpen);

    const derivedInvestigationInnerStep = useMemo(() => {
        if (arrest.pending) return 'executor_pending' as const;
        if (!investigationPostApprovalActive) return 'hub' as const;
        if (arrestStage === 'issued' || wanted) return 'warrant_custody' as const;
        return 'outcome_choice' as const;
    }, [
        arrest.pending,
        investigationPostApprovalActive,
        arrestStage,
        wanted,
    ]);

    useEffect(() => {
        if (forcedInlineResolved === 'rejected' && forced.rejected && !forced.pending) {
            setForcedInlineResolved(null);
            return;
        }
        if (forcedInlineResolved !== 'approved') return;
        if (!forced.approved || forced.pending) return;
        const o = String(executionData?.forced_bring_in_personal_outcome ?? '').trim();
        if (o === 'brought' || o === 'absconded') {
            setForcedInlineResolved(null);
        }
    }, [
        executionData?.forced_bring_in_personal_outcome,
        forced.approved,
        forced.pending,
        forced.rejected,
        forcedInlineResolved,
    ]);

    const handleExecutorInlineResolved = useCallback(
        (result: {
            ok: boolean;
            outcome?: 'approved' | 'rejected';
            personalCoerciveSubtype?: string;
            storageExecutionId?: string;
        }) => {
            setLocalDecisionsTick((n) => n + 1);
            if (!result.ok) {
                showToast(
                    'تعذّر تسجيل قرار المنفذ — تحقق من مركز القرارات أو أعد المحاولة.',
                    'error'
                );
                return;
            }
            const subtype = String(result.personalCoerciveSubtype || '').trim() as PersonalCoerciveSubtype;
            const outcome = result.outcome;
            if (subtype === 'forced_bring_in' && (outcome === 'approved' || outcome === 'rejected')) {
                setForcedInlineResolved(outcome);
            }
            if (
                subtype &&
                outcome &&
                (outcome === 'approved' || outcome === 'rejected' || outcome === 'alternative')
            ) {
                const merge = buildPersonalCoerciveExecutionMerge({
                    subtype,
                    resolution: outcome,
                });
                const forcedApproveReset =
                    subtype === 'forced_bring_in' && outcome === 'approved'
                        ? {
                              forced_bring_in_personal_outcome: null,
                              debtorEvaded: false,
                          }
                        : {};
                const payload = { ...forcedApproveReset, ...merge };
                if (Object.keys(payload).length > 0) persistExecutionMerge(payload);
            }
            if (subtype === 'forced_bring_in' && outcome === 'approved') {
                setForcedOutcomePick('');
                showToast('تمت موافقة المنفذ — سجّل نتيجة الإحضار الجبري أدناه.', 'success');
            }
            dispatchDecisionsReload();
        },
        [persistExecutionMerge, showToast]
    );

    useEffect(() => {
        const bumpDecisions = () => setLocalDecisionsTick((n) => n + 1);
        const onOutcome = (e: Event) => {
            const d = (e as CustomEvent).detail ?? {};
            const evId = String(d.executionId ?? '').trim();
            const decisionId = String(d.decisionId ?? '').trim();
            const matchesPanel =
                !evId ||
                !exId ||
                evId === exId ||
                (decisionId &&
                    readExecutorDecisionsArray(exId).some(
                        (r) => String((r as { id?: string }).id ?? '') === decisionId
                    ));
            if (!matchesPanel) return;
            const subtype = String(d.personalCoerciveSubtype ?? '').trim() as PersonalCoerciveSubtype;
            const outcome = String(d.outcome ?? '').trim();
            const skipPanelMerge =
                subtype === 'executive_dossier_presentation' ||
                subtype === 'executive_detention' ||
                subtype === 'executive_detention_judge';
            if (
                !skipPanelMerge &&
                subtype &&
                (outcome === 'approved' || outcome === 'rejected' || outcome === 'alternative')
            ) {
                const merge = buildPersonalCoerciveExecutionMerge({
                    subtype,
                    resolution: outcome as 'approved' | 'rejected' | 'alternative',
                    decisionId: String(d.decisionId ?? '').trim() || undefined,
                });
                if (Object.keys(merge).length > 0) persistExecutionMerge(merge);
            }
            if (subtype === 'forced_bring_in' && (outcome === 'approved' || outcome === 'rejected')) {
                setForcedInlineResolved(outcome);
            }
            bumpDecisions();
        };
        window.addEventListener(DECISIONS_RELOAD_EVENT, bumpDecisions);
        window.addEventListener('hami-execution-decision-outcome', onOutcome as EventListener);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, bumpDecisions);
            window.removeEventListener('hami-execution-decision-outcome', onOutcome as EventListener);
        };
    }, [exId, persistExecutionMerge]);

    const investigationCourtWithdrawn = isInvestigationCourtWithdrawn(executionData);
    const showInvestigationBlock =
        !activeDebtorIsEmployee && shouldShowInvestigationCourtBlock(executionData, arrest);

    const renderInlineGate = useCallback(
        (
            key: ActionGateKey,
            onConfirm: () => void,
            opts?: { confirmLabel?: string; gateExtra?: React.ReactNode }
        ) => (
            <AnimatePresence initial={false}>
                {confirmingKey === key ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border border-amber-500/15 bg-[#0A1122]/90 px-3 py-3 backdrop-blur-xl"
                    >
                        {opts?.gateExtra}
                        <div className="flex w-full flex-row-reverse items-center justify-center gap-2">
                            <button
                                type="button"
                                disabled={sendingKey === key}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (sendingKey === key) return;
                                    onConfirm();
                                }}
                                className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50"
                            >
                                <span className="flex flex-row-reverse items-center justify-center gap-2">
                                    <Send size={14} className="text-amber-200" />
                                    {opts?.confirmLabel || 'تأكيد وإرسال للقرارات'}
                                </span>
                            </button>
                            <button
                                type="button"
                                disabled={sendingKey === key}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmingKey(null);
                                    }}
                                className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        ),
        [confirmingKey, sendingKey]
    );

    const findLatestDecisionIdForSubtype = useCallback(
        (subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype']): string | null => {
            const hit = getGoverningPersonalCoerciveSubtypeRow(exKey, subtype, {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
            const id = hit ? String((hit as { id?: string }).id || '').trim() : '';
            return id || null;
        },
        [activeDebtorKey, exKey, primaryDebtorKey]
    );

    const findGoverningDossierDecisionId = useCallback((): string | null => {
        const hit = getGoverningDossierPresentationRow(exKey, {
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        const id = hit ? String((hit as { id?: string }).id || '').trim() : '';
        return id || null;
    }, [activeDebtorKey, exKey, primaryDebtorKey]);

    const findLatestGuarantorDecisionId = useCallback((): string | null => {
        if (!exId) return null;
        const rows = readExecutorDecisionsArray(exId);
        const hit = rows.find((r) => isGuarantorRequestDecisionRow(r as Record<string, unknown>));
        const id = hit ? String((hit as any).id || '').trim() : '';
        return id || null;
    }, [exId]);

    const findLatestDecisionRowForSubtype = useCallback(
        (subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype']) =>
            getGoverningPersonalCoerciveSubtypeRow(exKey, subtype, {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
        [activeDebtorKey, exKey, primaryDebtorKey]
    );

    const handleWaiveInitialAppealApplied = useCallback(
        (decisionId: string, result: { ok: boolean; mergedRowId?: string; title?: string; message?: string }) => {
            if (!result.ok) {
                showToast(result.message ?? 'تعذّر تسجيل الاستغناء عن الطعن.', 'warning');
                return;
            }
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title: 'لا حاجة للطعن',
                description: [result.title, result.message].filter(Boolean).join(' — '),
                type: 'appeal',
                source: 'محضر المتابعة',
                metadata: debtorTimelineMeta,
            });
            showToast(result.message ?? 'لا حاجة للطعن — أُغلقت دورة الطلب.', 'success', {
                decisionsLink: true,
                decisionsTab: 'archive',
                decisionId: result.mergedRowId ?? decisionId,
            });
            setLocalDecisionsTick((n) => n + 1);
        },
        [nextTimelineId, pushTimelineEvent, showToast, debtorTimelineMeta]
    );

    const renderWaiveInitialAppeal = useCallback(
        (decisionId: string | null | undefined) => {
            const did = String(decisionId ?? '').trim();
            if (!did || !exId || isHistoricalMode) return null;
            return (
                <WaiveInitialAppealButton
                    executionId={exId}
                    decisionId={did}
                    allDecisions={allDecisionRows as Decision[]}
                    disabled={coerciveUiLocked}
                    onApplied={(result) => handleWaiveInitialAppealApplied(did, result)}
                />
            );
        },
        [
            allDecisionRows,
            coerciveUiLocked,
            exId,
            handleWaiveInitialAppealApplied,
            isHistoricalMode,
        ]
    );

    const handleWaiveCassationFromPanel = useCallback(
        (decisionId: string) => {
            if (!exId || isHistoricalMode) return;
            const result = applyWaiveCassationAfterDebtorGrievanceForExecution({
                executionId: exId,
                decisionId,
            });
            if (!result.ok) {
                showToast(result.message ?? 'تعذّر تسجيل الاستغناء عن التمييز.', 'warning');
                return;
            }
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title: 'لا حاجة للتمييز',
                description: [result.title, result.message].filter(Boolean).join(' — '),
                type: 'appeal',
                source: 'محضر المتابعة',
                metadata: debtorTimelineMeta,
            });
            showToast(result.message ?? 'قُبل التظلم دون تمييز — انتهت دورة الطلب.', 'success', {
                decisionsLink: true,
                decisionsTab: 'archive',
                decisionId: result.mergedRowId ?? decisionId,
            });
            setLocalDecisionsTick((n) => n + 1);
        },
        [
            exId,
            isHistoricalMode,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
            debtorTimelineMeta,
        ]
    );

    const renderAppealSyncFollowup = useCallback(
        (sync: PersonalCoerciveAppealSyncView) => {
            if (!sync.followupBlock || !exId || !sync.decisionId) return null;
            return (
                <div className="border-t border-white/10 px-3 py-3">
                    <ExecutorRequestFollowupBlockPanel
                        gate={sync.followupBlock}
                        executionId={exId}
                        decisionId={sync.decisionId}
                        onOpenAppeals={(id) => onOpenDecisions({ tab: 'previous', decisionId: id })}
                        onWaiveCassation={handleWaiveCassationFromPanel}
                        onStartCassation={(id) =>
                            onOpenDecisions({ tab: 'appeals', decisionId: id })
                        }
                    />
                </div>
            );
        },
        [exId, handleWaiveCassationFromPanel, onOpenDecisions]
    );

    const findLatestGuarantorDecisionRow = useCallback((): Record<string, unknown> | null => {
        if (!exId) return null;
        const hit = allDecisionRows.find((r) => isGuarantorRequestDecisionRow(r as Record<string, unknown>));
        return (hit as Record<string, unknown> | undefined) ?? null;
    }, [allDecisionRows, exId]);

    const guarantorFollowupBlock = useMemo(() => {
        const row = findLatestGuarantorDecisionRow();
        if (!row) return null;
        return resolveExecutorRequestFollowupBlockFromRecord(row, allDecisionRows);
    }, [allDecisionRows, findLatestGuarantorDecisionRow]);

    const forcedGoverningRow = useMemo(
        () => findLatestDecisionRowForSubtype('forced_bring_in'),
        [findLatestDecisionRowForSubtype, decisionsReloadEpoch, localDecisionsTick]
    );
    const forcedByExecutorOrder = Boolean(
        (forcedGoverningRow as { activatedByExecutorOrder?: boolean } | null)?.activatedByExecutorOrder
    );

    const forcedAwaitingOutcome = forcedNeedsOutcomeUi;
    const forcedHasExpandablePanel =
        forcedNeedsOutcomeUi ||
        forcedEffective.pending ||
        forcedEffective.rejected ||
        Boolean(forcedSync.followupBlock) ||
        forcedSync.blocksFieldwork;

    const forcedFlowStep = useMemo(() => {
        if (forcedSync.followupBlock || forcedSync.blocksFieldwork) return 'followup_blocked' as const;
        if (forcedAwaitingOutcome) return 'outcome_choice' as const;
        return 'hub' as const;
    }, [forcedSync.blocksFieldwork, forcedSync.followupBlock, forcedAwaitingOutcome]);

    const investigationCompletionActive =
        investigationPostApprovalActive && !arrestSync.followupBlock;

    const investigationHasExpandablePanel =
        arrest.pending || investigationPostApprovalActive || Boolean(arrestSync.followupBlock);

    const investigationFlowStep = useMemo(() => {
        if (arrestSync.followupBlock) return 'followup_blocked' as const;
        if (arrest.pending) return 'executor_pending' as const;
        if (!investigationCompletionActive) return 'hub' as const;
        return derivedInvestigationInnerStep;
    }, [
        arrest.pending,
        arrestSync.followupBlock,
        investigationCompletionActive,
        derivedInvestigationInnerStep,
    ]);

    const queueEncryptedPayloadForDecision = useCallback(
        (decisionId: string, subtype: string, title: string, body: string) => {
            if (!exId || !decisionId) return;
            void (async () => {
                try {
                    await CryptoService.initialize();
                    const encryptedPayloadJson = await CryptoService.encryptData(
                        JSON.stringify({
                            executionId: exId,
                            subtype,
                            title,
                            body,
                            debtorKey: activeDebtorKey,
                            createdAtIso: new Date().toISOString(),
                        })
                    );
                    patchExecutorDecisionRow(exId, decisionId, { encryptedPayloadJson });
                } catch {
                    /* optional payload — لا يعطل الواجهة */
                }
            })();
        },
        [activeDebtorKey, exId]
    );

    const submitRequest = useCallback(
        async (
            subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype'],
            title: string,
            body: string,
            opts?: { skipTimeline?: boolean; byExecutorOrder?: boolean }
        ): Promise<string | null> => {
            if (!exId || isHistoricalMode) return null;

            const syncForSubtype = appealSyncForRequestSubtype(appealSync, subtype);
            if (syncForSubtype?.blocksSubmit) {
                const nav = syncForSubtype.decisionsNav;
                showToast(
                    syncForSubtype.followupBlock?.message ??
                        'لا يمكن إرسال طلب جديد — الطلب موقوف بسبب التظلم أو الطعن.',
                    'warning',
                    {
                        decisionsLink: true,
                        decisionId: nav.decisionId,
                        decisionsTab: nav.decisionsTab,
                    }
                );
                return null;
            }

            const byExecutorOrder = Boolean(opts?.byExecutorOrder && subtype === 'forced_bring_in');
            const submitted = byExecutorOrder
                ? appendPersonalCoerciveByExecutorOrder({
                      executionId: exId,
                      subtype,
                      title,
                      body,
                      debtorKey: activeDebtorKey,
                      primaryDebtorKey,
                  })
                : appendPersonalCoerciveExecutorRequest({
                      executionId: exId,
                      subtype,
                      title,
                      body,
                      debtorKey: activeDebtorKey,
                      primaryDebtorKey,
                  });
            if (!submitted.ok) {
                const nav = decisionsNavForSubtype(subtype);
                showToast(
                    byExecutorOrder
                        ? 'لا يمكن التفعيل — يوجد طلب أو مسار قائم لنفس الإجراء.'
                        : 'يوجد طلب مماثل قيد البت لدى المنفذ.',
                    'warning',
                    {
                        decisionsLink: true,
                        decisionId: nav.decisionId,
                        decisionsTab: nav.decisionsTab,
                    }
                );
                return null;
            }
            const decisionId = submitted.decisionId;
            if (decisionId) {
                queueEncryptedPayloadForDecision(decisionId, subtype, title, body);
            }

            const msgQueuedExecutor = byExecutorOrder
                ? 'تم تفعيل الإحضار الجبري بقرار المنفذ — سجّل النتيجة عند الجاهزية.'
                : 'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ';
            if (subtype === 'forced_bring_in') {
                setForcedInlineResolved(null);
                setForcedOutcomePick('');
                persistExecutionMerge({
                    forced_bring_in_personal_outcome: null,
                    forced_bring_in_personal_followup_logged: false,
                });
            }
            if (subtype === 'travel_ban') {
                persistExecutionMerge({
                    travel_ban_withdrawn_at: null,
                });
            }
            if (subtype === 'executive_dossier_presentation') {
                persistExecutionMerge({
                    executive_dossier_phase: null,
                    executive_detention_judge_outcome: null,
                    executive_detention_judge_eligible_decision_id: null,
                    executive_detention_judge_decision_id: null,
                    executive_detention_judge_rejection_reason: null,
                    personal_coercive_cycle_closed_at: null,
                    executive_detention_released_or_closed_at: null,
                    debtor_executive_detention_active: false,
                    executive_detention_until: null,
                    executive_detention_days_total: null,
                    executive_detention_reminder_sent: false,
                });
            }
            if (!opts?.skipTimeline) {
                const now = new Date().toISOString();
                pushTimelineEvent({
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: now,
                    title: byExecutorOrder
                        ? `⚖️ ${title} — بقرار المنفذ العدل`
                        : `📋 ${title} — قيد البت`,
                    description: body.trim() || undefined,
                    type: 'coercive',
                    source: 'محضر المتابعة',
                    metadata: {
                        ...debtorTimelineMeta,
                        ...(decisionId
                            ? { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId }
                            : {}),
                    },
                });
            }
            const nav = decisionsNavForSubtype(subtype);
            showToast(msgQueuedExecutor, 'success', {
                decisionsLink: !byExecutorOrder,
                decisionId: decisionId ?? nav.decisionId,
                decisionsTab: byExecutorOrder ? undefined : nav.decisionsTab,
            });
            setLocalDecisionsTick((n) => n + 1);
            return decisionId || null;
        },
        [
            exId,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
            showToast,
            activeDebtorKey,
            primaryDebtorKey,
            debtorTimelineMeta,
            isHistoricalMode,
            queueEncryptedPayloadForDecision,
            appealSync,
            decisionsNavForSubtype,
        ]
    );

    const recordForcedOutcome = (v: 'brought' | 'absconded') => {
        if (forcedSync.blocksFieldwork) {
            showToast(
                forcedSync.followupBlock?.message ??
                    'لا يمكن تسجيل النتيجة — الطلب موقوف بسبب التظلم أو الطعن. أكمل المسار من مركز القرارات.',
                'warning',
                {
                    action: {
                        label: 'مركز القرارات',
                        onClick: () =>
                            onOpenDecisions({
                                tab: forcedSync.decisionsNav.decisionsTab,
                                decisionId:
                                    forcedSync.decisionId ??
                                    findLatestDecisionIdForSubtype('forced_bring_in') ??
                                    undefined,
                            }),
                    },
                }
            );
            return;
        }
        const now = new Date().toISOString();
        const label =
            v === 'brought'
                ? '✅ تم إحضار المدين أمام المنفذ'
                : '⚠️ المدين متخفي عن الأنظار';
        const basePatch =
            v === 'brought'
                ? {
                      forcedAttendanceIssued: false,
                      activeNoticeState: null,
                      forced_bring_in_personal_outcome: 'brought',
                      forced_bring_in_personal_followup_logged: true,
                      debtorForcedToAttend: true,
                      debtorAttendedVoluntarily: true,
                      debtorEvaded: false,
                      investigationCourtRequested: false,
                      investigationMemoIssued: false,
                      investigationPathDebtorPresent: false,
                      personal_arrest_investigation_session_open: false,
                      personal_arrest_warrant_stage: 'none',
                      debtor_wanted_arrest_warrant: false,
                  }
                : {
                      forced_bring_in_personal_outcome: 'absconded',
                      forced_bring_in_personal_followup_logged: true,
                      forcedAttendanceIssued: false,
                      activeNoticeState: null,
                      debtorEvaded: true,
                      debtorAttendedVoluntarily: false,
                      investigationPathDebtorPresent: false,
                      debtor_arrest_warrant_cleared_after_custody: false,
                      personal_arrest_warrant_stage: 'pending_court',
                      personal_arrest_investigation_session_open: true,
                      investigationCourtRequested: true,
                      investigation_court_withdrawn_at: null,
                  };
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title: label,
                description: 'تسجيل نتيجة مسار الإحضار الجبري الشخصي بشأن المدين.',
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: debtorTimelineMeta,
            },
            { mergePatch: basePatch }
        );
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'forced_bring_in',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        if (v === 'brought') {
            showToast('تم التسجيل وتصفير دورة الإحضار الجبري لإتاحة طلب جديد عند الحاجة.', 'success');
        } else {
            showToast(
                'تم التسجيل — يمكنك الآن إرسال طلب مفاتحة محكمة التحقيق من القسم أدناه.',
                'success'
            );
        }
    };

    const closeInvestigationAndForcedBringDecisionCycles = () => {
        if (!exId) return;
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'forced_bring_in',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'arrest_warrant_investigation',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        setLocalDecisionsTick((n) => n + 1);
    };

    const recordInvestigationDebtorAttended = () => {
        persistExecutionMerge({
            forcedAttendanceIssued: false,
            activeNoticeState: null,
            forced_bring_in_personal_outcome: 'brought',
            forced_bring_in_personal_followup_logged: true,
            debtorForcedToAttend: true,
            debtorAttendedVoluntarily: true,
            debtorEvaded: false,
            investigationCourtRequested: false,
            investigationMemoIssued: false,
            investigationPathDebtorPresent: true,
            personal_arrest_investigation_session_open: false,
            personal_arrest_warrant_stage: 'none',
            debtor_wanted_arrest_warrant: false,
        });
        closeInvestigationAndForcedBringDecisionCycles();
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '✅ تم حضور المدين (مفاتحة محكمة التحقيق)',
            description: 'تسجيل مثول المدين دون صدور أمر قبض — أُغلقت دورة المفاتحة والإحضار الجبري.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم التسجيل وإغلاق دورة المفاتحة.', 'success');
    };

    const revertWarrantIssuedMark = () => {
        persistExecutionMerge({
            personal_arrest_warrant_stage: 'pending_court',
            debtor_wanted_arrest_warrant: false,
            debtor_arrest_warrant_cleared_after_custody: false,
            personal_arrest_investigation_session_open: true,
        });
        showToast('تم الرجوع — اختر نتيجة المفاتحة من جديد.', 'info');
    };

    const markWarrantIssued = () => {
        persistExecutionMerge({
            personal_arrest_warrant_stage: 'issued',
            debtor_wanted_arrest_warrant: true,
            debtor_arrest_warrant_cleared_after_custody: false,
            personal_arrest_investigation_session_open: false,
        });
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '🔴 تم صدور أمر القبض',
            description: 'تأشير على صدور مذكرة القبض. (المدين)',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم تسجيل صدور أمر القبض — أكمل بتأمين الإحضار.', 'success');
    };

    const recordSecuredBringAfterWarrant = () => {
        persistExecutionMerge({
            debtor_arrest_warrant_cleared_after_custody: true,
            debtorArrested: true,
            forcedAttendanceIssued: false,
            activeNoticeState: null,
            forced_bring_in_personal_outcome: 'brought',
            forced_bring_in_personal_followup_logged: true,
            debtorForcedToAttend: true,
            debtorAttendedVoluntarily: true,
            debtorEvaded: false,
            investigationCourtRequested: false,
            investigationMemoIssued: false,
            investigationPathDebtorPresent: true,
            personal_arrest_investigation_session_open: false,
            personal_arrest_warrant_stage: 'none',
            debtor_wanted_arrest_warrant: false,
        });
        closeInvestigationAndForcedBringDecisionCycles();
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '✅ تم تأمين إحضار المدين',
            description:
                'تسجيل تنفيذ مذكرة القبض وتأمين الإحضار — أُغلقت دورة المفاتحة والإحضار الجبري.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم تأمين الإحضار وإغلاق دورة المفاتحة.', 'success');
    };

    const goBackToPersonalCoerciveHub = useCallback(() => {
        setConfirmingKey(null);
        setForcedOutcomePick('');
        setDetentionRejectionOpen(false);
        setDetentionRejectionReason('');
        setDossierDetailsOpen(false);
        setJudgeDetailsOpen(false);
        setTravelDetailsOpen(false);
    }, []);

    /** إخلاء سبيل — يُنهي مسار الحبس التنفيذي فقط دون المساس بباقي الإجراءات الجبرية */
    const buildReleaseDetentionPatch = useCallback((): Record<string, unknown> => {
        const base: Record<string, unknown> = {
            executive_detention_released_or_closed_at: new Date().toISOString(),
            debtor_executive_detention_active: false,
            executive_detention_until: null,
            executive_detention_days_total: null,
            executive_detention_reminder_sent: false,
            executive_detention_judge_outcome: null,
            executive_detention_judge_eligible_decision_id: null,
            executive_detention_judge_decision_id: null,
            executive_detention_judge_rejection_reason: null,
            executive_dossier_phase: null,
            executive_detention_request_in_absentia: false,
            personal_coercive_cycle_closed_at: null,
        };
        return appendImplicitForcedBringBroughtPatch(base, executionData, forced.approved);
    }, [executionData, forced.approved]);

    const recordExecutiveDetentionJudgeOutcome = useCallback(
        (outcome: 'approved' | 'rejected', now: string, rejectionReason?: string) => {
            const parentId = detentionJudgeEligibleDecisionId || findGoverningDossierDecisionId();
            if (!parentId || !exId) {
                showToast('تعذّر تسجيل قرار القاضي — لا يوجد طلب عرض إضبارة مرتبط.', 'error');
                return;
            }
            const storageId =
                String(
                    resolveExecutorDecisionRowContext(exId, parentId)?.storageExecutionId || exId
                ).trim() || exId;
            const submitted = appendExecutiveDetentionJudgeDecision({
                executionId: storageId,
                parentExecutorDecisionId: parentId,
                outcome,
                rejectionReason,
                debtorKey: activeDebtorKey,
            });
            const judgeDecisionId = submitted.decisionId;
            if (!judgeDecisionId || !submitted.ok) {
                showToast('تعذّر حفظ قرار القاضي — أعد المحاولة من مركز القرارات.', 'error');
                return;
            }
            persistExecutionMerge({
                executive_detention_judge_decision_id: judgeDecisionId,
                executive_dossier_phase: 'judge_decided',
                executive_detention_judge_outcome: outcome,
                executive_detention_judge_rejection_reason:
                    outcome === 'rejected' && rejectionReason ? rejectionReason : null,
            });
            const reason = String(rejectionReason ?? '').trim();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title:
                    outcome === 'approved'
                        ? '⚖️ وافق قاضي البداءة على حبس المدين'
                        : '⚖️ رفض قاضي البداءة حبس المدين',
                description:
                    outcome === 'rejected' && reason
                        ? `سبب الرفض: ${reason}`
                        : outcome === 'approved'
                          ? 'قرار مستقل عن موافقة المنفذ على عرض الإضبارة.'
                          : undefined,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: {
                    ...debtorTimelineMeta,
                    timelineThreadKey: `executor_decision:${judgeDecisionId}`,
                    decisionRowId: judgeDecisionId,
                },
            });
            setLocalDecisionsTick((n) => n + 1);
            showToast(
                outcome === 'approved'
                    ? 'وافق القاضي — يحق للمدين التمييز دون تظلم. يمكنك بدء مدة الحبس أدناه.'
                    : 'رُفض الحبس — يحق للدائن التمييز دون تظلم.',
                outcome === 'approved' ? 'success' : 'info',
                {
                    action: {
                        label: 'فتح قرار التمييز في القرارات',
                        onClick: () =>
                            onOpenDecisions({
                                tab: 'previous',
                                decisionId: judgeDecisionId,
                            }),
                    },
                }
            );
        },
        [
            activeDebtorKey,
            debtorTimelineMeta,
            detentionJudgeEligibleDecisionId,
            exId,
            findGoverningDossierDecisionId,
            nextTimelineId,
            onOpenDecisions,
            persistExecutionMerge,
            pushTimelineEvent,
            showToast,
        ]
    );

    const startDetentionFourMonths = (opts?: { markCustody?: boolean; markArrested?: boolean }) => {
        const start = new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + 4);
        const until = formatDateToLocalYmd(end);
        let patch: Record<string, unknown> = {
            debtor_executive_detention_active: true,
            executive_detention_days_total: 120,
            executive_detention_until: until,
            executive_detention_reminder_sent: false,
            executive_dossier_phase: 'detention_active',
            executive_detention_released_or_closed_at: null,
            personal_coercive_cycle_closed_at: null,
        };
        patch = appendImplicitForcedBringBroughtPatch(patch, executionData, forced.approved);
        if (opts?.markArrested) {
            patch.debtorArrested = true;
        }
        if (opts?.markCustody || !inAbsentia) {
            patch.debtor_arrest_warrant_cleared_after_custody = true;
        }
        const now = new Date().toISOString();
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title: inAbsentia ? '🔒 بدء مدة الحبس التنفيذي (4 أشهر) — غيابي' : '🔒 بدء مدة الحبس التنفيذي (4 أشهر)',
                description: `تُحتسب مدة الحبس التنفيذي تلقائياً 4 أشهر حتى ${until}.`,
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: debtorTimelineMeta,
            },
            { mergePatch: patch }
        );
        showToast('تم تفعيل العداد لمدة 4 أشهر.', 'success');
    };

    const liftTravelBanEnforcement = () => {
        if (!travelUiApproved) {
            showToast('رفع المنع متاح فقط بعد موافقة المنفذ واعتبار القرار نافذاً.', 'warning');
            return;
        }
        if (debtRemainingIqd > 0) {
            showToast('يُرفع منع السفر بعد سداد الدين بالكامل.', 'warning');
            return;
        }
        if (!travelBanEnforced || isHistoricalMode || coerciveUiLocked || travelBanWithdrawn) return;
        const now = new Date().toISOString();
        persistExecutionMerge({
            debtor_travel_ban_active: false,
            travel_ban_withdrawn_at: now,
        });
        if (exId) {
            closePersonalCoerciveSubtypeDecisionCycle({
                executionId: exId,
                subtype: 'travel_ban',
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
            setLocalDecisionsTick((n) => n + 1);
        }
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: 'رفع منع السفر',
            description: 'تم رفع إشارة منع السفر بعد سداد الدين.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        showToast('تم رفع منع السفر.', 'success');
    };

    const withdrawInvestigationCourtPath = useCallback(() => {
        if (forcedBringWithdrawBusy) return;
        setForcedBringWithdrawBusy(true);
        const now = new Date().toISOString();
        const arrestDecisionId = findLatestDecisionIdForSubtype('arrest_warrant_investigation');
        if (arrestDecisionId && exKey) {
            syncPersonalCoerciveWithdrawn({
                executionId: exKey,
                decisionId: arrestDecisionId,
                subtype: 'arrest_warrant_investigation',
                extraMerge: { investigation_court_withdrawn_at: now },
            });
        } else {
            persistExecutionMerge({
                investigation_court_withdrawn_at: now,
                investigationCourtRequested: false,
                investigationMemoIssued: false,
                investigationPathDebtorPresent: false,
                personal_arrest_investigation_session_open: false,
                personal_arrest_warrant_stage: 'none',
                debtor_wanted_arrest_warrant: false,
                debtor_arrest_warrant_cleared_after_custody: false,
                forced_bring_in_personal_outcome: null,
                debtorEvaded: false,
            });
            pushTimelineEvent({
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: now,
                title: '↩️ التراجع عن مفاتحة محكمة التحقيق',
                description:
                    'تنازل عن مسار المفاتحة — أُعيد تفعيل الإحضار الجبري لتسجيل النتيجة. تظهر بطاقة المفاتحة مجدداً بعد تسجيل «متخفي» من جديد.',
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: debtorTimelineMeta,
            });
        }
        setForcedBringWithdrawConfirmOpen(false);
        setForcedBringWithdrawBusy(false);
        showToast(
            'تم التنازل عن مفاتحة التحقيق — سجّل نتيجة الإحضار الجبري من جديد عند الحاجة.',
            'success'
        );
    }, [
        debtorTimelineMeta,
        exKey,
        findLatestDecisionIdForSubtype,
        forcedBringWithdrawBusy,
        getLocalTodayYmd,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        showToast,
    ]);

    const notifyDebtorFirstToast = useCallback(() => {
        showToast('يجب تبليغ المدين أولاً قبل استخدام هذا الإجراء.', 'warning', {
            action: {
                label: 'مركز التبليغات',
                onClick: () => onOpenSummonsCenter(),
            },
        });
    }, [onOpenSummonsCenter, showToast]);

    const guardSummonsGate = useCallback((): boolean => {
        if (relaxedPersonal) return true;
        if (!debtorNotified) {
            notifyDebtorFirstToast();
            return false;
        }
        if (gracePeriodEndedFlag) return true;
        showToast(
            'لا يتم التفعيل إلا بعد الإخبار بمذكرة الإخبار بالتنفيذ أو انتهاء المهلة دون حضور طوعي.',
            'warning',
            {
                action: {
                    label: 'مركز التبليغات',
                    onClick: () => onOpenSummonsCenter(),
                },
            }
        );
        return false;
    }, [
        relaxedPersonal,
        debtorNotified,
        gracePeriodEndedFlag,
        notifyDebtorFirstToast,
        onOpenSummonsCenter,
        showToast,
    ]);

    const canSubmitTravelBan =
        !coerciveUiLocked && !travelActive && !travel.pending && !travel.alternative;

    const investigationPathSettled = executionData?.investigationPathDebtorPresent === true;
    const canWithdrawInvestigationPath =
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !forced.alternative &&
        !forced.rejected &&
        !forcedAwaitingOutcome &&
        !investigationCourtWithdrawn &&
        !investigationPathSettled &&
        (outcome === 'absconded' ||
            executionData?.investigationCourtRequested === true ||
            arrest.pending ||
            (arrest.approved && investigationSessionOpen));

    const forcedButtonLabel = canWithdrawInvestigationPath
        ? 'الإحضار الجبري — تنازل عن مفاتحة التحقيق'
        : forcedEffective.pending
          ? 'الإحضار الجبري — قيد البت'
          : forcedEffective.alternative
            ? 'الإحضار الجبري — قرار بديل'
            : forcedEffective.rejected
              ? 'الإحضار الجبري — مرفوض'
              : forcedSync.blocksFieldwork
                ? 'الإحضار الجبري — موقوف (تظلم/طعن)'
                : forcedNeedsOutcomeUi
                  ? 'الإحضار الجبري — تسجيل النتيجة'
                : outcome === 'absconded'
                  ? 'الإحضار الجبري — متخفي'
                  : 'الإحضار الجبري';
    const forcedShowResubmitStrip =
        !isHistoricalMode &&
        !coerciveUiLocked &&
        forcedEffective.rejected &&
        !forcedEffective.pending &&
        !forcedSync.followupBlock &&
        !forcedEffective.alternative;

    const forcedShowStartStrip =
        !hideExecutorForcedBringActivation &&
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !forcedEffective.pending &&
        !forcedEffective.rejected &&
        !forcedNeedsOutcomeUi &&
        !forcedSync.followupBlock &&
        !forcedEffective.alternative &&
        !canWithdrawInvestigationPath;

    const forcedButtonDisabled =
        isHistoricalMode ||
        coerciveUiLocked ||
        forcedEffective.alternative ||
        forcedEffective.rejected ||
        forcedEffective.pending;

    const runForcedBringSubmit = React.useCallback(
        (byExecutorOrder: boolean) => {
            if (sendingKey === 'forced_bring_in') return;
            if (!byExecutorOrder) {
                if (!relaxedPersonal && !guardSummonsGate()) return;
                if (!relaxedPersonal && !forcedSummonAllowed) {
                    showToast(
                        forcedSummonLockReason ||
                            'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.',
                        'warning',
                        {
                            action: {
                                label: 'مركز التبليغات',
                                onClick: () => onOpenSummonsCenter(),
                            },
                        }
                    );
                    return;
                }
            }
            setSendingKey('forced_bring_in');
            void submitRequest(
                'forced_bring_in',
                byExecutorOrder ? 'إحضار جبري — بقرار المنفذ العدل' : 'طلب إحضار جبري للمدين',
                byExecutorOrder
                    ? 'تفعيل مسار الإحضار الجبري بناءً على قرار صادر من منفذ العدل — دون انتظار طلب دائن.'
                    : 'طلب إحضار بالقوة لمثول المدين أمام دائرة التنفيذ بعد انتهاء المهلة دون حضور طوعي.',
                { byExecutorOrder }
            ).then(() => {
                setSendingKey(null);
            });
        },
        [
            forcedSummonAllowed,
            forcedSummonLockReason,
            guardSummonsGate,
            onOpenSummonsCenter,
            relaxedPersonal,
            sendingKey,
            showToast,
            submitRequest,
        ]
    );

    const dossierCanResubmitToExecutor = dossierCycleActive && dossier.rejected;

    const canSubmitExecutiveDetention =
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !dossier.pending &&
        (detentionLaneEnded ||
            detentionInAbsentia ||
            debtorPresentEffective ||
            relaxedPersonal ||
            dossierCanResubmitToExecutor);

    const runTravelBanSubmit = React.useCallback(() => {
        if (sendingKey === 'travel_ban') return;
        if (travel.pending) return;
        if (!canSubmitTravelBan) return;
        setSendingKey('travel_ban');
        void submitRequest(
            'travel_ban',
            'طلب وضع إشارة منع سفر على المدين',
            'طلب توجيه كتاب إلى مديرية الجوازات والإقامة لمنع سفر المدين لحين البتّ في التنفيذ.'
        ).then(() => {
            setSendingKey(null);
            setConfirmingKey(null);
        });
    }, [canSubmitTravelBan, sendingKey, submitRequest, travel.pending]);

    const runArrestInvestigationSubmit = React.useCallback(() => {
        if (sendingKey === 'arrest_warrant_investigation') return;
        if (arrest.pending) return;
        setSendingKey('arrest_warrant_investigation');
        void submitRequest(
            'arrest_warrant_investigation',
            'طلب مفاتحة محكمة التحقيق لإصدار أمر قبض',
            'بعد تعذّر الإحضار الجبري وتخلّف المدين عن المثول، طُلب توجيه كتاب مفاتحة لمحكمة التحقيق المختصة لإصدار أمر قبض أصولي.'
        ).then(() => {
            setSendingKey(null);
            setConfirmingKey(null);
        });
    }, [arrest.pending, sendingKey, submitRequest]);

    const runDossierPresentationSubmit = React.useCallback(() => {
        if (sendingKey === 'executive_dossier_presentation') return;
        if (dossier.pending) return;
        if (!relaxedPersonal && !guardSummonsGate()) return;
        if (
            !dossierCanResubmitToExecutor &&
            !detentionInAbsentia &&
            !debtorPresentEffective &&
            !relaxedPersonal
        ) {
            showToast('فعّل مسار الغياب أو أكّد مثول المدين أمام المنفذ.', 'warning');
            return;
        }
        setSendingKey('executive_dossier_presentation');
        void submitRequest(
            'executive_dossier_presentation',
            'طلب عرض الإضبارة على قاضي البداءة',
            detentionInAbsentia
                ? 'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين — وضع غيابي؛ امتناع عن التسديد دون مثول أمام المنفذ.'
                : 'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين لامتناعه عن التسديد رغم مثوله أمام المنفذ دون تسوية مقبولة.'
        )
            .then(() => {
                setSendingKey(null);
            })
            .catch(() => setSendingKey(null));
    }, [
        coerciveUiLocked,
        debtorPresentEffective,
        dossier.pending,
        dossierCanResubmitToExecutor,
        dossierCycleActive,
        detentionInAbsentia,
        dossierPhase,
        guardSummonsGate,
        judgeDetention,
        persistExecutionMerge,
        relaxedPersonal,
        sendingKey,
        showToast,
        submitRequest,
    ]);

    const investigationButtonLabel = arrest.pending
        ? 'مفاتحة محكمة التحقيق'
        : arrest.alternative
          ? 'مفاتحة محكمة التحقيق — قرار بديل'
          : (arrestStage === 'issued' || wanted) && warrantCustodyRecorded
            ? 'مفاتحة محكمة التحقيق — تم القبض'
            : arrest.approved && (investigationSessionOpen || arrestStage === 'issued' || wanted)
              ? 'مفاتحة محكمة التحقيق — تسجيل النتيجة'
              : 'مفاتحة محكمة التحقيق — أمر قبض';
    const investigationButtonDisabled =
        isHistoricalMode ||
        coerciveUiLocked ||
        arrest.alternative ||
        ((arrestStage === 'issued' || wanted) && warrantCustodyRecorded);

    const travelButtonLabel = travel.pending
        ? 'منع سفر — قيد البت'
        : travel.alternative
          ? 'منع سفر — قرار بديل'
          : travelShowLiftAction
            ? 'رفع منع السفر'
            : travelBanEnforced && travelUiApproved
              ? 'منع سفر — مفعّل'
              : travel.rejected && travelCycleActive
                ? 'منع سفر — مرفوض'
                : 'تقديم طلب منع سفر';
    const travelSubmitButtonDisabled =
        isHistoricalMode || coerciveUiLocked || travel.alternative || !canSubmitTravelBan;

    const travelShowResubmitStrip =
        !isHistoricalMode &&
        !coerciveUiLocked &&
        travelCycleActive &&
        travel.rejected &&
        !travel.pending &&
        !travelSync.followupBlock &&
        !travel.alternative;

    const travelPanelHasBody =
        travelShowLiftAction ||
        travelShowEnforcedAwaitingDebt ||
        travelShowInitialSubmit ||
        confirmingKey === 'travel_ban' ||
        sendingKey === 'travel_ban' ||
        (travelUiApproved && Boolean(travelSync.followupBlock)) ||
        (!travelBanWithdrawn && travelCycleActive && (travel.pending || travel.rejected));

    const dossierShowResubmitStrip =
        !isHistoricalMode &&
        !coerciveUiLocked &&
        dossierCycleActive &&
        dossier.rejected &&
        !dossier.pending &&
        !dossierSync.followupBlock &&
        !dossier.alternative;

    const dossierAwaitingJudge =
        dossierCycleActive &&
        !detentionLaneEnded &&
        dossierPhase === 'handed_to_judge' &&
        !dossier.pending &&
        !dossier.rejected &&
        !dossierSync.followupBlock &&
        !detentionActive &&
        judgeDetention === null;

    const dossierIdle =
        detentionLaneEnded ||
        !dossierCycleActive ||
        (!dossier.pending &&
            !dossier.rejected &&
            !dossier.approved &&
            !dossier.alternative &&
            !detentionActive &&
            judgeDetention === null &&
            (dossierPhase === null || dossierPhase === undefined));

    const dossierShowStartPeriod =
        !detentionLaneEnded &&
        judgeDetention === 'approved' &&
        (dossierPhase === 'judge_decided' || dossierPhase === 'detention_active') &&
        !detentionActive;

    const dossierExecutorApproved =
        dossierCycleActive &&
        !detentionLaneEnded &&
        dossier.approved &&
        !dossier.pending &&
        !dossier.rejected &&
        dossierPhase !== null &&
        dossierPhase !== undefined &&
        (dossierPhase === 'handed_to_judge' ||
            dossierPhase === 'judge_decided' ||
            dossierPhase === 'detention_active');

    const showDossierPresentationCard =
        !hideDossierJudgePresentation &&
        !activeDebtorIsEmployee &&
        (dossier.pending ||
            dossier.rejected ||
            dossier.alternative ||
            dossierIdle ||
            dossierExecutorApproved ||
            (dossier.approved && Boolean(dossierSync.followupBlock)));

    const showJudgeDetentionCard =
        !hideDossierJudgePresentation &&
        !activeDebtorIsEmployee &&
        dossierCycleActive &&
        !detentionLaneEnded &&
        dossier.approved &&
        !dossier.pending &&
        !dossier.rejected &&
        dossierPhase !== null &&
        dossierPhase !== undefined &&
        (dossierPhase === 'handed_to_judge' ||
            dossierPhase === 'judge_decided' ||
            dossierPhase === 'detention_active' ||
            detentionActive);

    const arrestShowResubmitStrip =
        !isHistoricalMode &&
        !coerciveUiLocked &&
        arrest.rejected &&
        !arrest.pending &&
        !arrestSync.followupBlock &&
        !arrest.alternative;

    useEffect(() => {
        if (detentionLaneEnded || !exId || !dossierCycleActive) return;
        if (judgeDetention === 'approved' || judgeDetention === 'rejected') {
            if (dossierPhase !== 'judge_decided' && dossierPhase !== 'detention_active') {
                persistExecutionMerge({ executive_dossier_phase: 'judge_decided' });
            }
            return;
        }
        if (
            dossier.approved &&
            !dossier.pending &&
            !dossier.rejected &&
            dossierPhase !== 'handed_to_judge' &&
            dossierPhase !== 'judge_decided' &&
            dossierPhase !== 'detention_active'
        ) {
            const govId = findGoverningDossierDecisionId();
            persistExecutionMerge({
                executive_dossier_phase: 'handed_to_judge',
                ...(govId && !detentionJudgeEligibleDecisionId
                    ? { executive_detention_judge_eligible_decision_id: govId }
                    : {}),
            });
        }
    }, [
        detentionLaneEnded,
        detentionJudgeEligibleDecisionId,
        dossier.approved,
        dossier.pending,
        dossier.rejected,
        dossierCycleActive,
        dossierPhase,
        exId,
        findGoverningDossierDecisionId,
        judgeDetention,
        persistExecutionMerge,
    ]);

    useEffect(() => {
        if (travelLaneSettled && travelDetailsOpen && !travelPanelHasBody) {
            setTravelDetailsOpen(false);
        }
    }, [travelDetailsOpen, travelLaneSettled, travelPanelHasBody]);

    useEffect(() => {
        if (confirmingKey === 'travel_ban' || sendingKey === 'travel_ban') {
            setTravelDetailsOpen(true);
        }
        if (
            confirmingKey === 'executive_dossier_presentation' ||
            sendingKey === 'executive_dossier_presentation'
        ) {
            setDossierDetailsOpen(true);
        }
    }, [confirmingKey, sendingKey]);

    const renderJudgeRejectedResubmitBlock = () => {
        const judgeDecisionId = String(executionData?.executive_detention_judge_decision_id ?? '').trim();
        return (
            <CoerciveSubsectionFold flat title="رُفض قاضي البداءة حبس المدين" titleClassName="text-rose-200">
                {String(executionData?.executive_detention_judge_rejection_reason ?? '').trim() ? (
                    <p className="text-[10px] leading-relaxed text-rose-200/90">
                        سبب الرفض: {String(executionData?.executive_detention_judge_rejection_reason).trim()}
                    </p>
                ) : null}
                <p className="text-[10px] leading-relaxed text-rose-200/75">
                    قرار القاضي مستقل عن المنفذ — يمكنك التمييز من مركز القرارات أو تسجيل «لا حاجة للطعن».
                </p>
                {renderWaiveInitialAppeal(judgeDecisionId)}
                {judgeDecisionId ? (
                    <button
                        type="button"
                        className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 py-2 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15"
                        onClick={() =>
                            onOpenDecisions({
                                tab: 'previous',
                                decisionId: judgeDecisionId,
                            })
                        }
                    >
                        مركز القرارات — قرار القاضي والتمييز
                    </button>
                ) : null}
            </CoerciveSubsectionFold>
        );
    };

    return (
        <div
            className={`${embeddedHiddenPath ? 'space-y-3' : 'p-4 space-y-4'}${isHistoricalMode ? ' pointer-events-none select-none opacity-[0.72]' : ''}`}
        >
            <PersonalCoerciveFollowUpPortal
                open={releaseConfirmOpen}
                dismissDisabled={releaseConfirmBusy}
                onDismiss={() => setReleaseConfirmOpen(false)}
            >
                        <div
                            role="dialog"
                            aria-modal="true"
                            className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-[#0A0F1C] p-4 shadow-2xl text-right space-y-3 pointer-events-auto"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-2 flex-row-reverse border-b border-white/10 pb-2">
                                <p className="text-sm font-bold text-rose-100">تحذير</p>
                                <button
                                    type="button"
                                    aria-label="إغلاق"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
                                    disabled={releaseConfirmBusy}
                                    onClick={() => setReleaseConfirmOpen(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <p className="text-[12px] leading-relaxed text-rose-100/95">
                                تحذير: يُنهى مسار الحبس التنفيذي وعرض الإضبارة الحالي فقط. الإحضار الجبري ومنع السفر
                                والمفاتحة يبقون كما هي. لا يمكن الرجوع عن إخلاء السبيل.
                            </p>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                    type="button"
                                    disabled={releaseConfirmBusy}
                                    className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                                    onClick={() => setReleaseConfirmOpen(false)}
                                >
                                    تراجع
                                </button>
                                <button
                                    type="button"
                                    disabled={releaseConfirmBusy}
                                    className="rounded-xl border border-rose-500/45 bg-rose-950/40 py-2.5 text-[11px] font-black text-rose-100 hover:bg-rose-950/55 disabled:opacity-50"
                                    onClick={() => {
                                        if (releaseConfirmBusy) return;
                                        setReleaseConfirmBusy(true);
                                        setReleaseConfirmOpen(false);
                                        const nowIso = new Date().toISOString();
                                        const releasePatch = buildReleaseDetentionPatch();
                                        persistExecutionMerge(releasePatch);
                                        pushTimelineEvent(
                                            {
                                                id: nextTimelineId(),
                                                date: getLocalTodayYmd(),
                                                timestamp: nowIso,
                                                title: 'تم إخلاء سبيل المدين — انتهاء مسار الحبس التنفيذي',
                                                description:
                                                    'أُنهيت دورة الحبس وعرض الإضبارة فقط؛ باقي الإجراءات الجبرية (إحضار، منع سفر، مفاتحة) لم تُمس.',
                                                type: 'coercive',
                                                source: 'محضر المتابعة',
                                                metadata: debtorTimelineMeta,
                                            },
                                            { mergePatch: releasePatch }
                                        );
                                        archiveExecutiveDetentionCycleDecisions({
                                            executionId: exId,
                                            debtorKey: activeDebtorKey,
                                            primaryDebtorKey,
                                        });
                                        setDetentionInAbsentia(false);
                                        setDetentionRejectionOpen(false);
                                        setDetentionRejectionReason('');
                                        goBackToPersonalCoerciveHub();
                                        setLocalDecisionsTick((n) => n + 1);
                                        showToast(
                                            'تم إخلاء السبيل — يمكنك تقديم طلب عرض إضبارة جديد عند الحاجة.',
                                            'success'
                                        );
                                        setReleaseConfirmBusy(false);
                                    }}
                                >
                                    تأكيد إخلاء السبيل
                                </button>
                            </div>
                        </div>
            </PersonalCoerciveFollowUpPortal>

            <PersonalCoerciveFollowUpPortal
                open={forcedBringWithdrawConfirmOpen}
                dismissDisabled={forcedBringWithdrawBusy}
                onDismiss={() => setForcedBringWithdrawConfirmOpen(false)}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-[#0A0F1C] p-4 shadow-2xl text-right space-y-3 pointer-events-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between gap-2 flex-row-reverse border-b border-white/10 pb-2">
                        <p className="text-sm font-bold text-amber-100">تنازل عن مفاتحة التحقيق</p>
                        <button
                            type="button"
                            aria-label="إغلاق"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
                            disabled={forcedBringWithdrawBusy}
                            onClick={() => setForcedBringWithdrawConfirmOpen(false)}
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <p className="text-[12px] leading-relaxed text-amber-100/95">
                        سيتم سحب طلب مفاتحة محكمة التحقيق (إن وُجد) وإخفاء بطاقتها، وإعادة تفعيل تسجيل نتيجة الإحضار
                        الجبري. لن تظهر بطاقة المفاتحة مجدداً إلا بعد تسجيل «المدين متخفي» من جديد.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                            type="button"
                            disabled={forcedBringWithdrawBusy}
                            className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                            onClick={() => setForcedBringWithdrawConfirmOpen(false)}
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            disabled={forcedBringWithdrawBusy}
                            className="rounded-xl border border-amber-500/45 bg-amber-950/40 py-2.5 text-[11px] font-black text-amber-100 hover:bg-amber-950/55 disabled:opacity-50"
                            onClick={() => withdrawInvestigationCourtPath()}
                        >
                            تأكيد التنازل
                        </button>
                    </div>
                </div>
            </PersonalCoerciveFollowUpPortal>

            {/* 1 — إحضار جبري */}
            {showEmbeddedSection('forced_bring_in') ? (
            <div className="relative space-y-2">
            <div
                className={`overflow-visible rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right ${kasabCoerciveEmphasis ? 'ring-2 ring-[#E6C673]/45 border-[#E6C673]/35' : ''}`}
            >
                <div className="relative">
                    {forcedHasExpandablePanel ? (
                        <div
                            className={`w-full ${BTN_BASE} bg-gradient-to-l from-violet-500/12 to-transparent`}
                        >
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <Gavel className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-white">{forcedButtonLabel}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                if (canWithdrawInvestigationPath) {
                                    setForcedBringWithdrawConfirmOpen(true);
                                    return;
                                }
                                if (forcedButtonDisabled) return;
                                if (!relaxedPersonal && !guardSummonsGate()) return;
                                if (forcedShowStartStrip) return;
                            }}
                            disabled={
                                (forcedButtonDisabled && !forcedHasExpandablePanel) ||
                                (forcedShowStartStrip && !forcedHasExpandablePanel)
                            }
                            className={`w-full ${BTN_BASE} bg-gradient-to-l from-violet-500/12 to-transparent hover:from-violet-500/18 ${(forcedButtonDisabled && !forcedHasExpandablePanel) || (forcedShowStartStrip && !forcedHasExpandablePanel) ? BTN_DISABLED : ''}`}
                        >
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <Gavel className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-white">{forcedButtonLabel}</p>
                                </div>
                            </div>
                        </button>
                    )}
                    {forcedEffective.pending ? (
                        <div className="border-t border-white/10 px-3 py-3">
                            <CoerciveSubsectionFold
                                flat
                                title="طلب الإحضار الجبري — قيد البت لدى المنفذ"
                                titleClassName="text-amber-100"
                            >
                                <p className="text-[10px] leading-relaxed text-amber-200/75 text-right">
                                    تم إرسال الطلب — بانتظار موافقة أو رفض المنفذ العدل.
                                </p>
                                <ExecutionInlineExecutorDecisionActions
                                    executionId={exId}
                                    decisionId={findLatestDecisionIdForSubtype('forced_bring_in') || ''}
                                    decisionRow={findLatestDecisionRowForSubtype('forced_bring_in')}
                                    requestKind="personal_coercive"
                                    personalCoerciveSubtype="forced_bring_in"
                                    suppressNavigatorToast
                                    onResolved={handleExecutorInlineResolved}
                                />
                            </CoerciveSubsectionFold>
                        </div>
                    ) : null}

                    {renderAppealSyncFollowup(forcedSync)}

                    {forcedEffective.rejected ? (
                        <div className="border-t border-white/10 px-3 pb-3 pt-2">
                            <CoerciveSubsectionFold flat title="تم رفض الطلب من قبل المنفذ">
                                <ExecutionInlineExecutorDecisionActions
                                    executionId={exId}
                                    decisionId={findLatestDecisionIdForSubtype('forced_bring_in') || ''}
                                    requestKind="personal_coercive"
                                    personalCoerciveSubtype="forced_bring_in"
                                    suppressNavigatorToast
                                    disabled
                                    onOpenAppealCenter={() =>
                                        onOpenDecisions({
                                            tab: 'previous',
                                            decisionId: findLatestDecisionIdForSubtype('forced_bring_in'),
                                        })
                                    }
                                />
                                {renderWaiveInitialAppeal(findLatestDecisionIdForSubtype('forced_bring_in'))}
                                {forcedShowResubmitStrip ? (
                                    <div className="border-t border-white/10 pt-2">
                                        <RejectedExecutorResubmitStrip
                                            showReplaceHint={hasOpenCardForSubtype('forced_bring_in')}
                                            submitting={sendingKey === 'forced_bring_in'}
                                            disabled={sendingKey === 'forced_bring_in'}
                                            onConfirmSubmit={() => {
                                                if (!relaxedPersonal && !guardSummonsGate()) return;
                                                if (!relaxedPersonal && !forcedSummonAllowed) {
                                                    showToast(
                                                        forcedSummonLockReason ||
                                                            'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.',
                                                        'warning',
                                                        {
                                                            action: {
                                                                label: 'مركز التبليغات',
                                                                onClick: () => onOpenSummonsCenter(),
                                                            },
                                                        }
                                                    );
                                                    return;
                                                }
                                                runForcedBringSubmit(false);
                                            }}
                                        />
                                    </div>
                                ) : null}
                            </CoerciveSubsectionFold>
                        </div>
                    ) : null}

                    {forcedShowStartStrip ? (
                        <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
                                <button
                                    type="button"
                                    disabled={sendingKey === 'forced_bring_in'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        runForcedBringSubmit(true);
                                    }}
                                    className="group w-full rounded-xl border border-[#E6C673]/35 bg-gradient-to-l from-amber-500/18 via-amber-600/10 to-violet-950/20 py-3 text-[11px] font-black text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all hover:border-[#E6C673]/55 hover:from-amber-500/28 hover:shadow-[0_0_24px_rgba(230,198,115,0.12)] disabled:opacity-50"
                                >
                                    <span className="flex flex-row-reverse items-center justify-center gap-2">
                                        <Gavel
                                            size={15}
                                            className="text-[#E6C673]/85 transition-colors group-hover:text-[#E6C673]"
                                        />
                                        تفعيل بقرار المنفذ العدل
                                    </span>
                                </button>
                                <RejectedExecutorResubmitStrip
                                    showReplaceHint={hasOpenCardForSubtype('forced_bring_in')}
                                    submitting={sendingKey === 'forced_bring_in'}
                                    disabled={sendingKey === 'forced_bring_in'}
                                    onConfirmSubmit={() => {
                                        if (!relaxedPersonal && !guardSummonsGate()) return;
                                        if (!relaxedPersonal && !forcedSummonAllowed) {
                                            showToast(
                                                forcedSummonLockReason ||
                                                    'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.',
                                                'warning',
                                                {
                                                    action: {
                                                        label: 'مركز التبليغات',
                                                        onClick: () => onOpenSummonsCenter(),
                                                    },
                                                }
                                            );
                                            return;
                                        }
                                        runForcedBringSubmit(false);
                                    }}
                                />
                        </div>
                    ) : null}

                    {forcedFlowStep === 'outcome_choice' ? (
                        <div className="border-t border-white/10 px-3 pb-2 pt-3 space-y-3 text-right">
                            <div className="space-y-1.5 border-b border-white/10 pb-2">
                                <p className="text-[10px] font-bold text-emerald-200/90">
                                    {forcedByExecutorOrder
                                        ? '✓ بناء على قرار المنفذ العدل'
                                        : '✓ طلب إحضار جبري — تم الإرسال'}
                                </p>
                                {!forcedByExecutorOrder ? (
                                    <p className="text-[10px] font-bold text-emerald-200/90">
                                        ✓ قرار المنفذ — تمت الموافقة
                                    </p>
                                ) : null}
                                <p className="text-[10px] text-slate-500">
                                    {forcedByExecutorOrder
                                        ? 'الخطوة التالية: تسجيل نتيجة التنفيذ الميداني — والمدين هو الطاعن في بطاقة القرارات عند الحاجة.'
                                        : 'الخطوة التالية: تسجيل نتيجة التنفيذ الميداني.'}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[11px] font-black text-amber-100">تسجيل النتيجة</p>
                                <p className="text-[10px] text-slate-400">اختر أحد الخيارين ثم أكّد</p>
                                <div
                                    className="grid grid-cols-1 gap-2"
                                    role="radiogroup"
                                    aria-label="نتيجة الإحضار الجبري"
                                >
                                    <button
                                        type="button"
                                        disabled={coerciveUiLocked}
                                        aria-pressed={forcedOutcomePick === 'brought'}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setForcedOutcomePick('brought');
                                        }}
                                        className={`w-full rounded-xl border px-3 py-2.5 text-[11px] font-bold transition ${
                                            forcedOutcomePick === 'brought'
                                                ? 'border-emerald-500/50 bg-emerald-950/45 text-emerald-100 ring-1 ring-emerald-500/35'
                                                : 'border-white/10 bg-[#0A0F1C]/80 text-slate-200 hover:border-emerald-500/30 hover:bg-emerald-950/25'
                                        } disabled:opacity-40`}
                                    >
                                        تم إحضار المدين
                                    </button>
                                    <button
                                        type="button"
                                        disabled={coerciveUiLocked}
                                        aria-pressed={forcedOutcomePick === 'absconded'}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setForcedOutcomePick('absconded');
                                        }}
                                        className={`w-full rounded-xl border px-3 py-2.5 text-[11px] font-bold transition ${
                                            forcedOutcomePick === 'absconded'
                                                ? 'border-rose-500/45 bg-rose-950/40 text-rose-100 ring-1 ring-rose-500/35'
                                                : 'border-white/10 bg-[#0A0F1C]/80 text-slate-200 hover:border-rose-500/30 hover:bg-rose-950/25'
                                        } disabled:opacity-40`}
                                    >
                                        المدين متخفي عن الأنظار
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    disabled={!forcedOutcomePick || coerciveUiLocked}
                                    className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (
                                            forcedOutcomePick !== 'brought' &&
                                            forcedOutcomePick !== 'absconded'
                                        ) {
                                            return;
                                        }
                                        recordForcedOutcome(forcedOutcomePick);
                                        setForcedOutcomePick('');
                                    }}
                                >
                                    تأكيد التسجيل
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
            </div>
            ) : null}

            {/* 2 — مفاتحة تحقيق */}
            {showEmbeddedSection('arrest_warrant_investigation') && showInvestigationBlock ? (
                <div className="overflow-visible rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                if (investigationButtonDisabled) return;
                                if (arrest.rejected) return;
                                if (investigationHasExpandablePanel) {
                                    return;
                                }
                                if (!guardSummonsGate()) return;
                                setConfirmingKey('arrest_warrant_investigation');
                            }}
                            disabled={investigationButtonDisabled && !investigationHasExpandablePanel}
                            className={`w-full ${BTN_BASE} bg-gradient-to-l from-rose-500/12 to-transparent hover:from-rose-500/18 ${investigationButtonDisabled && !investigationHasExpandablePanel ? BTN_DISABLED : ''}`}
                        >
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <ShieldAlert className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-white">{investigationButtonLabel}</p>
                                </div>
                            </div>
                        </button>

                        {investigationFlowStep === 'followup_blocked'
                            ? renderAppealSyncFollowup(arrestSync)
                            : null}

                        {investigationFlowStep === 'executor_pending' ? (
                            <div className="border-t border-white/10 px-3 py-3">
                                <CoerciveSubsectionFold
                                    flat
                                    title="طلب المفاتحة — قيد البت لدى المنفذ"
                                    titleClassName="text-amber-100"
                                >
                                    <ExecutionInlineExecutorDecisionActions
                                        executionId={exId}
                                        decisionId={
                                            findLatestDecisionIdForSubtype('arrest_warrant_investigation') || ''
                                        }
                                        decisionRow={findLatestDecisionRowForSubtype(
                                            'arrest_warrant_investigation'
                                        )}
                                        requestKind="personal_coercive"
                                        personalCoerciveSubtype="arrest_warrant_investigation"
                                        suppressNavigatorToast
                                        onResolved={handleExecutorInlineResolved}
                                    />
                                </CoerciveSubsectionFold>
                            </div>
                        ) : null}

                        {renderInlineGate('arrest_warrant_investigation', () => {
                            setSendingKey('arrest_warrant_investigation');
                            void submitRequest(
                                'arrest_warrant_investigation',
                                'طلب مفاتحة محكمة التحقيق لإصدار أمر قبض',
                                'بعد تعذّر الإحضار الجبري وتخلّف المدين عن المثول، طُلب توجيه كتاب مفاتحة لمحكمة التحقيق المختصة لإصدار أمر قبض أصولي.'
                            ).then(() => {
                                setSendingKey(null);
                                setConfirmingKey(null);
                            });
                        })}

                        {arrest.rejected ? (
                            <div className="border-t border-white/10 px-3 pb-3 pt-2">
                                <CoerciveSubsectionFold flat title="تم رفض الطلب من قبل المنفذ">
                                    <ExecutionInlineExecutorDecisionActions
                                        executionId={exId}
                                        decisionId={
                                            findLatestDecisionIdForSubtype('arrest_warrant_investigation') || ''
                                        }
                                        requestKind="personal_coercive"
                                        personalCoerciveSubtype="arrest_warrant_investigation"
                                        suppressNavigatorToast
                                        disabled
                                        onOpenAppealCenter={() =>
                                            onOpenDecisions({
                                                tab: 'previous',
                                                decisionId: findLatestDecisionIdForSubtype(
                                                    'arrest_warrant_investigation'
                                                ),
                                            })
                                        }
                                    />
                                    {renderWaiveInitialAppeal(
                                        findLatestDecisionIdForSubtype('arrest_warrant_investigation')
                                    )}
                                    {arrestShowResubmitStrip ? (
                                        <div className="border-t border-white/10 pt-2">
                                            <RejectedExecutorResubmitStrip
                                                showReplaceHint={hasOpenCardForSubtype(
                                                    'arrest_warrant_investigation'
                                                )}
                                                submitting={sendingKey === 'arrest_warrant_investigation'}
                                                onConfirmSubmit={() => runArrestInvestigationSubmit()}
                                            />
                                        </div>
                                    ) : null}
                                </CoerciveSubsectionFold>
                            </div>
                        ) : null}

                        {investigationFlowStep === 'outcome_choice' ? (
                            <div className="relative z-10 mx-3 mb-2 mt-2 space-y-3 rounded-2xl border border-white/10 bg-black/15 px-3 pb-3 pt-3 text-right">
                                <div className="space-y-1 border-b border-white/10 pb-2">
                                    <p className="text-[11px] font-black text-amber-100">
                                        مفاتحة محكمة التحقيق — بعد موافقة المنفذ
                                    </p>
                                    <p className="text-[10px] text-slate-400">اختر النتيجة المناسبة.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        type="button"
                                        disabled={coerciveUiLocked}
                                        className="w-full rounded-xl border border-rose-500/40 bg-rose-950/40 py-2.5 text-[11px] font-bold text-rose-100 disabled:opacity-40"
                                        onClick={() => markWarrantIssued()}
                                    >
                                        تم إصدار مذكرة قبض
                                    </button>
                                    <button
                                        type="button"
                                        disabled={coerciveUiLocked}
                                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-800/55 py-2.5 text-[11px] font-bold text-white disabled:opacity-40"
                                        onClick={() => recordInvestigationDebtorAttended()}
                                    >
                                        حضور المدين
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {investigationFlowStep === 'warrant_custody' ? (
                            <div className="relative z-10 mx-3 mb-2 mt-2 space-y-3 rounded-2xl border border-white/10 bg-black/15 px-3 pb-3 pt-3 text-right">
                                <div className="space-y-1 border-b border-white/10 pb-2">
                                    <p className="text-[11px] font-black text-rose-100">مذكرة قبض — تأمين الإحضار</p>
                                    <p className="text-[10px] text-slate-400">
                                        بعد صدور المذكرة، سجّل تأمين الإحضار لإغلاق الدورة.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    disabled={coerciveUiLocked}
                                    className="w-full rounded-xl border border-emerald-500/35 bg-emerald-800/55 py-2.5 text-[11px] font-bold text-white disabled:opacity-40"
                                    onClick={() => recordSecuredBringAfterWarrant()}
                                >
                                    تم تأمين إحضار
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {/* 3 — منع سفر */}
            {showEmbeddedSection('travel_ban') ? (
            <details
                className={COERCIVE_SECTION_DETAILS_CLASS}
                open={travelDetailsOpen}
                onToggle={(e) => setTravelDetailsOpen((e.target as HTMLDetailsElement).open)}
            >
                <summary className="flex cursor-pointer list-none flex-row-reverse items-center justify-between gap-2 px-3 py-3 transition-colors duration-300 hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                    <span className="flex flex-row-reverse items-center gap-2">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-white/5">
                            <Plane className="size-6 text-white/70" />
                        </span>
                        <span className="text-xs font-bold text-sky-100">{travelButtonLabel}</span>
                    </span>
                    <ChevronDown
                        size={18}
                        className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180"
                        aria-hidden
                    />
                </summary>
                {travelPanelHasBody ? (
                <div className="relative space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
                    {travelShowLiftAction ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                liftTravelBanEnforcement();
                            }}
                            className="w-full rounded-xl border border-sky-500/25 bg-gradient-to-l from-sky-500/12 to-transparent px-3 py-2.5 text-[11px] font-bold text-sky-100 transition-all hover:from-sky-500/18"
                        >
                            رفع منع السفر
                        </button>
                    ) : null}
                    {travelShowEnforcedAwaitingDebt ? (
                        <p className="rounded-xl border border-sky-500/20 bg-sky-950/20 px-3 py-2.5 text-[10px] leading-relaxed text-sky-100/90">
                            منع السفر مفعّل — يُرفع تلقائياً بعد سداد الدين بالكامل.
                        </p>
                    ) : null}
                    {travelShowInitialSubmit ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (travelSubmitButtonDisabled) return;
                                if (!guardSummonsGate()) return;
                                if (!canSubmitTravelBan) return;
                                setConfirmingKey('travel_ban');
                            }}
                            disabled={travelSubmitButtonDisabled}
                            className="w-full rounded-xl border border-sky-500/25 bg-gradient-to-l from-sky-500/12 to-transparent px-3 py-2.5 text-[11px] font-bold text-sky-100 transition-all hover:from-sky-500/18 disabled:opacity-40"
                        >
                            تقديم طلب منع سفر
                        </button>
                    ) : null}
                    {renderInlineGate('travel_ban', () => {
                        setSendingKey('travel_ban');
                        if (travel.pending || travel.rejected) {
                            setSendingKey(null);
                            setConfirmingKey(null);
                            return;
                        }
                        void submitRequest(
                            'travel_ban',
                            'طلب وضع إشارة منع سفر على المدين',
                            'طلب توجيه كتاب إلى مديرية الجوازات والإقامة لمنع سفر المدين لحين البتّ في التنفيذ.'
                        ).then(() => {
                            setSendingKey(null);
                            setConfirmingKey(null);
                        });
                    })}
                    {travelUiApproved ? renderAppealSyncFollowup(travelSync) : null}
                    {!travelBanWithdrawn && travelCycleActive && (travel.pending || travel.rejected) ? (
                            travel.rejected ? (
                                <CoerciveSubsectionFold flat title="تم رفض الطلب من قبل المنفذ">
                                    <ExecutionInlineExecutorDecisionActions
                                        executionId={exId}
                                        decisionId={findLatestDecisionIdForSubtype('travel_ban') || ''}
                                        requestKind="personal_coercive"
                                        personalCoerciveSubtype="travel_ban"
                                        suppressNavigatorToast
                                        disabled
                                        onOpenAppealCenter={() =>
                                            onOpenDecisions({
                                                tab: 'previous',
                                                decisionId: findLatestDecisionIdForSubtype('travel_ban'),
                                            })
                                        }
                                    />
                                    {renderWaiveInitialAppeal(findLatestDecisionIdForSubtype('travel_ban'))}
                                    {travelShowResubmitStrip ? (
                                        <div className="border-t border-white/10 pt-2">
                                            <RejectedExecutorResubmitStrip
                                                showReplaceHint={hasOpenCardForSubtype('travel_ban')}
                                                submitting={sendingKey === 'travel_ban'}
                                                onConfirmSubmit={() => runTravelBanSubmit()}
                                            />
                                        </div>
                                    ) : null}
                                </CoerciveSubsectionFold>
                            ) : (
                                <CoerciveSubsectionFold
                                    flat
                                    title="طلب منع السفر — قيد البت لدى المنفذ"
                                    titleClassName="text-sky-100"
                                >
                                    <ExecutionInlineExecutorDecisionActions
                                        executionId={exId}
                                        decisionId={findLatestDecisionIdForSubtype('travel_ban') || ''}
                                        decisionRow={findLatestDecisionRowForSubtype('travel_ban')}
                                        requestKind="personal_coercive"
                                        personalCoerciveSubtype="travel_ban"
                                        suppressNavigatorToast
                                        onResolved={handleExecutorInlineResolved}
                                    />
                                </CoerciveSubsectionFold>
                            )
                    ) : null}
                </div>
                ) : null}
            </details>
            ) : null}

            {/* 4أ — طلب عرض الإضبارة (قرار المنفذ فقط) */}
            {showEmbeddedSection('executive_dossier_presentation') && showDossierPresentationCard ? (
                <details
                    ref={detentionDetailsRef}
                    open={dossierDetailsOpen}
                    onToggle={(e) => setDossierDetailsOpen((e.target as HTMLDetailsElement).open)}
                    className={`${COERCIVE_SECTION_DETAILS_CLASS} ${kasabCoerciveEmphasis ? 'ring-2 ring-[#E6C673]/45 border-[#E6C673]/35' : ''}`}
                >
                    <summary className="flex cursor-pointer list-none flex-row-reverse items-center justify-between gap-2 px-3 py-3 transition-colors duration-300 hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                        <span className="flex flex-row-reverse items-center gap-2">
                            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/5">
                                <Scale className="size-6 text-white/70" />
                            </span>
                            <span className="text-xs font-bold text-amber-100">عرض الإضبارة على قاضي البداءة</span>
                        </span>
                        <ChevronDown
                            size={18}
                            className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180"
                            aria-hidden
                        />
                    </summary>
                    <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
                        {dossier.pending ? (
                            <CoerciveSubsectionFold
                                flat
                                title="طلب عرض الإضبارة — قيد البت لدى المنفذ"
                                titleClassName="text-amber-200"
                            >
                                <ExecutionInlineExecutorDecisionActions
                                    executionId={exId}
                                    decisionId={findGoverningDossierDecisionId() || ''}
                                    decisionRow={dossierGoverningRow}
                                    requestKind="personal_coercive"
                                    personalCoerciveSubtype="executive_dossier_presentation"
                                    suppressNavigatorToast
                                    onResolved={handleExecutorInlineResolved}
                                />
                            </CoerciveSubsectionFold>
                        ) : dossier.rejected ? (
                            <CoerciveSubsectionFold flat title="رفض المنفذ طلب عرض الإضبارة">
                                <ExecutionInlineExecutorDecisionActions
                                    executionId={exId}
                                    decisionId={findGoverningDossierDecisionId() || ''}
                                    requestKind="personal_coercive"
                                    personalCoerciveSubtype="executive_dossier_presentation"
                                    suppressNavigatorToast
                                    disabled
                                    onOpenAppealCenter={() =>
                                        onOpenDecisions({
                                            tab: 'previous',
                                            decisionId: findGoverningDossierDecisionId(),
                                        })
                                    }
                                />
                                {renderWaiveInitialAppeal(findGoverningDossierDecisionId())}
                                {dossierShowResubmitStrip ? (
                                    <div className="space-y-2 border-t border-white/10 pt-2">
                                        <RejectedExecutorResubmitStrip
                                            showReplaceHint={hasOpenCardForSubtype(
                                                'executive_dossier_presentation'
                                            )}
                                            submitting={sendingKey === 'executive_dossier_presentation'}
                                            disabled={!canSubmitExecutiveDetention}
                                            onConfirmSubmit={() => runDossierPresentationSubmit()}
                                            linkLabel="أو: إرسال طلب للقرارات"
                                            confirmLabel="تأكيد إرسال الطلب للمنفذ"
                                        />
                                    </div>
                                ) : null}
                            </CoerciveSubsectionFold>
                        ) : dossier.alternative ? (
                            <p className="text-[10px] text-amber-200/90">
                                🔄 سُجّل قرار بديل للمنفذ — راجع المهام ومحضر المتابعة.
                            </p>
                        ) : dossierExecutorApproved ? (
                            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2.5 space-y-1">
                                <p className="text-[10px] font-bold text-emerald-200">
                                    ✓ وافق المنفذ على عرض الإضبارة
                                </p>
                                <p className="text-[10px] leading-relaxed text-emerald-200/75">
                                    انتهى دور المنفذ — الطلب يبقى مسجّلاً هنا. قرار القاضي في البطاقة
                                    المستقلة أدناه.
                                </p>
                            </div>
                        ) : dossier.approved && dossierSync.followupBlock ? (
                            renderAppealSyncFollowup(dossierSync)
                        ) : dossierIdle ? (
                            <>
                        {!relaxedPersonal && !debtorNotified ? (
                            <p className="text-[10px] leading-relaxed text-amber-200/90 rounded-xl border border-amber-500/20 bg-amber-950/15 px-3 py-2">
                                يجب تبليغ المدين أولاً قبل تقديم طلب عرض الإضبارة.
                            </p>
                        ) : null}
                        <button
                            type="button"
                            disabled={!canSubmitExecutiveDetention || sendingKey === 'executive_dossier_presentation'}
                            onClick={() => runDossierPresentationSubmit()}
                            className="group w-full rounded-xl border border-[#E6C673]/35 bg-gradient-to-l from-orange-500/18 via-violet-600/10 to-violet-950/20 py-3 text-[11px] font-black text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all hover:border-[#E6C673]/55 hover:from-orange-500/28 hover:shadow-[0_0_24px_rgba(230,198,115,0.12)] disabled:opacity-50"
                        >
                            <span className="flex flex-row-reverse items-center justify-center gap-2">
                                <Scale
                                    size={15}
                                    className="text-[#E6C673]/85 transition-colors group-hover:text-[#E6C673]"
                                />
                                عرض الإضبارة على قاضي البداءة
                            </span>
                        </button>
                    </>
                        ) : (
                            <p className="text-[10px] text-slate-400">
                                لا إجراء متاح حالياً — راجع مركز القرارات.
                            </p>
                        )}
                    </div>
                </details>
            ) : null}

            {/* 4ب — قرار القاضي والحبس التنفيذي (بطاقة مستقلة) */}
            {showEmbeddedSection('executive_detention_judge') && showJudgeDetentionCard ? (
                <details
                    open={judgeDetailsOpen}
                    onToggle={(e) => setJudgeDetailsOpen((e.target as HTMLDetailsElement).open)}
                    className={`${COERCIVE_SECTION_DETAILS_CLASS} open:border-orange-400/40`}
                >
                    <summary className="flex cursor-pointer list-none flex-row-reverse items-center justify-between gap-2 px-3 py-3 transition-colors duration-300 hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                        <span className="flex flex-row-reverse items-center gap-2">
                            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/5">
                                <UserX className="size-6 text-white/70" />
                            </span>
                            <span className="text-xs font-bold text-orange-100">قرار القاضي — الحبس التنفيذي</span>
                        </span>
                        <ChevronDown
                            size={18}
                            className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180"
                            aria-hidden
                        />
                    </summary>
                    <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
                        {detentionActive && detentionUntil ? (
                            <p className="text-[10px] text-orange-200">
                                🔒 موقوف تنفيذياً — حتى {detentionUntil}
                            </p>
                        ) : null}
                        {!detentionActive && dossierAwaitingJudge ? (
                            <div className="space-y-2">
                                <p className="text-[11px] font-black text-violet-200">بانتظار قرار قاضي البداءة</p>
                                <p className="text-[10px] leading-relaxed text-violet-200/80">
                                    انتهى دور المنفذ — سجّل موافقة أو رفض القاضي. يُنشأ قرار مستقل في مركز
                                    القرارات.
                                </p>
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        type="button"
                                        disabled={coerciveWriteLocked}
                                        className="w-full rounded-xl bg-emerald-800/55 py-2 text-[11px] font-bold text-white border border-emerald-500/35 disabled:opacity-40"
                                        onClick={() => {
                                            if (coerciveWriteLocked) return;
                                            recordExecutiveDetentionJudgeOutcome(
                                                'approved',
                                                new Date().toISOString()
                                            );
                                        }}
                                    >
                                        وافق القاضي على الحبس
                                    </button>
                                    <button
                                        type="button"
                                        disabled={coerciveWriteLocked}
                                        className="w-full rounded-xl border border-rose-500/45 bg-rose-950/35 py-2 text-[11px] font-bold text-rose-100 disabled:opacity-40"
                                        onClick={() => {
                                            if (coerciveWriteLocked) return;
                                            setDetentionRejectionOpen(true);
                                        }}
                                    >
                                        رفض القاضي حبس المدين
                                    </button>
                                </div>
                                {detentionRejectionOpen ? (
                                    <div className="space-y-2 rounded-2xl border border-rose-500/25 bg-rose-950/15 p-3">
                                        <p className="text-[10px] font-bold text-rose-200">يرجى ذكر سبب الرفض</p>
                                        <textarea
                                            value={detentionRejectionReason}
                                            onChange={(e) => setDetentionRejectionReason(e.target.value)}
                                            rows={3}
                                            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[11px] text-white"
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                disabled={detentionRejectionSaving || coerciveWriteLocked}
                                                className="rounded-xl border border-rose-500/40 bg-rose-900/30 py-2.5 text-[11px] font-black text-rose-100 disabled:opacity-50"
                                                onClick={() => {
                                                    if (coerciveWriteLocked) return;
                                                    const reason = detentionRejectionReason.trim();
                                                    if (!reason) {
                                                        showToast('سبب الرفض مطلوب.', 'warning');
                                                        return;
                                                    }
                                                    if (detentionRejectionSaving) return;
                                                    setDetentionRejectionSaving(true);
                                                    recordExecutiveDetentionJudgeOutcome(
                                                        'rejected',
                                                        new Date().toISOString(),
                                                        reason
                                                    );
                                                    setDetentionRejectionSaving(false);
                                                    setDetentionRejectionOpen(false);
                                                    setDetentionRejectionReason('');
                                                }}
                                            >
                                                حفظ السبب والانتقال للطعن
                                            </button>
                                            <button
                                                type="button"
                                                disabled={detentionRejectionSaving}
                                                className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                                                onClick={() => {
                                                    setDetentionRejectionOpen(false);
                                                    setDetentionRejectionReason('');
                                                }}
                                            >
                                                إلغاء
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        {!detentionActive &&
                        judgeDetention === 'approved' &&
                        judgeDetentionStored === 'rejected' &&
                        dossierPhase === 'judge_decided' ? (
                            <p className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2.5 text-[10px] leading-relaxed text-emerald-100/90">
                                تم نقض رفض القاضي تمييزياً — أصبح الحبس التنفيذي موافقاً عليه. يمكنك بدء
                                المدة أدناه.
                            </p>
                        ) : null}
                        {!detentionActive && dossierShowStartPeriod ? (
                            <CoerciveSubsectionFold
                                title="بدء مدة الحبس التنفيذي"
                                titleClassName="text-emerald-200"
                            >
                                <p className="text-[10px] text-emerald-200/90">
                                    وافق القاضي — تُحتسب المدة تلقائياً لمدة 4 أشهر.
                                </p>
                                {inAbsentia ? (
                                    <button
                                        type="button"
                                        disabled={coerciveWriteLocked}
                                        className="w-full rounded-xl bg-orange-800/55 py-2 text-[11px] font-bold text-white disabled:opacity-40"
                                        onClick={() => {
                                            if (coerciveWriteLocked) return;
                                            startDetentionFourMonths({ markCustody: true, markArrested: true });
                                        }}
                                    >
                                        تم إلقاء القبض على المدين — بدء المدة
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={coerciveWriteLocked}
                                        className="w-full rounded-xl bg-orange-800/55 py-2 text-[11px] font-bold text-white disabled:opacity-40"
                                        onClick={() => {
                                            if (coerciveWriteLocked) return;
                                            startDetentionFourMonths({ markCustody: true });
                                        }}
                                    >
                                        بدء المدة (4 أشهر)
                                    </button>
                                )}
                            </CoerciveSubsectionFold>
                        ) : null}
                        {judgeSync.followupBlock ? renderAppealSyncFollowup(judgeSync) : null}
                        {!detentionActive &&
                        !dossierAwaitingJudge &&
                        !judgeSync.followupBlock &&
                        !judgeSync.cycleSuperseded &&
                        judgeDetention === 'rejected' &&
                        dossierPhase === 'judge_decided' ? (
                            renderJudgeRejectedResubmitBlock()
                        ) : null}
                        {!detentionActive &&
                        !dossierAwaitingJudge &&
                        !dossierShowStartPeriod &&
                        judgeDetention !== 'rejected' &&
                        dossierPhase === 'judge_decided' ? (
                            <p className="text-[10px] text-slate-400">
                                لا إجراء متاح حالياً على قرار القاضي.
                            </p>
                        ) : null}
                    </div>
                </details>
            ) : null}

            {onGuarantorRequest && (
                <div className="space-y-2">
                    {guarantorDec.pending ? (
                        <p className="text-[10px] text-amber-200/90 text-center leading-relaxed">
                            طلب الكفيل قيد البت لدى المنفذ — راجع «القرارات والطعون».
                        </p>
                    ) : guarantorDec.rejected ? (
                        <p className="text-[10px] text-rose-200/90 text-center leading-relaxed">
                            رُفض طلب الكفيل — يمكنك التقديم مجدداً إن رُفع الرفض أو تغيّر الموقف.
                        </p>
                    ) : guarantorDec.alternative ? (
                        <p className="text-[10px] text-amber-200/90 text-center leading-relaxed">
                            سُجِّل قرار بديل بشأن الكفيل — راجع القرارات.
                        </p>
                    ) : guarantorFollowupBlock ? (
                        <p className="text-[10px] text-amber-200/90 text-center leading-relaxed">
                            متوقف مؤقتاً — راجع مركز القرارات والطعون.
                        </p>
                    ) : guarantorAwaitingSave ? (
                        <p className="text-[10px] text-emerald-200/90 text-center leading-relaxed">
                            وافق المنفذ — أكمل وحفظ بيانات الكفيل من اسم الكفيل أسفل المدين أو من الزر أدناه.
                        </p>
                    ) : null}
                    {guarantorDec.pending || guarantorDec.rejected ? (
                        <div className="mt-2">
                            {guarantorDec.rejected ? (
                                <>
                                    <ExecutionInlineExecutorDecisionActions
                                        executionId={exId}
                                        decisionId={findLatestGuarantorDecisionId() || ''}
                                        requestKind="guarantor_request"
                                        suppressNavigatorToast
                                        disabled
                                        onOpenAppealCenter={() =>
                                            onOpenDecisions({
                                                tab: 'previous',
                                                decisionId: findLatestGuarantorDecisionId(),
                                            })
                                        }
                                    />
                                    {renderWaiveInitialAppeal(findLatestGuarantorDecisionId())}
                                </>
                            ) : (
                                <ExecutionInlineExecutorDecisionActions
                                    executionId={exId}
                                    decisionId={findLatestGuarantorDecisionId() || ''}
                                    requestKind="guarantor_request"
                                    suppressNavigatorToast
                                />
                            )}
                        </div>
                    ) : null}
                    {guarantorFollowupBlock && findLatestGuarantorDecisionRow() ? (
                        <div className="mt-2">
                            <ExecutorRequestFollowupBlockPanel
                                gate={guarantorFollowupBlock}
                                executionId={exId}
                                decisionId={String(findLatestGuarantorDecisionId() || '').trim()}
                                onOpenAppeals={(id) => onOpenDecisions({ tab: 'previous', decisionId: id })}
                            />
                        </div>
                    ) : null}
                    {guarantorAwaitingSave && !guarantorFollowupBlock && onOpenGuarantorDetails ? (
                        <button
                            type="button"
                            disabled={coerciveUiLocked}
                            onClick={() => onOpenGuarantorDetails()}
                            className="w-full rounded-xl border border-emerald-500/40 bg-emerald-950/25 py-2.5 text-[11px] font-bold text-emerald-100 disabled:opacity-40"
                        >
                            إكمال بيانات الكفيل
                        </button>
                    ) : null}
                </div>
            )}

            {detentionActive && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            if (coerciveUiLocked || isHistoricalMode) return;
                            setReleaseConfirmOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 flex-row-reverse rounded-xl border border-emerald-800 bg-emerald-900/20 py-2.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-800/30 transition-all disabled:opacity-40"
                        disabled={coerciveUiLocked || isHistoricalMode}
                    >
                        <Unlock size={16} />
                        طلب إخلاء سبيل المدين
                    </button>
                </div>
            )}
        </div>
    );
};
