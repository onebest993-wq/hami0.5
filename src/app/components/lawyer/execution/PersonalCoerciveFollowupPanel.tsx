// @ts-nocheck
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { UserX, Plane, ShieldAlert, Gavel, X, ChevronDown, Unlock, Send, Scale } from '@/app/components/ui/lucideIcons';
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
    hasActivePersonalCoerciveSubtypeCard,
    hasActivePersonalCoerciveSubtypeCardFromDecisions,
    resolvePersonalCoerciveDecisionsNav,
    resolvePersonalCoerciveDecisionsNavFromDecisions,
    resolveExecutorDecisionRowContext,
    isGuarantorRequestDecisionRow,
    patchExecutorDecisionRow,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getGoverningDossierPresentationRowFromDecisions,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    readExecutorDecisionsUnionAcrossCandidateIds,
    warmExecutorDecisionsStorage,
} from '@/app/utils/executionDecisionsNamespace';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
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
import { CryptoService } from '@/app/services/CryptoService';
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
import { isCustodyRemovalExecutionClaim } from '@/app/utils/executionClaimIsolation';

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
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
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
    /** إخفاء بطاقة قرار القاضي بالحبس فقط (≥ 500,000 د.ع في مسار المركز المالي) */
    hideExecutiveDetentionJudgeCard?: boolean;
    /** مسار كاسب + مركز مالي > 250,000 — إجراءات متبقية اختيارية (منع سفر / عرض إضبارة) */
    earnerFinancialPersonalCoerciveActive?: boolean;
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

function coerciveOutcomeFromDecisionRow(row: Record<string, unknown> | null | undefined): {
    pending: boolean;
    approved: boolean;
    rejected: boolean;
    alternative: boolean;
} {
    const last = row ?? null;
    if (!last) {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
    if ((last as { lawyerWithdrawn?: boolean }).lawyerWithdrawn === true) {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
    const out = String((last as { executorOutcome?: string }).executorOutcome || 'pending');
    if (out === 'withdrawn') {
        return { pending: false, approved: false, rejected: false, alternative: false };
    }
    if (out === 'pending') {
        return { pending: true, approved: false, rejected: false, alternative: false };
    }
    if (out === 'alternative') {
        return { pending: false, approved: false, rejected: false, alternative: true };
    }
    if (isExecutorRowEffectivelyApproved(last)) {
        return { pending: false, approved: true, rejected: false, alternative: false };
    }
    if (isExecutorRowRejectedAndFinal(last)) {
        return { pending: false, approved: false, rejected: true, alternative: false };
    }
    return { pending: false, approved: false, rejected: false, alternative: false };
}

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
    hideExecutiveDetentionJudgeCard = false,
    earnerFinancialPersonalCoerciveActive = false,
    hideExecutorForcedBringActivation = false,
    activeDebtorIsEmployee = false,
    embeddedHiddenPath,
}) => {
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
    const exId = String(executionId ?? executionData?.id ?? '').trim();
    const exKey = exId || undefined;

    const allDecisionRows = useMemo(
        () =>
            exId
                ? readExecutorDecisionsUnionAcrossCandidateIds(
                      exId,
                      executionData as Record<string, unknown> | null | undefined,
                  )
                : [],
        [exId, executionData, decisionsReloadEpoch, localDecisionsTick],
    );
    const allDecisionRowsRef = React.useRef(allDecisionRows);
    allDecisionRowsRef.current = allDecisionRows;

    React.useEffect(() => {
        if (!exKey) return;
        void warmExecutorDecisionsStorage(exKey, executionData as Record<string, unknown> | null | undefined).then(
            () => setLocalDecisionsTick((n) => n + 1),
        );
    }, [exKey, executionData]);

    const applyOptimisticPersistPatch = useCallback((patch: Record<string, unknown>) => {
        setOptimisticPersistPatch((prev) => ({ ...(prev ?? {}), ...patch }));
    }, []);

    const executionDataEffective = useMemo(() => {
        if (!executionData) return executionData;
        let next = executionData as ExecutionFile;
        if (optimisticForcedOutcome) {
            next = { ...next, ...buildForcedBringPersonalOutcomePatch(optimisticForcedOutcome) };
        }
        if (optimisticPersistPatch) {
            next = { ...next, ...optimisticPersistPatch } as ExecutionFile;
        }
        return next;
    }, [executionData, optimisticForcedOutcome, optimisticPersistPatch]);

    useEffect(() => {
        const stored = String(executionData?.forced_bring_in_personal_outcome ?? '').trim();
        if (stored === 'absconded') {
            setOptimisticForcedOutcome(null);
        }
    }, [executionData?.forced_bring_in_personal_outcome]);

    useEffect(() => {
        if (!optimisticPersistPatch) return;
        setOptimisticPersistPatch(null);
    }, [executionData?.updatedAt]);
    const debtorScopeOpts = useMemo(
        () => ({ debtorKey: activeDebtorKey, primaryDebtorKey }),
        [activeDebtorKey, primaryDebtorKey]
    );
    const decisionsNavForSubtype = useCallback(
        (subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype']) =>
            resolvePersonalCoerciveDecisionsNavFromDecisions(allDecisionRows, subtype, debtorScopeOpts),
        [allDecisionRows, debtorScopeOpts],
    );
    const hasOpenCardForSubtype = useCallback(
        (subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype']) =>
            hasActivePersonalCoerciveSubtypeCardFromDecisions(allDecisionRows, subtype, debtorScopeOpts),
        [allDecisionRows, debtorScopeOpts],
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
    const coerciveDecisionStates = useMemo(() => {
        const debtorOpts = { debtorKey: activeDebtorKey, primaryDebtorKey };
        const forcedRow = getGoverningPersonalCoerciveSubtypeRowFromDecisions(
            allDecisionRows,
            'forced_bring_in',
            debtorOpts,
        );
        const arrestRow = getGoverningPersonalCoerciveSubtypeRowFromDecisions(
            allDecisionRows,
            'arrest_warrant_investigation',
            debtorOpts,
        );
        const travelRow = getGoverningPersonalCoerciveSubtypeRowFromDecisions(
            allDecisionRows,
            'travel_ban',
            debtorOpts,
        );
        const dossierRow = getGoverningDossierPresentationRowFromDecisions(allDecisionRows, debtorOpts);
        const guarantorRow = allDecisionRows.find((r) =>
            isGuarantorRequestDecisionRow(r as Record<string, unknown>),
        );
        return {
            forced: coerciveOutcomeFromDecisionRow(forcedRow),
            arrest: coerciveOutcomeFromDecisionRow(arrestRow),
            travel: coerciveOutcomeFromDecisionRow(travelRow),
            dossier: coerciveOutcomeFromDecisionRow(dossierRow),
            guarantor: coerciveOutcomeFromDecisionRow(guarantorRow ?? null),
        };
    }, [allDecisionRows, activeDebtorKey, primaryDebtorKey]);

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
    const dossierPhase = executionDataEffective?.executive_dossier_phase ?? null;
    const dossierEffective = useMemo(
        () => ({
            pending:
                dossier.pending &&
                dossierInlineResolved !== 'approved' &&
                dossierInlineResolved !== 'rejected',
            approved: dossier.approved || dossierInlineResolved === 'approved',
            rejected: dossier.rejected || dossierInlineResolved === 'rejected',
            alternative: dossier.alternative,
        }),
        [dossier, dossierInlineResolved]
    );
    const dossierPhaseEffective = useMemo(() => {
        if (
            dossierInlineResolved === 'approved' &&
            dossierPhase !== 'judge_decided' &&
            dossierPhase !== 'detention_active'
        ) {
            return 'handed_to_judge';
        }
        return dossierPhase;
    }, [dossierInlineResolved, dossierPhase]);
    const fullPersonalCoerciveCycleClosed = isPersonalCoerciveCycleClosed(executionData);
    const detentionReleasedAt = String(
        executionData?.executive_detention_released_or_closed_at ?? ''
    ).trim();
    const detentionPeriodNaturalEnd =
        executionData?.debtor_executive_detention_active === true &&
        !isExecutiveDetentionPeriodActive(executionData) &&
        !detentionReleasedAt &&
        Boolean(String(executionData?.executive_detention_until ?? '').trim());
    /** انتهاء مسار الحبس/عرض الإضبارة — إخلاء سبيل، انتهاء مدة، أو إغلاق دورة كاملة */
    const detentionLaneEnded =
        fullPersonalCoerciveCycleClosed ||
        Boolean(detentionReleasedAt) ||
        detentionPeriodNaturalEnd;
    const guarantorDec = coerciveDecisionStates.guarantor;
    const guarantorAwaitingSave = guarantorFollowupAwaitingDetailsSave(executionData?.guarantor_followup);

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

    const outcome = executionDataEffective?.forced_bring_in_personal_outcome ?? null;
    const forcedOutcomeAbsconded =
        String(outcome ?? '').trim() === 'absconded' ||
        executionDataEffective?.debtorEvaded === true;
    const forcedOutcomeRecorded = forcedOutcomeAbsconded;
    const showForcedBringInSection = showEmbeddedSection('forced_bring_in');
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
        requestEffectivelyEnforced: forcedSync.enforced,
        appealCycleSuperseded: forcedSync.cycleSuperseded,
    });


    const arrestStage = executionDataEffective?.personal_arrest_warrant_stage ?? 'none';
    const travelBanWithdrawn = isDebtorTravelBanWithdrawn(
        executionData,
        activeDebtorKey,
        primaryDebtorKey,
    );
    const travelBanRequestCycleWithdrawn = isDebtorTravelBanCycleWithdrawn(
        executionData,
        activeDebtorKey,
        primaryDebtorKey,
    );
    const travelCycleActive = hasOpenCardForSubtype('travel_ban');
    const travelLaneSettled =
        travelBanWithdrawn ||
        !travelCycleActive ||
        !isDebtorTravelBanActive(executionData, activeDebtorKey, primaryDebtorKey);
    const judgeDetentionStored =
        (executionDataEffective?.executive_detention_judge_outcome as 'approved' | 'rejected' | null) ??
        null;
    const detentionJudgeEligibleDecisionId =
        executionDataEffective?.executive_detention_judge_eligible_decision_id ?? null;
    const dossierGoverningRow = useMemo(
        () =>
            getGoverningDossierPresentationRowFromDecisions(allDecisionRows, {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
        [activeDebtorKey, allDecisionRows, primaryDebtorKey],
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
        !travelBanWithdrawn &&
        isDebtorTravelBanActive(executionData, activeDebtorKey, primaryDebtorKey);
    const travelLiftReady =
        travelBanEnforced &&
        debtRemainingIqd <= 0 &&
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !travelBanWithdrawn;
    const travelShowLiftAction = travelLiftReady;
    const travelShowInitialSubmit =
        !travel.alternative &&
        !travel.pending &&
        !(travel.rejected && travelCycleActive) &&
        (!travelBanEnforced || travelBanRequestCycleWithdrawn) &&
        (!travelCycleActive || travelBanRequestCycleWithdrawn);
    const travelActive = travelBanEnforced && travelCycleActive;
    const wanted = executionDataEffective?.debtor_wanted_arrest_warrant === true;
    const detentionActive = isExecutiveDetentionPeriodActive(executionDataEffective);
    const detentionUntil = executionDataEffective?.executive_detention_until ?? null;
    const detentionInAbsentia = executionData?.executive_detention_request_in_absentia === true;
    const inAbsentia = detentionInAbsentia;
    /** مسار غيابي — من العلم المخزَّن أو من نتيجة «متخفي عن الأنظار» */
    const dossierAbsentiaPathOpen = detentionInAbsentia || forcedOutcomeAbsconded;
    const canActivateDossierAbsentiaPath =
        !dossierAbsentiaPathOpen &&
        !debtorPresentEffective &&
        !relaxedPersonal &&
        (forcedOutcomeAbsconded || gracePeriodEndedFlag);

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

    /** إغلاق مسار الحبس/الإضبارة تلقائياً عند انتهاء المدة — يعود طلب العرض للتفعيل اليدوي */
    useEffect(() => {
        if (isHistoricalMode || !executionData || !exId || !detentionPeriodNaturalEnd) return;
        const nowIso = new Date().toISOString();
        const patch = {
            ...buildExecutiveDetentionReleasePatch(nowIso),
            executive_detention_release_reason: 'انتهاء مدة الحبس التنفيذي',
        };
        if (!executionPatchDiffers(patch)) return;
        const persisted = persistExecutionMerge(patch);
        if (persisted === false) return;
        applyOptimisticPersistPatch(patch);
        archiveExecutiveDetentionCycleDecisions({
            executionId: exId,
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'forced_bring_in',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        setDossierInlineResolved(null);
        setLocalDecisionsTick((n) => n + 1);
        dispatchDecisionsReload();
    }, [
        activeDebtorKey,
        applyOptimisticPersistPatch,
        detentionPeriodNaturalEnd,
        executionData,
        executionPatchDiffers,
        exId,
        isHistoricalMode,
        persistExecutionMerge,
        primaryDebtorKey,
    ]);

    const warrantCustodyRecorded =
        executionDataEffective?.debtor_arrest_warrant_cleared_after_custody === true;
    const investigationSessionOpen =
        executionDataEffective?.personal_arrest_investigation_session_open === true ||
        (executionDataEffective?.personal_arrest_investigation_session_open !== false &&
            arrest.approved &&
            arrestStage === 'pending_court');
    const investigationPostApprovalActive =
        arrest.approved &&
        !warrantCustodyRecorded &&
        (executionDataEffective?.investigationCourtRequested === true || investigationSessionOpen) &&
        !arrestSync.cycleSuperseded &&
        !arrestSync.blocksFieldwork;

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
        if (o === 'brought' || o === 'absconded' || o === 'dismissed') {
            setForcedInlineResolved(null);
        }
    }, [
        executionData?.forced_bring_in_personal_outcome,
        forced.approved,
        forced.pending,
        forced.rejected,
        forcedInlineResolved,
    ]);

    useEffect(() => {
        if (dossierInlineResolved === 'rejected' && dossier.rejected && !dossier.pending) {
            setDossierInlineResolved(null);
            return;
        }
        if (dossierInlineResolved !== 'approved') return;
        if (!dossier.approved || dossier.pending) return;
        const phase = String(executionData?.executive_dossier_phase ?? '').trim();
        if (
            phase === 'handed_to_judge' ||
            phase === 'judge_decided' ||
            phase === 'detention_active'
        ) {
            setDossierInlineResolved(null);
        }
    }, [
        dossier.approved,
        dossier.pending,
        dossier.rejected,
        dossierInlineResolved,
        executionData?.executive_dossier_phase,
    ]);

    const handleExecutorInlineResolved = useCallback(
        (result: {
            ok: boolean;
            outcome?: 'approved' | 'rejected';
            personalCoerciveSubtype?: string;
            storageExecutionId?: string;
            decisionId?: string;
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
                subtype === 'executive_dossier_presentation' &&
                (outcome === 'approved' || outcome === 'rejected')
            ) {
                setDossierInlineResolved(outcome);
            }
            if (
                subtype &&
                outcome &&
                (outcome === 'approved' || outcome === 'rejected' || outcome === 'alternative')
            ) {
                const mergeDecisionId = String(result.decisionId ?? '').trim();
                const merge = buildPersonalCoerciveExecutionMerge({
                    subtype,
                    resolution: outcome,
                    decisionId: mergeDecisionId || undefined,
                });
                const forcedApproveReset =
                    subtype === 'forced_bring_in' && outcome === 'approved'
                        ? {
                              forced_bring_in_personal_outcome: null,
                              debtorEvaded: false,
                          }
                        : {};
                const payload = { ...forcedApproveReset, ...merge };
                if (
                    subtype === 'travel_ban' &&
                    executionData &&
                    (outcome === 'approved' || outcome === 'rejected')
                ) {
                    Object.assign(
                        payload,
                        buildDebtorTravelBanActivePatch(
                            executionData,
                            activeDebtorKey,
                            primaryDebtorKey,
                            outcome === 'approved',
                        ),
                    );
                    if (outcome === 'approved') {
                        Object.assign(
                            payload,
                            buildDebtorTravelBanWithdrawnPatch(
                                executionData,
                                activeDebtorKey,
                                primaryDebtorKey,
                                null,
                            ),
                            buildDebtorTravelBanCycleWithdrawnPatch(
                                executionData,
                                activeDebtorKey,
                                primaryDebtorKey,
                                null,
                            ),
                        );
                    }
                }
                if (Object.keys(payload).length > 0) persistExecutionMerge(payload);
            }
            if (subtype === 'forced_bring_in' && outcome === 'approved') {
                setForcedOutcomePick('');
                showToast('تمت موافقة المنفذ — سجّل نتيجة الإحضار الجبري أدناه.', 'success');
            }
            if (subtype === 'executive_dossier_presentation' && outcome === 'approved') {
                setJudgeDetailsOpen(true);
                if (exId) {
                    closePersonalCoerciveSubtypeDecisionCycle({
                        executionId: exId,
                        subtype: 'executive_dossier_presentation',
                        debtorKey: activeDebtorKey,
                        primaryDebtorKey,
                    });
                }
                showToast('انتهى طلب عرض الإضبارة — سجّل قرار قاضي البداءة في البطاقة أدناه.', 'success');
            }
            if (subtype === 'travel_ban' && outcome === 'approved' && exId) {
                closePersonalCoerciveSubtypeDecisionCycle({
                    executionId: exId,
                    subtype: 'travel_ban',
                    debtorKey: activeDebtorKey,
                    primaryDebtorKey,
                });
            }
            dispatchDecisionsReload();
        },
        [activeDebtorKey, exId, persistExecutionMerge, primaryDebtorKey, showToast]
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
                    allDecisionRowsRef.current.some(
                        (r) => String((r as { id?: string }).id ?? '') === decisionId,
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
            if (
                subtype === 'executive_dossier_presentation' &&
                (outcome === 'approved' || outcome === 'rejected')
            ) {
                setDossierInlineResolved(outcome);
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

    const showInvestigationBlock =
        !employeeDetentionRestricted &&
        shouldShowInvestigationCourtBlock(executionDataEffective, arrest);

    const renderInlineGate = useCallback(
        (
            key: ActionGateKey,
            onConfirm: () => void,
            opts?: { confirmLabel?: string; gateExtra?: React.ReactNode }
        ) => (
            <AnimatePresence initial={false}>
                {confirmingKey === key ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.16 }}
                        className="overflow-hidden border-t border-amber-500/25 bg-gradient-to-b from-amber-950/30 to-transparent px-3 py-3 space-y-2"
                    >
                        {opts?.gateExtra}
                        <div className="flex flex-row-reverse flex-wrap items-center justify-end gap-2">
                            <button
                                type="button"
                                disabled={sendingKey === key}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (sendingKey === key) return;
                                    setConfirmingKey(null);
                                    onConfirm();
                                }}
                                className="rounded-xl border border-amber-500/45 bg-amber-600/20 px-3 py-2.5 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50 min-h-[44px] touch-manipulation"
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
                                className="rounded-xl bg-slate-800 px-3 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50 min-h-[44px] touch-manipulation"
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
            const hit = getGoverningPersonalCoerciveSubtypeRowFromDecisions(allDecisionRows, subtype, {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
            const id = hit ? String((hit as { id?: string }).id || '').trim() : '';
            return id || null;
        },
        [activeDebtorKey, allDecisionRows, primaryDebtorKey],
    );

    const findGoverningDossierDecisionId = useCallback((): string | null => {
        const hit = getGoverningDossierPresentationRowFromDecisions(allDecisionRows, {
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        const id = hit ? String((hit as { id?: string }).id || '').trim() : '';
        const eligible = String(detentionJudgeEligibleDecisionId ?? '').trim();
        return id || eligible || null;
    }, [activeDebtorKey, allDecisionRows, detentionJudgeEligibleDecisionId, primaryDebtorKey]);

    const findLatestGuarantorDecisionId = useCallback((): string | null => {
        if (!exId) return null;
        const hit = allDecisionRows.find((r) => isGuarantorRequestDecisionRow(r as Record<string, unknown>));
        const id = hit ? String((hit as { id?: string }).id || '').trim() : '';
        return id || null;
    }, [allDecisionRows, exId]);

    const findLatestDecisionRowForSubtype = useCallback(
        (subtype: Parameters<typeof appendPersonalCoerciveExecutorRequest>[0]['subtype']) =>
            getGoverningPersonalCoerciveSubtypeRowFromDecisions(allDecisionRows, subtype, {
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            }),
        [activeDebtorKey, allDecisionRows, primaryDebtorKey],
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
            const freshDecisions = readExecutorDecisionsUnionAcrossCandidateIds(
                exId,
                executionData as Record<string, unknown> | null | undefined,
            );
            const waivedRow = freshDecisions.find(
                (r) => String((r as { id?: string }).id ?? '').trim() === String(decisionId).trim()
            ) as Record<string, unknown> | undefined;
            const subtype = String(waivedRow?.personalCoerciveSubtype ?? '').trim() as PersonalCoerciveSubtype;
            if (subtype) {
                const subtypeMerge = buildPersonalCoerciveExecutionMerge({
                    subtype,
                    resolution: 'rejected',
                });
                if (Object.keys(subtypeMerge).length > 0) {
                    persistExecutionMerge(subtypeMerge);
                }
            }
            const syncPatch = buildPersonalCoerciveAppealExecutionSyncPatch({
                executionId: exId,
                executionData: executionData as Record<string, unknown> | null,
                allDecisions: freshDecisions,
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
            if (syncPatch && Object.keys(syncPatch).length > 0) {
                persistExecutionMerge(syncPatch);
            }
            setLocalDecisionsTick((n) => n + 1);
        },
        [
            activeDebtorKey,
            exId,
            executionData,
            nextTimelineId,
            persistExecutionMerge,
            primaryDebtorKey,
            pushTimelineEvent,
            showToast,
            debtorTimelineMeta,
        ]
    );

    const renderWaiveInitialAppeal = useCallback(
        (decisionId: string | null | undefined) => {
            const did = String(decisionId ?? '').trim();
            if (!did || !exId || isHistoricalMode) return null;
            if (isExecutorRejectedAppealFollowupDismissed(did, allDecisionRows)) return null;
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

    const renderRejectedExecutorAppealSection = useCallback(
        (opts: {
            decisionId: string | null | undefined;
            title?: string;
            titleClassName?: string;
            requestKind?: string;
            personalCoerciveSubtype?: PersonalCoerciveSubtype;
        }) => {
            const did = String(opts.decisionId ?? '').trim();
            if (!did || isExecutorRejectedAppealFollowupDismissed(did, allDecisionRows)) {
                return null;
            }
            return (
                <CoerciveSubsectionFold
                    flat
                    title={opts.title ?? 'تم رفض الطلب من قبل المنفذ'}
                    titleClassName={opts.titleClassName}
                >
                    <ExecutionInlineExecutorDecisionActions
                        executionId={exId}
                        decisionId={did}
                        requestKind={opts.requestKind ?? 'personal_coercive'}
                        personalCoerciveSubtype={opts.personalCoerciveSubtype}
                        suppressNavigatorToast
                        disabled
                        onOpenAppealCenter={() =>
                            onOpenDecisions({
                                tab: 'previous',
                                decisionId: did,
                            })
                        }
                    />
                    {renderWaiveInitialAppeal(did)}
                </CoerciveSubsectionFold>
            );
        },
        [allDecisionRows, exId, onOpenDecisions, renderWaiveInitialAppeal]
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
        arrest.pending ||
        investigationPostApprovalActive ||
        Boolean(arrestSync.followupBlock) ||
        arrestSync.blocksFieldwork;

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

    const scopedRequestTitle = useCallback(
        (base: string) => {
            const name = resolveDebtorDisplayNameForKey(
                executionData,
                activeDebtorKey,
                primaryDebtorKey,
            );
            if (!name) return base;
            return `${base} — ${name}`;
        },
        [executionData, activeDebtorKey, primaryDebtorKey],
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
                if (executionData) {
                    persistExecutionMerge({
                        ...buildDebtorTravelBanCycleWithdrawnPatch(
                            executionData,
                            activeDebtorKey,
                            primaryDebtorKey,
                            null,
                        ),
                        ...buildDebtorTravelBanWithdrawnPatch(
                            executionData,
                            activeDebtorKey,
                            primaryDebtorKey,
                            null,
                        ),
                    });
                } else {
                    persistExecutionMerge({
                        travel_ban_withdrawn_at: null,
                        travel_ban_request_cycle_withdrawn_at: null,
                    });
                }
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
                    executive_detention_request_in_absentia: dossierAbsentiaPathOpen,
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
            setConfirmingKey(null);
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
            dossierAbsentiaPathOpen,
        ]
    );

    const recordForcedOutcome = (v: ForcedBringPersonalOutcome) => {
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
        const basePatch = buildForcedBringPersonalOutcomePatch(v);
        const persisted = persistExecutionMerge(basePatch);
        if (persisted === false) {
            showToast('تعذّر حفظ نتيجة الإحضار — أعِد المحاولة', 'error');
            return;
        }
        setOptimisticForcedOutcome(v === 'absconded' ? 'absconded' : null);
        setForcedOutcomePick('');

        const now = new Date().toISOString();
        const label =
            v === 'brought'
                ? '✅ تم إحضار المدين أمام المنفذ'
                : v === 'dismissed'
                  ? '↩️ تم تجاهل متابعة الإحضار الجبري'
                  : '⚠️ المدين متخفي عن الأنظار';
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: label,
            description: 'تسجيل نتيجة مسار الإحضار الجبري الشخصي بشأن المدين.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'forced_bring_in',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        setLocalDecisionsTick((n) => n + 1);
        setForcedInlineResolved(null);

        if (v === 'brought') {
            showToast('تم التسجيل — أُعيدت دورة الإحضار الجبري ويمكنك تقديم طلب جديد عند الحاجة.', 'success');
            return;
        }
        if (v === 'dismissed') {
            showToast('تم التجاهل — أُعيدت دورة الإحضار الجبري ويمكنك تقديم طلب جديد عند الحاجة.', 'info');
            return;
        }

        showToast('تم تسجيل «متخفي عن الأنظار» — اضغط بطاقة مفاتحة التحقيق لتقديم الطلب يدوياً.', 'success');
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
        if (coerciveWriteLocked) {
            showToast('لا يمكن التسجيل — المحضر مقفول أو في وضع أرشيف.', 'warning');
            return;
        }
        if (arrestSync.blocksFieldwork) {
            showToast(
                arrestSync.followupBlock?.message ??
                    'لا يمكن تسجيل نتيجة المفاتحة — الطلب موقوف بسبب التظلم أو الطعن. أكمل المسار من مركز القرارات.',
                'warning',
                {
                    action: {
                        label: 'مركز القرارات',
                        onClick: () =>
                            onOpenDecisions({
                                tab: arrestSync.decisionsNav.decisionsTab,
                                decisionId:
                                    arrestSync.decisionId ??
                                    findLatestDecisionIdForSubtype('arrest_warrant_investigation') ??
                                    undefined,
                            }),
                    },
                }
            );
            return;
        }
        const patch = buildInvestigationDebtorAttendedPatch();
        const persisted = persistExecutionMerge(patch);
        if (persisted === false) {
            showToast('تعذّر حفظ حضور المدين — أعِد المحاولة.', 'error');
            return;
        }
        applyOptimisticPersistPatch(patch);
        closeInvestigationAndForcedBringDecisionCycles();
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '✅ تم حضور المدين (مفاتحة محكمة التحقيق)',
            description:
                'تسجيل مثول المدين — أُغلقت دورة المفاتحة وأُعيدت دورة الإحضار الجبري لطلب جديد عند الحاجة.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        dispatchDecisionsReload();
        showToast('تم التسجيل — أُعيدت دورة الإحضار الجبري.', 'success');
    };

    const markWarrantIssued = () => {
        if (coerciveWriteLocked) {
            showToast('لا يمكن التسجيل — المحضر مقفول أو في وضع أرشيف.', 'warning');
            return;
        }
        if (arrestSync.blocksFieldwork) {
            showToast(
                arrestSync.followupBlock?.message ??
                    'لا يمكن إصدار مذكرة القبض — الطلب موقوف بسبب التظلم أو الطعن. أكمل المسار من مركز القرارات.',
                'warning',
                {
                    action: {
                        label: 'مركز القرارات',
                        onClick: () =>
                            onOpenDecisions({
                                tab: arrestSync.decisionsNav.decisionsTab,
                                decisionId:
                                    arrestSync.decisionId ??
                                    findLatestDecisionIdForSubtype('arrest_warrant_investigation') ??
                                    undefined,
                            }),
                    },
                }
            );
            return;
        }
        const patch = buildInvestigationWarrantIssuedPatch();
        const persisted = persistExecutionMerge(patch);
        if (persisted === false) {
            showToast('تعذّر حفظ صدور أمر القبض — أعِد المحاولة.', 'error');
            return;
        }
        applyOptimisticPersistPatch(patch);
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
        if (coerciveWriteLocked) {
            showToast('لا يمكن التسجيل — المحضر مقفول أو في وضع أرشيف.', 'warning');
            return;
        }
        if (arrestSync.blocksFieldwork) {
            showToast(
                arrestSync.followupBlock?.message ??
                    'لا يمكن تأمين الإحضار — الطلب موقوف بسبب التظلم أو الطعن. أكمل المسار من مركز القرارات.',
                'warning',
                {
                    action: {
                        label: 'مركز القرارات',
                        onClick: () =>
                            onOpenDecisions({
                                tab: arrestSync.decisionsNav.decisionsTab,
                                decisionId:
                                    arrestSync.decisionId ??
                                    findLatestDecisionIdForSubtype('arrest_warrant_investigation') ??
                                    undefined,
                            }),
                    },
                }
            );
            return;
        }
        const patch = buildInvestigationSecuredBringPatch();
        const persisted = persistExecutionMerge(patch);
        if (persisted === false) {
            showToast('تعذّر حفظ تأمين الإحضار — أعِد المحاولة.', 'error');
            return;
        }
        applyOptimisticPersistPatch(patch);
        closeInvestigationAndForcedBringDecisionCycles();
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: getLocalTodayYmd(),
            timestamp: now,
            title: '✅ تم تأمين إحضار المدين',
            description:
                'تسجيل تنفيذ مذكرة القبض وتأمين الإحضار — أُغلقت دورة المفاتحة وأُعيدت دورة الإحضار الجبري.',
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: debtorTimelineMeta,
        });
        dispatchDecisionsReload();
        showToast('تم تأمين الإحضار — أُعيدت دورة الإحضار الجبري.', 'success');
    };

    const goBackToPersonalCoerciveHub = useCallback(() => {
        setConfirmingKey(null);
        setForcedOutcomePick('');
        setDetentionRejectionOpen(false);
        setDetentionRejectionReason('');
        setReleaseReasonOpen(false);
        setReleaseReason('');
        setJudgeDetailsOpen(false);
    }, []);

    /** إخلاء سبيل — يُنهي مسار الحبس وعرض الإضبارة ويُعيد طلب العرض يدوياً */
    const buildReleaseDetentionPatch = useCallback(
        (): Record<string, unknown> => buildExecutiveDetentionReleasePatch(),
        [],
    );

    const recordExecutiveDetentionJudgeOutcome = useCallback(
        (
            outcome: 'approved' | 'rejected',
            now: string,
            rejectionReason?: string,
            opts?: { suppressToast?: boolean }
        ): boolean => {
            const parentId = detentionJudgeEligibleDecisionId || findGoverningDossierDecisionId();
            if (!parentId || !exId) {
                showToast('تعذّر تسجيل قرار القاضي — لا يوجد طلب عرض إضبارة مرتبط.', 'error');
                return false;
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
                return false;
            }
            const reason = String(rejectionReason ?? '').trim();
            const judgePatch: Record<string, unknown> =
                outcome === 'rejected'
                    ? buildExecutiveDetentionJudgeRejectedClosurePatch(now, reason, judgeDecisionId)
                    : {
                          executive_detention_judge_decision_id: judgeDecisionId,
                          executive_dossier_phase: 'judge_decided',
                          executive_detention_judge_outcome: outcome,
                          executive_detention_judge_rejection_reason: null,
                      };
            const persisted = persistExecutionMerge(judgePatch);
            if (persisted === false) {
                showToast('تعذّر حفظ قرار القاضي على ملف التنفيذ — أعِد المحاولة.', 'error');
                return false;
            }
            applyOptimisticPersistPatch(judgePatch);
            if (outcome === 'rejected' && exId) {
                archiveExecutiveDetentionCycleDecisions({
                    executionId: exId,
                    debtorKey: activeDebtorKey,
                    primaryDebtorKey,
                });
                closePersonalCoerciveSubtypeDecisionCycle({
                    executionId: exId,
                    subtype: 'forced_bring_in',
                    debtorKey: activeDebtorKey,
                    primaryDebtorKey,
                });
                setDossierInlineResolved(null);
                dispatchDecisionsReload();
            }
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
            if (outcome === 'approved') {
                setJudgeDetailsOpen(true);
            }
            if (outcome === 'rejected') {
                setDetentionRejectionOpen(false);
                setDetentionRejectionReason('');
                goBackToPersonalCoerciveHub();
            }
            if (opts?.suppressToast) return true;
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
            return true;
        },
        [
            activeDebtorKey,
            applyOptimisticPersistPatch,
            debtorTimelineMeta,
            detentionJudgeEligibleDecisionId,
            exId,
            findGoverningDossierDecisionId,
            goBackToPersonalCoerciveHub,
            nextTimelineId,
            onOpenDecisions,
            persistExecutionMerge,
            pushTimelineEvent,
            showToast,
        ]
    );

    const startDetentionFourMonths = (opts?: {
        markCustody?: boolean;
        markArrested?: boolean;
        suppressToast?: boolean;
    }): boolean => {
        if (coerciveWriteLocked) {
            if (!opts?.suppressToast) {
                showToast('لا يمكن التسجيل — المحضر مقفول أو في وضع أرشيف.', 'warning');
            }
            return false;
        }
        if (judgeSync.blocksFieldwork) {
            if (!opts?.suppressToast) {
                showToast(
                    judgeSync.followupBlock?.message ??
                        'لا يمكن بدء مدة الحبس — الطلب موقوف بسبب التظلم أو الطعن. أكمل المسار من مركز القرارات.',
                    'warning',
                    {
                        action: {
                            label: 'مركز القرارات',
                            onClick: () =>
                                onOpenDecisions({
                                    tab: judgeSync.decisionsNav.decisionsTab,
                                    decisionId: judgeSync.decisionId ?? undefined,
                                }),
                        },
                    }
                );
            }
            return false;
        }
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
        patch = appendImplicitForcedBringBroughtPatch(patch, executionDataEffective, forced.approved);
        if (opts?.markArrested) {
            patch.debtorArrested = true;
        }
        if (opts?.markCustody || !inAbsentia) {
            patch.debtor_arrest_warrant_cleared_after_custody = true;
        }
        const persisted = persistExecutionMerge(patch);
        if (persisted === false) {
            if (!opts?.suppressToast) {
                showToast('تعذّر تفعيل مدة الحبس — أعِد المحاولة.', 'error');
            }
            return false;
        }
        applyOptimisticPersistPatch(patch);
        const now = new Date().toISOString();
        const timelineOk = pushTimelineEvent(
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
        if (timelineOk === false) {
            if (!opts?.suppressToast) {
                showToast('تم تفعيل الحبس لكن تعذّر تحديث السجل الزمني — أعِد المحاولة.', 'warning');
            }
            return false;
        }
        if (exId) {
            closePersonalCoerciveSubtypeDecisionCycle({
                executionId: exId,
                subtype: 'executive_detention_judge',
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
            setLocalDecisionsTick((n) => n + 1);
        }
        setJudgeDetailsOpen(false);
        if (!opts?.suppressToast) {
            showToast('تم تفعيل العداد لمدة 4 أشهر.', 'success');
        }
        return true;
    };

    const handleApproveExecutiveDetention = () => {
        if (coerciveWriteLocked) return;
        const now = new Date().toISOString();
        const judgeOk = recordExecutiveDetentionJudgeOutcome('approved', now, undefined, {
            suppressToast: true,
        });
        if (!judgeOk) return;
        const detentionOk = startDetentionFourMonths({
            markCustody: true,
            markArrested: dossierAbsentiaPathOpen,
            suppressToast: true,
        });
        if (!detentionOk) return;
        showToast('تم حبس المدين تنفيذاً — المدة 4 أشهر. يمكنك إخلاء السبيل عند الحاجة.', 'success');
    };

    const confirmReleaseDetention = (reason: string) => {
        if (releaseConfirmBusy) return;
        if (coerciveWriteLocked) {
            showToast('لا يمكن التسجيل — المحضر مقفول أو في وضع أرشيف.', 'warning');
            return;
        }
        const trimmedReason = String(reason || '').trim();
        if (!trimmedReason) {
            showToast('سبب إخلاء السبيل مطلوب.', 'warning');
            return;
        }
        setReleaseConfirmBusy(true);
        const nowIso = new Date().toISOString();
        const releasePatch = {
            ...buildReleaseDetentionPatch(),
            executive_detention_release_reason: trimmedReason,
        };
        const persisted = persistExecutionMerge(releasePatch);
        if (persisted === false) {
            showToast('تعذّر حفظ إخلاء السبيل — أعِد المحاولة.', 'error');
            setReleaseConfirmBusy(false);
            return;
        }
        applyOptimisticPersistPatch(releasePatch);
        const timelineOk = pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: getLocalTodayYmd(),
                timestamp: nowIso,
                title: 'تم إخلاء سبيل المدين — انتهاء مسار الحبس التنفيذي',
                description: `سبب إخلاء السبيل: ${trimmedReason}`,
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: debtorTimelineMeta,
            },
            { mergePatch: releasePatch }
        );
        if (timelineOk === false) {
            showToast('تم إخلاء السبيل لكن تعذّر تحديث السجل الزمني — أعِد المحاولة.', 'warning');
        }
        if (exId) {
            archiveExecutiveDetentionCycleDecisions({
                executionId: exId,
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
            closePersonalCoerciveSubtypeDecisionCycle({
                executionId: exId,
                subtype: 'forced_bring_in',
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
        }
        setForcedInlineResolved(null);
        setOptimisticForcedOutcome(null);
        setDossierInlineResolved(null);
        setDetentionRejectionOpen(false);
        setDetentionRejectionReason('');
        setReleaseReasonOpen(false);
        setReleaseReason('');
        setReleaseConfirmOpen(false);
        goBackToPersonalCoerciveHub();
        setLocalDecisionsTick((n) => n + 1);
        dispatchDecisionsReload();
        showToast('تم إخلاء السبيل — يمكنك تقديم طلب عرض إضبارة جديد عند الحاجة.', 'success');
        setReleaseConfirmBusy(false);
    };

    const liftTravelBanEnforcement = () => {
        if (!travelBanEnforced) {
            showToast('منع السفر غير مفعّل حالياً.', 'warning');
            return;
        }
        if (debtRemainingIqd > 0) {
            showToast('يُرفع منع السفر بعد سداد الدين بالكامل.', 'warning');
            return;
        }
        if (!travelBanEnforced || isHistoricalMode || coerciveUiLocked || travelBanWithdrawn) return;
        const now = new Date().toISOString();
        if (executionData) {
            persistExecutionMerge({
                ...buildDebtorTravelBanActivePatch(
                    executionData,
                    activeDebtorKey,
                    primaryDebtorKey,
                    false,
                ),
                ...buildDebtorTravelBanWithdrawnPatch(
                    executionData,
                    activeDebtorKey,
                    primaryDebtorKey,
                    now,
                ),
                ...buildDebtorTravelBanCycleWithdrawnPatch(
                    executionData,
                    activeDebtorKey,
                    primaryDebtorKey,
                    null,
                ),
            });
        } else {
            persistExecutionMerge({
                debtor_travel_ban_active: false,
                travel_ban_withdrawn_at: now,
                travel_ban_request_cycle_withdrawn_at: null,
            });
        }
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

    const withdrawTravelBanRequestCycle = useCallback(() => {
        if (isHistoricalMode || coerciveUiLocked) return;
        if (!travelBanEnforced || travelBanWithdrawn) {
            showToast('لا يوجد طلب منع سفر نافذ للتراجع عنه.', 'warning');
            return;
        }
        const now = new Date().toISOString();
        const decisionId = findLatestDecisionIdForSubtype('travel_ban');
        if (decisionId && exId) {
            const extraMerge = executionData
                ? {
                      ...buildDebtorTravelBanActivePatch(
                          executionData,
                          activeDebtorKey,
                          primaryDebtorKey,
                          true,
                      ),
                      ...buildDebtorTravelBanCycleWithdrawnPatch(
                          executionData,
                          activeDebtorKey,
                          primaryDebtorKey,
                          now,
                      ),
                      ...buildDebtorTravelBanWithdrawnPatch(
                          executionData,
                          activeDebtorKey,
                          primaryDebtorKey,
                          null,
                      ),
                  }
                : {
                      debtor_travel_ban_active: true,
                      travel_ban_request_cycle_withdrawn_at: now,
                      travel_ban_withdrawn_at: null,
                  };
            syncPersonalCoerciveWithdrawn({
                executionId: exId,
                decisionId,
                subtype: 'travel_ban',
                extraMerge,
            });
            closePersonalCoerciveSubtypeDecisionCycle({
                executionId: exId,
                subtype: 'travel_ban',
                debtorKey: activeDebtorKey,
                primaryDebtorKey,
            });
        } else {
            persistExecutionMerge({
                travel_ban_request_cycle_withdrawn_at: now,
                debtor_travel_ban_active: true,
                travel_ban_withdrawn_at: null,
            });
        }
        setTravelPanelOpen(false);
        setConfirmingKey(null);
        setLocalDecisionsTick((n) => n + 1);
        showToast(
            'تم التراجع عن الطلب — يبقى المنع مفعّلاً حتى سداد الدين.',
            'success'
        );
    }, [
        activeDebtorKey,
        coerciveUiLocked,
        debtorTimelineMeta,
        exId,
        findLatestDecisionIdForSubtype,
        isHistoricalMode,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKey,
        pushTimelineEvent,
        showToast,
        travelBanEnforced,
        travelBanWithdrawn,
    ]);

    const withdrawInvestigationCourtPath = useCallback(() => {
        if (forcedBringWithdrawBusy) return;
        setForcedBringWithdrawBusy(true);
        const now = new Date().toISOString();
        const resetPatch = buildInvestigationCourtWithdrawExecutionPatch(now);
        const arrestDecisionId = findLatestDecisionIdForSubtype('arrest_warrant_investigation');
        if (arrestDecisionId && exKey) {
            syncPersonalCoerciveWithdrawn({
                executionId: exKey,
                decisionId: arrestDecisionId,
                subtype: 'arrest_warrant_investigation',
                extraMerge: resetPatch,
            });
        }
        persistExecutionMerge(resetPatch);
        if (!arrestDecisionId) {
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
        setConfirmingKey(null);
        setForcedOutcomePick('');
        setOptimisticForcedOutcome(null);
        setForcedInlineResolved(null);
        setLocalDecisionsTick((n) => n + 1);
        dispatchDecisionsReload();
        showToast(
            'تم التنازل عن مفاتحة التحقيق — سجّل نتيجة الإحضار الجبري من جديد.',
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

    const forcedButtonLabel = forcedEffective.pending
          ? 'الإحضار الجبري — قيد البت'
          : forcedEffective.alternative
            ? 'الإحضار الجبري — قرار بديل'
            : forcedEffective.rejected
              ? 'الإحضار الجبري — مرفوض'
              : forcedOutcomeAbsconded
                ? 'الإحضار الجبري — متخفي عن الأنظار'
                : forcedSync.blocksFieldwork
                  ? 'الإحضار الجبري — موقوف (تظلم/طعن)'
                  : forcedNeedsOutcomeUi
                    ? 'الإحضار الجبري — تسجيل النتيجة'
                    : 'الإحضار الجبري';
    const forcedActivationGateOpen =
        !forcedOutcomeAbsconded &&
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !forcedEffective.pending &&
        !forcedEffective.rejected &&
        !forcedNeedsOutcomeUi &&
        !forcedSync.followupBlock &&
        !forcedEffective.alternative;
    const forcedShowStartStrip = forcedActivationGateOpen;

    const forcedButtonDisabled =
        isHistoricalMode ||
        coerciveUiLocked ||
        forcedOutcomeAbsconded ||
        forcedEffective.alternative ||
        forcedEffective.rejected ||
        forcedEffective.pending;

    const handleForcedBringHeaderClick = useCallback(() => {
        if (forcedButtonDisabled) return;
        if (forcedAwaitingOutcome || forcedFlowStep === 'outcome_choice') {
            showToast('سجّل نتيجة الإحضار الجبري في القسم أسفل هذه البطاقة.', 'info');
            return;
        }
        if (forcedSync.followupBlock || forcedSync.blocksFieldwork) return;
        if (forcedShowStartStrip) {
            showToast('اختر «تفعيل بقرار المنفذ العدل» أو «إرسال طلب للقرارات» من القسم أدناه.', 'info');
            return;
        }
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
        setConfirmingKey('forced_bring_in');
    }, [
        forcedAwaitingOutcome,
        forcedButtonDisabled,
        forcedFlowStep,
        forcedSummonAllowed,
        forcedSummonLockReason,
        forcedSync.blocksFieldwork,
        forcedSync.followupBlock,
        forcedShowStartStrip,
        guardSummonsGate,
        onOpenSummonsCenter,
        relaxedPersonal,
        showToast,
    ]);

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

    const dossierCanResubmitToExecutor = dossierCycleActive && dossierEffective.rejected;

    const canSubmitExecutiveDetention =
        !isHistoricalMode &&
        !coerciveUiLocked &&
        !dossierEffective.pending &&
        (detentionLaneEnded ||
            dossierAbsentiaPathOpen ||
            debtorPresentEffective ||
            relaxedPersonal ||
            dossierCanResubmitToExecutor);

    const activateDossierAbsentiaPath = useCallback(() => {
        if (coerciveWriteLocked || dossierAbsentiaPathOpen) return;
        persistExecutionMerge({ executive_detention_request_in_absentia: true });
        showToast('تم تفعيل مسار الغياب لطلب عرض الإضبارة على قاضي البداءة.', 'success');
    }, [coerciveWriteLocked, dossierAbsentiaPathOpen, persistExecutionMerge, showToast]);

    const dossierSubmitBlockedReason = useMemo(() => {
        if (canSubmitExecutiveDetention) return null;
        if (dossierEffective.pending) return 'طلب عرض الإضبارة قيد البت لدى المنفذ.';
        if (!debtorPresentEffective && !dossierAbsentiaPathOpen && !relaxedPersonal) {
            if (canActivateDossierAbsentiaPath) {
                return 'فعّل مسار الغياب أو أكّد مثول المدين أمام المنفذ.';
            }
            if (!debtorNotified) return 'يجب تبليغ المدين أولاً.';
            if (!gracePeriodEndedFlag) {
                return 'انتظر انتهاء مهلة الحضور الطوعي أو سجّل نتيجة الإحضار الجبري.';
            }
            return 'فعّل مسار الغياب أو أكّد مثول المدين أمام المنفذ.';
        }
        return 'لا يمكن تقديم طلب عرض الإضبارة في الوضع الحالي.';
    }, [
        canActivateDossierAbsentiaPath,
        canSubmitExecutiveDetention,
        debtorNotified,
        debtorPresentEffective,
        dossierAbsentiaPathOpen,
        dossierEffective.pending,
        gracePeriodEndedFlag,
        relaxedPersonal,
    ]);

    const handleDossierHeaderClick = useCallback(() => {
        if (sendingKey === 'executive_dossier_presentation') return;
        if (coerciveWriteLocked) return;
        if (dossierEffective.pending) {
            showToast('طلب عرض الإضبارة قيد البت لدى المنفذ — راجع القسم أسفل البطاقة.', 'info');
            return;
        }
        if (!canSubmitExecutiveDetention) {
            if (dossierSubmitBlockedReason) {
                showToast(dossierSubmitBlockedReason, 'warning', {
                    action: dossierSubmitBlockedReason.includes('تبليغ')
                        ? { label: 'مركز التبليغات', onClick: () => onOpenSummonsCenter() }
                        : undefined,
                });
            }
            return;
        }
        if (!relaxedPersonal && !guardSummonsGate()) return;
        if (
            !dossierCanResubmitToExecutor &&
            !dossierAbsentiaPathOpen &&
            !debtorPresentEffective &&
            !relaxedPersonal
        ) {
            showToast('فعّل مسار الغياب أو أكّد مثول المدين أمام المنفذ.', 'warning');
            return;
        }
        setConfirmingKey('executive_dossier_presentation');
    }, [
        canSubmitExecutiveDetention,
        coerciveWriteLocked,
        debtorPresentEffective,
        dossierAbsentiaPathOpen,
        dossierCanResubmitToExecutor,
        dossierEffective.pending,
        dossierSubmitBlockedReason,
        guardSummonsGate,
        onOpenSummonsCenter,
        relaxedPersonal,
        sendingKey,
        showToast,
    ]);

    const runTravelBanSubmit = React.useCallback(() => {
        if (sendingKey === 'travel_ban') return;
        if (travel.pending) return;
        if (!canSubmitTravelBan) return;
        setSendingKey('travel_ban');
        void submitRequest(
            'travel_ban',
            scopedRequestTitle('طلب وضع إشارة منع سفر على المدين'),
            'طلب توجيه كتاب إلى مديرية الجوازات والإقامة لمنع سفر المدين لحين البتّ في التنفيذ.'
        ).then(() => {
            setSendingKey(null);
            setConfirmingKey(null);
        });
    }, [canSubmitTravelBan, scopedRequestTitle, sendingKey, submitRequest, travel.pending]);

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
        if (dossierEffective.pending) return;
        if (!relaxedPersonal && !guardSummonsGate()) return;
        if (
            !dossierCanResubmitToExecutor &&
            !dossierAbsentiaPathOpen &&
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
            dossierAbsentiaPathOpen
                ? 'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين — وضع غيابي؛ امتناع عن التسديد دون مثول أمام المنفذ.'
                : 'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين لامتناعه عن التسديد رغم مثوله أمام المنفذ دون تسوية مقبولة.'
        )
            .then(() => {
                setSendingKey(null);
                setConfirmingKey(null);
            })
            .catch(() => {
                setSendingKey(null);
                setConfirmingKey(null);
            });
    }, [
        coerciveUiLocked,
        debtorPresentEffective,
        dossierAbsentiaPathOpen,
        dossierCanResubmitToExecutor,
        dossierEffective.pending,
        guardSummonsGate,
        relaxedPersonal,
        sendingKey,
        showToast,
        submitRequest,
    ]);

    const investigationAwaitingManualSend =
        investigationFlowStep === 'hub' &&
        outcome === 'absconded' &&
        !arrest.pending &&
        !arrest.approved &&
        !arrest.alternative &&
        !arrest.rejected &&
        !warrantCustodyRecorded;

    const investigationButtonLabel = arrest.pending
        ? 'مفاتحة محكمة التحقيق'
        : arrest.alternative
          ? 'مفاتحة محكمة التحقيق — قرار بديل'
          : (arrestStage === 'issued' || wanted) && warrantCustodyRecorded
            ? 'مفاتحة محكمة التحقيق — تم القبض'
            : arrest.approved && (investigationSessionOpen || arrestStage === 'issued' || wanted)
              ? 'مفاتحة محكمة التحقيق — تسجيل النتيجة'
              : investigationAwaitingManualSend
                ? 'مفاتحة محكمة التحقيق — تقديم الطلب'
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
            : travelBanEnforced && !travelBanWithdrawn
              ? 'منع سفر — مفعّل'
              : travel.approved && travelCycleActive && !travelBanEnforced
                ? 'منع سفر — موافق عليه'
              : travel.rejected && travelCycleActive
                ? 'منع سفر — مرفوض'
                : 'تقديم طلب منع سفر';
    const travelSubmitButtonDisabled =
        isHistoricalMode || coerciveUiLocked || travel.alternative || !canSubmitTravelBan;
    const travelRejectedAppealOpen =
        travel.rejected &&
        travelCycleActive &&
        !isExecutorRejectedAppealFollowupDismissed(
            findLatestDecisionIdForSubtype('travel_ban'),
            allDecisionRows
        );
    const travelAppealFollowupVisible =
        Boolean(travelSync.followupBlock) &&
        Boolean(travelSync.decisionId) &&
        !travelSync.cycleSuperseded;
    const travelEnforcedSettled =
        travelBanEnforced &&
        !travelBanWithdrawn &&
        !travelBanRequestCycleWithdrawn &&
        travelLaneSettled;
    const showTravelBanSection = showEmbeddedSection('travel_ban');

    const dossierLaneAnchored =
        dossierEffective.approved ||
        dossierPhaseEffective === 'handed_to_judge' ||
        dossierPhaseEffective === 'judge_decided' ||
        dossierPhaseEffective === 'detention_active' ||
        Boolean(String(detentionJudgeEligibleDecisionId ?? '').trim()) ||
        Boolean(String(executionData?.executive_detention_judge_decision_id ?? '').trim()) ||
        judgeDetentionStored === 'approved' ||
        judgeDetentionStored === 'rejected' ||
        detentionActive;

    const dossierExecutorPhaseComplete =
        !detentionLaneEnded &&
        dossierLaneAnchored &&
        (dossierPhaseEffective === 'handed_to_judge' ||
            dossierPhaseEffective === 'judge_decided' ||
            dossierPhaseEffective === 'detention_active' ||
            (dossierEffective.approved &&
                !dossierEffective.pending &&
                !dossierEffective.rejected));

    const optionalRemainingProceduresUnlocked =
        optionalRemainingProceduresOpen ||
        travelCycleActive ||
        dossierCycleActive ||
        travelBanEnforced ||
        detentionActive ||
        dossierExecutorPhaseComplete;

    const showOptionalRemainingProceduresEntry = false;

    const showTravelBanInMainFlow = showTravelBanSection;

    const dossierPresentationGloballyAllowed = !employeeDetentionRestricted;

    const dossierAwaitingJudge =
        dossierExecutorPhaseComplete &&
        (dossierPhaseEffective === 'handed_to_judge' ||
            (dossierEffective.approved && !dossierEffective.pending && !dossierEffective.rejected)) &&
        !dossierSync.followupBlock &&
        !dossierSync.blocksFieldwork &&
        (dossierSync.enforced || dossierEffective.approved) &&
        !detentionActive &&
        judgeDetention === null;

    const dossierIdle =
        !dossierExecutorPhaseComplete &&
        (detentionLaneEnded ||
            !dossierCycleActive ||
            (!dossierEffective.pending &&
                !dossierEffective.rejected &&
                !dossierEffective.approved &&
                !dossierEffective.alternative &&
                !detentionActive &&
                judgeDetention === null &&
                (dossierPhaseEffective === null || dossierPhaseEffective === undefined)));

    const judgeDecisionIdStored = String(
        executionDataEffective?.executive_detention_judge_decision_id ?? ''
    ).trim();

    const dossierShowStartPeriod =
        !detentionLaneEnded &&
        (judgeDetention === 'approved' || judgeDetentionStored === 'approved') &&
        (dossierPhaseEffective === 'judge_decided' ||
            dossierPhaseEffective === 'detention_active' ||
            judgeDetentionStored === 'approved') &&
        !detentionActive &&
        !judgeSync.blocksFieldwork &&
        !judgeSync.cycleSuperseded &&
        (judgeSync.enforced ||
            judgeDetentionStored === 'approved' ||
            Boolean(judgeDecisionIdStored));

    const dossierRequestPhaseActive =
        dossierEffective.pending ||
        dossierEffective.rejected ||
        dossierEffective.alternative ||
        dossierIdle;

    const showDossierPresentationCard =
        dossierPresentationGloballyAllowed &&
        !detentionLaneEnded &&
        dossierRequestPhaseActive;

    const dossierHasExpandablePanel =
        dossierEffective.pending ||
        dossierEffective.rejected ||
        dossierEffective.alternative;

    const dossierButtonDisabled = sendingKey === 'executive_dossier_presentation';

    const judgeRejectedResubmitVisible =
        judgeDetention === 'rejected' &&
        dossierPhaseEffective === 'judge_decided' &&
        Boolean(judgeDecisionIdStored) &&
        !judgeSync.cycleSuperseded &&
        !isExecutorRejectedAppealFollowupDismissed(judgeDecisionIdStored, allDecisionRows);
    const judgeCassationOverturnVisible =
        !detentionActive &&
        judgeDetention === 'approved' &&
        judgeDetentionStored === 'rejected' &&
        dossierPhaseEffective === 'judge_decided';
    const dossierHandedToJudgeStalled =
        dossierPhaseEffective === 'handed_to_judge' &&
        (Boolean(dossierSync.followupBlock) || dossierSync.blocksFieldwork) &&
        !detentionActive;
    const dossierJudgeLaneReady =
        dossierExecutorPhaseComplete &&
        (dossierPhaseEffective === 'handed_to_judge' ||
            (dossierEffective.approved && !dossierEffective.pending && !dossierEffective.rejected)) &&
        !dossierSync.followupBlock &&
        !dossierSync.blocksFieldwork &&
        !detentionActive &&
        judgeDetention === null;
    const judgeApprovedAwaitingDetentionStart =
        !detentionActive &&
        !detentionLaneEnded &&
        (judgeDetention === 'approved' || judgeDetentionStored === 'approved') &&
        !judgeSync.blocksFieldwork &&
        !judgeSync.cycleSuperseded;
    const detentionPeriodActivePanel = detentionActive && !detentionLaneEnded;
    const judgeHasActionablePanel =
        dossierJudgeLaneReady ||
        dossierAwaitingJudge ||
        dossierShowStartPeriod ||
        judgeApprovedAwaitingDetentionStart ||
        detentionPeriodActivePanel ||
        dossierHandedToJudgeStalled ||
        Boolean(judgeSync.followupBlock) ||
        judgeRejectedResubmitVisible ||
        judgeCassationOverturnVisible;

    const executiveDetentionJudgeCardAllowed =
        !hideExecutiveDetentionJudgeCard || dossierExecutorPhaseComplete;
    const showJudgeDetentionCard =
        executiveDetentionJudgeCardAllowed &&
        !hideDossierJudgePresentation &&
        !employeeDetentionRestricted &&
        !detentionLaneEnded &&
        (dossierExecutorPhaseComplete || detentionActive) &&
        (judgeHasActionablePanel || detentionActive);

    const dossierPhaseSyncRef = React.useRef<string | null>(null);

    useEffect(() => {
        dossierPhaseSyncRef.current = null;
    }, [exId]);

    useEffect(() => {
        if (detentionLaneEnded || !exId) return;
        if (judgeDetention === 'approved' || judgeDetention === 'rejected') {
            if (!judgeHasActionablePanel) return;
            if (dossierPhaseEffective === null || dossierPhaseEffective === undefined) return;
            if (dossierPhaseEffective !== 'judge_decided' && dossierPhaseEffective !== 'detention_active') {
                if (dossierPhaseSyncRef.current === 'judge_decided') return;
                dossierPhaseSyncRef.current = 'judge_decided';
                persistExecutionMerge({ executive_dossier_phase: 'judge_decided' });
            }
            return;
        }
        if (
            dossierEffective.approved &&
            !dossierEffective.pending &&
            !dossierEffective.rejected &&
            dossierPhaseEffective !== 'handed_to_judge' &&
            dossierPhaseEffective !== 'judge_decided' &&
            dossierPhaseEffective !== 'detention_active'
        ) {
            if (dossierPhaseSyncRef.current === 'handed_to_judge') return;
            dossierPhaseSyncRef.current = 'handed_to_judge';
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
        dossierEffective.approved,
        dossierEffective.pending,
        dossierEffective.rejected,
        dossierPhaseEffective,
        exId,
        findGoverningDossierDecisionId,
        judgeDetention,
        judgeHasActionablePanel,
        persistExecutionMerge,
    ]);

    useEffect(() => {
        if (showJudgeDetentionCard) return;
        if (judgeDetailsOpen) setJudgeDetailsOpen(false);
    }, [judgeDetailsOpen, showJudgeDetentionCard]);

    useEffect(() => {
        if (!exId || isHistoricalMode || detentionLaneEnded) return;
        if (
            dossierExecutorPhaseComplete &&
            judgeDetention === null &&
            !detentionActive &&
            (dossierEffective.approved || dossierPhaseEffective === 'handed_to_judge')
        ) {
            return;
        }
        if (!dossierExecutorPhaseComplete || judgeHasActionablePanel) return;
        const resetPatch: Record<string, unknown> = {
            executive_dossier_phase: null,
            executive_detention_judge_outcome: null,
            executive_detention_judge_decision_id: null,
            executive_detention_judge_eligible_decision_id: null,
            executive_detention_judge_rejection_reason: null,
        };
        if (!executionPatchDiffers(resetPatch)) return;
        persistExecutionMerge(resetPatch);
        closePersonalCoerciveSubtypeDecisionCycle({
            executionId: exId,
            subtype: 'executive_detention_judge',
            debtorKey: activeDebtorKey,
            primaryDebtorKey,
        });
        setJudgeDetailsOpen(false);
        setLocalDecisionsTick((n) => n + 1);
    }, [
        activeDebtorKey,
        detentionActive,
        detentionLaneEnded,
        dossierEffective.approved,
        dossierExecutorPhaseComplete,
        dossierPhaseEffective,
        exId,
        executionPatchDiffers,
        isHistoricalMode,
        judgeHasActionablePanel,
        judgeDetention,
        persistExecutionMerge,
        primaryDebtorKey,
    ]);

    const renderJudgeRejectedResubmitBlock = () => {
        const judgeDecisionId = judgeDecisionIdStored;
        if (!judgeRejectedResubmitVisible) {
            return null;
        }
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
            </CoerciveSubsectionFold>
        );
    };

    return (
        <div
            className={`${embeddedHiddenPath ? 'space-y-3' : 'space-y-4'}${isHistoricalMode ? ' pointer-events-none select-none opacity-[0.72]' : ''}`}
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
                                لا يمكن الرجوع عن إخلاء السبيل بعد التأكيد.
                            </p>
                            {releaseReason.trim() ? (
                                <p className="text-[10px] leading-relaxed text-slate-300 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                                    سبب إخلاء السبيل: {releaseReason.trim()}
                                </p>
                            ) : null}
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
                                    onClick={() => confirmReleaseDetention(releaseReason)}
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
            {showForcedBringInSection ? (
            <div className="relative space-y-2">
            <div
                className={`overflow-visible rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right ${kasabCoerciveEmphasis ? 'ring-2 ring-[#E6C673]/45 border-[#E6C673]/35' : ''}`}
            >
                <div className="relative">
                    {forcedHasExpandablePanel || forcedShowStartStrip ? (
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
                            onClick={() => handleForcedBringHeaderClick()}
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

                    {forcedEffective.rejected &&
                    !isExecutorRejectedAppealFollowupDismissed(
                        findLatestDecisionIdForSubtype('forced_bring_in'),
                        allDecisionRows
                    ) ? (
                        <div className="border-t border-white/10 px-3 pb-3 pt-2">
                            {renderRejectedExecutorAppealSection({
                                decisionId: findLatestDecisionIdForSubtype('forced_bring_in'),
                                personalCoerciveSubtype: 'forced_bring_in',
                            })}
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

                    {renderInlineGate(
                        'forced_bring_in',
                        () => runForcedBringSubmit(false),
                        {
                            confirmLabel: 'تأكيد وإرسال طلب الإحضار الجبري',
                            gateExtra: (
                                <p className="text-[10px] leading-relaxed text-amber-100/90 text-right">
                                    سيُرسل طلب إحضار جبري إلى مركز القرارات لبتّ المنفذ.
                                </p>
                            ),
                        }
                    )}

                    {forcedFlowStep === 'outcome_choice' ? (
                        <div className="border-t border-white/10 px-3 pb-2 pt-3 text-right">
                            <CoerciveSubsectionFold
                                title="تسجيل النتيجة — بعد موافقة المنفذ"
                                titleClassName="text-amber-100"
                                defaultOpen
                            >
                                <div className="space-y-1.5 border-b border-white/10 pb-2">
                                    <p className="text-[10px] font-bold text-emerald-200/90">
                                        {forcedByExecutorOrder
                                            ? '✓ بناء على قرار المنفذ العدل'
                                            : '✓ طلب إحضار جبري — تمت الموافقة'}
                                    </p>
                                </div>
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
                                        حضور المدين
                                    </button>
                                    <button
                                        type="button"
                                        disabled={coerciveUiLocked}
                                        aria-pressed={forcedOutcomePick === 'dismissed'}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setForcedOutcomePick('dismissed');
                                        }}
                                        className={`w-full rounded-xl border px-3 py-2.5 text-[11px] font-bold transition ${
                                            forcedOutcomePick === 'dismissed'
                                                ? 'border-slate-400/50 bg-slate-900/55 text-slate-100 ring-1 ring-slate-400/35'
                                                : 'border-white/10 bg-[#0A0F1C]/80 text-slate-200 hover:border-slate-500/30 hover:bg-slate-900/40'
                                        } disabled:opacity-40`}
                                    >
                                        التجاهل
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
                                    disabled={
                                        !forcedOutcomePick ||
                                        coerciveUiLocked ||
                                        (forcedOutcomePick !== 'brought' &&
                                            forcedOutcomePick !== 'absconded' &&
                                            forcedOutcomePick !== 'dismissed')
                                    }
                                    className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (
                                            forcedOutcomePick !== 'brought' &&
                                            forcedOutcomePick !== 'absconded' &&
                                            forcedOutcomePick !== 'dismissed'
                                        ) {
                                            return;
                                        }
                                        recordForcedOutcome(forcedOutcomePick);
                                        setForcedOutcomePick('');
                                    }}
                                >
                                    تأكيد التسجيل
                                </button>
                            </CoerciveSubsectionFold>
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

                        {investigationFlowStep === 'hub'
                            ? renderInlineGate(
                                  'arrest_warrant_investigation',
                                  () => {
                                      if (!relaxedPersonal && !guardSummonsGate()) return;
                                      runArrestInvestigationSubmit();
                                  },
                                  { confirmLabel: 'تأكيد وإرسال مفاتحة التحقيق' }
                              )
                            : null}

                        {arrest.rejected &&
                        !isExecutorRejectedAppealFollowupDismissed(
                            findLatestDecisionIdForSubtype('arrest_warrant_investigation'),
                            allDecisionRows
                        ) ? (
                            <div className="border-t border-white/10 px-3 pb-3 pt-2">
                                {renderRejectedExecutorAppealSection({
                                    decisionId: findLatestDecisionIdForSubtype('arrest_warrant_investigation'),
                                    personalCoerciveSubtype: 'arrest_warrant_investigation',
                                })}
                            </div>
                        ) : null}

                        {investigationFlowStep === 'outcome_choice' ? (
                            <div className="border-t border-white/10 px-3 py-3">
                                <CoerciveSubsectionFold
                                    title="نتيجة المفاتحة — بعد موافقة المنفذ"
                                    titleClassName="text-amber-100"
                                    defaultOpen
                                >
                                    <button
                                        type="button"
                                        disabled={coerciveUiLocked}
                                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-800/55 py-2.5 text-[11px] font-bold text-white disabled:opacity-40"
                                        onClick={() => recordInvestigationDebtorAttended()}
                                    >
                                        تم حضور المدين
                                    </button>
                                    <button
                                        type="button"
                                        disabled={coerciveUiLocked}
                                        className="w-full rounded-xl border border-rose-500/40 bg-rose-950/40 py-2.5 text-[11px] font-bold text-rose-100 disabled:opacity-40"
                                        onClick={() => markWarrantIssued()}
                                    >
                                        إصدار مذكرة قبض
                                    </button>
                                </CoerciveSubsectionFold>
                            </div>
                        ) : null}

                        {investigationFlowStep === 'warrant_custody' ? (
                            <div className="border-t border-white/10 px-3 py-3">
                                <CoerciveSubsectionFold
                                    title="مذكرة قبض — تأمين الإحضار"
                                    titleClassName="text-rose-100"
                                    defaultOpen
                                >
                                    <button
                                        type="button"
                                        disabled={coerciveUiLocked}
                                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-800/55 py-2.5 text-[11px] font-bold text-white disabled:opacity-40"
                                        onClick={() => recordSecuredBringAfterWarrant()}
                                    >
                                        تم تأمين إحضار المدين
                                    </button>
                                </CoerciveSubsectionFold>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {showOptionalRemainingProceduresEntry ? (
                <div className="relative pt-1">
                    <button
                        type="button"
                        disabled={coerciveUiLocked || isHistoricalMode}
                        onClick={() => setOptionalRemainingProceduresOpen(true)}
                        className={`w-full ${BTN_BASE} bg-gradient-to-l from-violet-500/10 to-transparent hover:from-violet-500/16 ${coerciveUiLocked || isHistoricalMode ? BTN_DISABLED : ''}`}
                    >
                        <div className="flex flex-row-reverse items-center gap-3">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                <ChevronDown className="h-6 w-6 text-violet-200/80" />
                            </span>
                            <div className="min-w-0 flex-1 text-right">
                                <p className="text-sm font-bold text-violet-100">
                                    إظهار الإجراءات المتبقية
                                </p>
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                    خطوة اختيارية: منع سفر أو طلب عرض الإضبارة على قاضي البداءة
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            ) : null}

            {/* 3 — منع سفر */}
            {showTravelBanInMainFlow ? (
            <div className="relative space-y-2">
            <div className="overflow-visible rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right">
                <div className="relative">
                    {travelShowInitialSubmit ? (
                        <button
                            type="button"
                            disabled={travelSubmitButtonDisabled}
                            onClick={() => {
                                if (travelSubmitButtonDisabled) return;
                                if (!canSubmitTravelBan) return;
                                setConfirmingKey('travel_ban');
                            }}
                            className={`w-full ${BTN_BASE} bg-gradient-to-l from-sky-500/12 to-transparent hover:from-sky-500/18 ${travelSubmitButtonDisabled ? BTN_DISABLED : ''}`}
                        >
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <Plane className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-sky-100">{travelButtonLabel}</p>
                                </div>
                            </div>
                        </button>
                    ) : travelEnforcedSettled ? (
                        <details
                            open={travelPanelOpen}
                            onToggle={(e) =>
                                setTravelPanelOpen((e.target as HTMLDetailsElement).open)
                            }
                            className="group/travel text-right"
                        >
                            <summary className="flex cursor-pointer list-none flex-row-reverse items-center justify-between gap-2 px-4 py-3.5 transition-colors hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                                <span className="flex flex-row-reverse items-center gap-3 min-w-0">
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                        <Plane className="h-6 w-6 text-white/70" />
                                    </span>
                                    <span className="text-sm font-bold text-sky-100">منع سفر — مفعّل</span>
                                </span>
                                <ChevronDown
                                    size={18}
                                    className="shrink-0 text-slate-400 transition-transform duration-200 group-open/travel:rotate-180"
                                    aria-hidden
                                />
                            </summary>
                            <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
                                <p className="text-[11px] font-bold text-emerald-200">
                                    تمت الموافقة فعلاً على منع المدين من السفر.
                                </p>
                                {travelAppealFollowupVisible ? renderAppealSyncFollowup(travelSync) : null}
                                {travelShowLiftAction ? (
                                    <button
                                        type="button"
                                        onClick={() => liftTravelBanEnforcement()}
                                        className="w-full rounded-xl border border-sky-400/35 bg-sky-800/45 py-2.5 text-[11px] font-bold text-sky-50 hover:bg-sky-800/60"
                                    >
                                        رفع إشارة منع السفر
                                    </button>
                                ) : debtRemainingIqd > 0 ? (
                                    <p className="text-[10px] text-sky-200/75">
                                        يُرفع منع السفر تلقائياً بعد سداد الدين بالكامل.
                                    </p>
                                ) : null}
                                <button
                                    type="button"
                                    disabled={coerciveUiLocked || isHistoricalMode}
                                    onClick={() => setConfirmingKey('travel_ban_withdraw')}
                                    className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 py-2.5 text-[11px] font-bold text-amber-100 hover:bg-amber-500/15 disabled:opacity-40"
                                >
                                    التراجع عن الطلب
                                </button>
                            </div>
                        </details>
                    ) : travelShowLiftAction ? (
                        <button
                            type="button"
                            onClick={() => liftTravelBanEnforcement()}
                            className={`w-full ${BTN_BASE} bg-gradient-to-l from-sky-500/12 to-transparent hover:from-sky-500/18`}
                        >
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <Plane className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-sky-100">{travelButtonLabel}</p>
                                </div>
                            </div>
                        </button>
                    ) : (
                        <div className={`w-full ${BTN_BASE} bg-gradient-to-l from-sky-500/12 to-transparent`}>
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <Plane className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-sky-100">{travelButtonLabel}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!travelEnforcedSettled && travelAppealFollowupVisible
                        ? renderAppealSyncFollowup(travelSync)
                        : null}

                    {!travelBanWithdrawn &&
                    travelCycleActive &&
                    (travel.pending ||
                        (travel.rejected &&
                            !isExecutorRejectedAppealFollowupDismissed(
                                findLatestDecisionIdForSubtype('travel_ban'),
                                allDecisionRows
                            ))) ? (
                        <div className="border-t border-white/10 px-3 pb-3 pt-2">
                            {travel.rejected ? (
                                renderRejectedExecutorAppealSection({
                                    decisionId: findLatestDecisionIdForSubtype('travel_ban'),
                                    personalCoerciveSubtype: 'travel_ban',
                                })
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
                            )}
                        </div>
                    ) : null}

                    {travel.alternative ? (
                        <div className="border-t border-white/10 px-3 pb-3 pt-2">
                            <p className="text-[10px] text-sky-200/90">
                                🔄 سُجّل قرار بديل للمنفذ — راجع المهام ومحضر المتابعة.
                            </p>
                        </div>
                    ) : null}
                    {renderInlineGate('travel_ban', () => {
                        if (!guardSummonsGate()) {
                            setConfirmingKey(null);
                            return;
                        }
                        setSendingKey('travel_ban');
                        if (travel.pending || travel.rejected) {
                            setSendingKey(null);
                            setConfirmingKey(null);
                            return;
                        }
                        void submitRequest(
                            'travel_ban',
                            scopedRequestTitle('طلب وضع إشارة منع سفر على المدين'),
                            'طلب توجيه كتاب إلى مديرية الجوازات والإقامة لمنع سفر المدين لحين البتّ في التنفيذ.'
                        ).then(() => {
                            setSendingKey(null);
                            setConfirmingKey(null);
                        });
                    })}
                    {renderInlineGate(
                        'travel_ban_withdraw',
                        () => withdrawTravelBanRequestCycle(),
                        {
                            confirmLabel: 'تأكيد التراجع',
                            gateExtra: (
                                <p className="text-[10px] leading-relaxed text-amber-100/90">
                                    يُغلق طلب منع السفر الحالي وتعود دورة التقديم. تبقى إشارة المنع
                                    مفعّلة حتى سداد الدين بالكامل.
                                </p>
                            ),
                        }
                    )}
                </div>
            </div>
            {travelBanRequestCycleWithdrawn && travelBanEnforced && travelShowLiftAction ? (
                <div className="px-1">
                    <button
                        type="button"
                        onClick={() => liftTravelBanEnforcement()}
                        className="w-full rounded-xl border border-sky-400/35 bg-sky-800/45 py-2.5 text-[11px] font-bold text-sky-50 hover:bg-sky-800/60"
                    >
                        رفع إشارة منع السفر
                    </button>
                </div>
            ) : null}
            </div>
            ) : null}

            {/* 4أ — طلب عرض الإضبارة (قرار المنفذ فقط) */}
            {showEmbeddedSection('executive_dossier_presentation') && showDossierPresentationCard ? (
                <div className="relative space-y-2">
                <div
                    className={`overflow-visible rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right ${kasabCoerciveEmphasis ? 'ring-2 ring-[#E6C673]/45 border-[#E6C673]/35' : ''}`}
                >
                    <div className="relative">
                        {dossierHasExpandablePanel ? (
                            <div
                                className={`w-full ${BTN_BASE} bg-gradient-to-l from-orange-500/12 to-transparent`}
                            >
                                <div className="flex flex-row-reverse items-center gap-3">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                        <Scale className="h-6 w-6 text-white/70" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-amber-100">
                                            عرض الإضبارة على قاضي البداءة
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                disabled={dossierButtonDisabled}
                                onClick={() => handleDossierHeaderClick()}
                                className={`w-full ${BTN_BASE} bg-gradient-to-l from-orange-500/12 to-transparent hover:from-orange-500/18 ${dossierButtonDisabled ? BTN_DISABLED : ''}`}
                            >
                                <div className="flex flex-row-reverse items-center gap-3">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                        <Scale className="h-6 w-6 text-white/70" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-amber-100">
                                            عرض الإضبارة على قاضي البداءة
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )}

                        {dossierIdle && !relaxedPersonal && !debtorNotified ? (
                            <div className="border-t border-white/10 px-3 py-2">
                                <p className="text-[10px] leading-relaxed text-amber-200/90 rounded-xl border border-amber-500/20 bg-amber-950/15 px-3 py-2">
                                    يجب تبليغ المدين أولاً قبل تقديم طلب عرض الإضبارة.
                                </p>
                            </div>
                        ) : null}

                        {dossierIdle && dossierAbsentiaPathOpen && !relaxedPersonal ? (
                            <div className="border-t border-white/10 px-3 py-2">
                                <p className="text-[10px] leading-relaxed text-violet-200/90 rounded-xl border border-violet-500/20 bg-violet-950/15 px-3 py-2">
                                    مسار الغياب مفعّل — يُقدَّم طلب عرض الإضبارة دون اشتراط مثول المدين أمام
                                    المنفذ.
                                </p>
                            </div>
                        ) : null}

                        {dossierIdle && canActivateDossierAbsentiaPath ? (
                            <div className="border-t border-white/10 px-3 py-2 space-y-2">
                                <p className="text-[10px] leading-relaxed text-amber-200/85">
                                    لم يُثبت مثول المدين — يمكنك تفعيل مسار الغياب لطلب عرض الإضبارة.
                                </p>
                                <button
                                    type="button"
                                    disabled={coerciveWriteLocked}
                                    className="w-full rounded-xl border border-amber-500/35 bg-amber-950/25 py-2.5 text-[11px] font-bold text-amber-100 hover:bg-amber-950/40 disabled:opacity-40"
                                    onClick={() => activateDossierAbsentiaPath()}
                                >
                                    تفعيل مسار الغياب لعرض الإضبارة
                                </button>
                            </div>
                        ) : null}

                        {dossierEffective.pending ? (
                            <div className="border-t border-white/10 px-3 py-3">
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
                            </div>
                        ) : dossierEffective.rejected &&
                          !isExecutorRejectedAppealFollowupDismissed(
                              findGoverningDossierDecisionId(),
                              allDecisionRows
                          ) ? (
                            <div className="border-t border-white/10 px-3 pb-3 pt-2">
                                {renderRejectedExecutorAppealSection({
                                    decisionId: findGoverningDossierDecisionId(),
                                    title: 'رفض المنفذ طلب عرض الإضبارة',
                                    personalCoerciveSubtype: 'executive_dossier_presentation',
                                })}
                            </div>
                        ) : dossier.alternative ? (
                            <div className="border-t border-white/10 px-3 pb-3 pt-2">
                            <p className="text-[10px] text-amber-200/90">
                                🔄 سُجّل قرار بديل للمنفذ — راجع المهام ومحضر المتابعة.
                            </p>
                            </div>
                        ) : dossierEffective.approved && dossierSync.followupBlock ? (
                            <div className="border-t border-white/10 px-3 pb-3 pt-2">
                                {renderAppealSyncFollowup(dossierSync)}
                            </div>
                        ) : null}

                        {renderInlineGate('executive_dossier_presentation', () => {
                            void runDossierPresentationSubmit();
                        }, {
                            confirmLabel: 'تأكيد وإرسال طلب عرض الإضبارة',
                            gateExtra: (
                                <p className="text-[10px] leading-relaxed text-amber-100/90 text-right">
                                    سيُرسل طلب عرض الإضبارة على قاضي البداءة إلى مركز القرارات لبتّ المنفذ.
                                </p>
                            ),
                        })}
                    </div>
                </div>
                </div>
            ) : null}

            {/* 4ب — قرار قاضي البداءة (بطاقة مستقلة بعد موافقة المنفذ على عرض الإضبارة) */}
            {showEmbeddedSection('executive_detention_judge') && showJudgeDetentionCard ? (
                <div className="overflow-visible rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right">
                    <div className="relative">
                        <div
                            className={`w-full ${BTN_BASE} bg-gradient-to-l from-orange-500/12 to-transparent`}
                        >
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <UserX className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-orange-100">قرار قاضي البداءة</p>
                                    {detentionActive ? (
                                        <p className="text-[10px] text-emerald-200/80">الحبس التنفيذي — نشط</p>
                                    ) : dossierAwaitingJudge ? (
                                        <p className="text-[10px] text-violet-200/80">بانتظار قرار القاضي</p>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
                            {dossierHandedToJudgeStalled ? renderAppealSyncFollowup(dossierSync) : null}

                            {!detentionActive && dossierAwaitingJudge ? (
                                <CoerciveSubsectionFold
                                    title="قرار قاضي البداءة — بعد عرض الإضبارة"
                                    titleClassName="text-amber-100"
                                    defaultOpen
                                >
                                    <p className="text-[10px] leading-relaxed text-violet-200/80">
                                        انتهى طلب عرض الإضبارة — سجّل قرار القاضي. يُنشأ قرار مستقل في مركز
                                        القرارات والطعون.
                                    </p>
                                    <button
                                        type="button"
                                        disabled={coerciveWriteLocked}
                                        className="w-full rounded-xl bg-emerald-800/55 py-2.5 text-[11px] font-bold text-white border border-emerald-500/35 disabled:opacity-40"
                                        onClick={() => handleApproveExecutiveDetention()}
                                    >
                                        حبس المدين تنفيذاً
                                    </button>
                                    <button
                                        type="button"
                                        disabled={coerciveWriteLocked || detentionRejectionOpen}
                                        className="w-full rounded-xl border border-rose-500/45 bg-rose-950/35 py-2.5 text-[11px] font-bold text-rose-100 disabled:opacity-40"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (coerciveWriteLocked) return;
                                            setDetentionRejectionOpen(true);
                                        }}
                                    >
                                        رفض حبس المدين
                                    </button>
                                    {detentionRejectionOpen ? (
                                        <div className="space-y-2 rounded-2xl border border-rose-500/25 bg-rose-950/15 p-3">
                                            <p className="text-[10px] font-bold text-rose-200">سبب رفض الحبس</p>
                                            <textarea
                                                value={detentionRejectionReason}
                                                onChange={(e) => setDetentionRejectionReason(e.target.value)}
                                                rows={3}
                                                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[11px] text-white"
                                                placeholder="اذكر سبب رفض حبس المدين"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    disabled={detentionRejectionSaving || coerciveWriteLocked}
                                                    className="rounded-xl border border-rose-500/40 bg-rose-900/30 py-2.5 text-[11px] font-black text-rose-100 disabled:opacity-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (coerciveWriteLocked) return;
                                                        const reason = detentionRejectionReason.trim();
                                                        if (!reason) {
                                                            showToast('سبب الرفض مطلوب.', 'warning');
                                                            return;
                                                        }
                                                        if (detentionRejectionSaving) return;
                                                        setDetentionRejectionSaving(true);
                                                        const ok = recordExecutiveDetentionJudgeOutcome(
                                                            'rejected',
                                                            new Date().toISOString(),
                                                            reason
                                                        );
                                                        setDetentionRejectionSaving(false);
                                                        if (!ok) return;
                                                    }}
                                                >
                                                    تأكيد الرفض
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={detentionRejectionSaving}
                                                    className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDetentionRejectionOpen(false);
                                                        setDetentionRejectionReason('');
                                                    }}
                                                >
                                                    إلغاء
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </CoerciveSubsectionFold>
                            ) : null}

                            {!detentionActive &&
                            judgeDetention === 'approved' &&
                            judgeDetentionStored === 'rejected' &&
                            dossierPhaseEffective === 'judge_decided' ? (
                                <p className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2.5 text-[10px] leading-relaxed text-emerald-100/90">
                                    تم نقض رفض القاضي تمييزياً — أصبح الحبس التنفيذي موافقاً عليه. يمكنك تسجيل
                                    الحبس تنفيذاً أدناه.
                                </p>
                            ) : null}

                            {!detentionActive && dossierShowStartPeriod ? (
                                <CoerciveSubsectionFold
                                    title="حبس المدين تنفيذاً"
                                    titleClassName="text-emerald-200"
                                    defaultOpen
                                >
                                    <p className="text-[10px] text-emerald-200/90">
                                        وافق القاضي — اضغط لتفعيل مدة الحبس التنفيذي (4 أشهر).
                                    </p>
                                    <button
                                        type="button"
                                        disabled={coerciveWriteLocked}
                                        className="w-full rounded-xl bg-orange-800/55 py-2.5 text-[11px] font-bold text-white disabled:opacity-40"
                                        onClick={() => {
                                            if (coerciveWriteLocked) return;
                                            startDetentionFourMonths({
                                                markCustody: true,
                                                markArrested: dossierAbsentiaPathOpen,
                                            });
                                        }}
                                    >
                                        حبس المدين تنفيذاً — بدء المدة
                                    </button>
                                </CoerciveSubsectionFold>
                            ) : null}

                            {detentionPeriodActivePanel ? (
                                <CoerciveSubsectionFold
                                    title="إخلاء سبيل المدين"
                                    titleClassName="text-emerald-200"
                                    defaultOpen
                                >
                                    {detentionUntil ? (
                                        <p className="text-[10px] leading-relaxed text-emerald-200/90">
                                            المدة سارية حتى{' '}
                                            <span className="font-bold text-emerald-100">{detentionUntil}</span>
                                            {executionData?.executive_detention_days_total
                                                ? ` (${executionData.executive_detention_days_total} يوم)`
                                                : ''}
                                        </p>
                                    ) : (
                                        <p className="text-[10px] leading-relaxed text-emerald-200/90">
                                            مدة الحبس التنفيذي مفعّلة.
                                        </p>
                                    )}
                                    {!releaseReasonOpen ? (
                                        <button
                                            type="button"
                                            disabled={coerciveWriteLocked}
                                            className="w-full flex items-center justify-center gap-2 flex-row-reverse rounded-xl border border-emerald-800 bg-emerald-900/20 py-2.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-800/30 transition-all disabled:opacity-40"
                                            onClick={() => {
                                                if (coerciveWriteLocked) return;
                                                setReleaseReasonOpen(true);
                                            }}
                                        >
                                            <Unlock size={16} />
                                            إخلاء سبيل المدين
                                        </button>
                                    ) : (
                                        <div className="space-y-2 rounded-2xl border border-emerald-500/25 bg-emerald-950/15 p-3">
                                            <p className="text-[10px] font-bold text-emerald-200">سبب إخلاء السبيل</p>
                                            <textarea
                                                value={releaseReason}
                                                onChange={(e) => setReleaseReason(e.target.value)}
                                                rows={3}
                                                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[11px] text-white"
                                                placeholder="اذكر سبب إخلاء سبيل المدين"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    disabled={releaseConfirmBusy || coerciveWriteLocked}
                                                    className="rounded-xl border border-rose-500/45 bg-rose-950/40 py-2.5 text-[11px] font-black text-rose-100 disabled:opacity-50"
                                                    onClick={() => {
                                                        if (coerciveWriteLocked) return;
                                                        const reason = releaseReason.trim();
                                                        if (!reason) {
                                                            showToast('سبب إخلاء السبيل مطلوب.', 'warning');
                                                            return;
                                                        }
                                                        setReleaseConfirmOpen(true);
                                                    }}
                                                >
                                                    تأكيد إخلاء السبيل
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={releaseConfirmBusy}
                                                    className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                                                    onClick={() => {
                                                        setReleaseReasonOpen(false);
                                                        setReleaseReason('');
                                                    }}
                                                >
                                                    إلغاء
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </CoerciveSubsectionFold>
                            ) : null}

                            {judgeSync.followupBlock ? renderAppealSyncFollowup(judgeSync) : null}
                            {!detentionActive &&
                            !dossierAwaitingJudge &&
                            !judgeSync.followupBlock &&
                            judgeRejectedResubmitVisible
                                ? renderJudgeRejectedResubmitBlock()
                                : null}
                        </div>
                    </div>
                </div>
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
                    {guarantorDec.pending ||
                    (guarantorDec.rejected &&
                        !isExecutorRejectedAppealFollowupDismissed(
                            findLatestGuarantorDecisionId(),
                            allDecisionRows
                        )) ? (
                        <div className="mt-2">
                            {guarantorDec.rejected ? (
                                renderRejectedExecutorAppealSection({
                                    decisionId: findLatestGuarantorDecisionId(),
                                    requestKind: 'guarantor_request',
                                })
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

        </div>
    );
};
