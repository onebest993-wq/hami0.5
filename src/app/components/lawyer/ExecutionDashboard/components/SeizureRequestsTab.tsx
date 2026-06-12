import React from 'react';
import { Building2, ClipboardList, Lock, Package, Shield, Users, Wallet } from 'lucide-react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    DECISIONS_RELOAD_EVENT,
    appendPendingExecutorSeizureDecision,
    closeSeizureSubtypeDecisionCycle,
    dispatchDecisionsReload,
    getGoverningSeizureDecisionBySubtype,
    isExecutorHubRowInactiveForGoverning,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    isGuarantorRequestDecisionRow,
    patchExecutorDecisionRowEverywhere,
    readExecutorDecisionsArray,
    type SeizureRequestSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import type { SeizureMatrixButtonKey, SeizureMatrixResult } from '@/app/utils/seizureMatrix';
import { resolveSeizureMatrixFromExecution } from '@/app/utils/seizureMatrix';
import { SeizureMatrixExpandLink } from '@/app/components/lawyer/execution/SeizureMatrixExpandLink';
import { GuarantorWorkspaceWrapper } from './GuarantorWorkspaceWrapper';
import { shouldShowGuarantorRequestInSeizureTab } from './hiddenFollowupRequestsUtils';
import { isSalarySeizureAsset } from '@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureRegistryAssets';
import { isSalarySeizureLaneOccupied } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import {
    formatNumberInput,
    parseExecutionAmountInt,
} from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';
import { isFollowupRequestKindAllowed } from '@/app/utils/executionDomainIsolation';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

function isSeizureRequestFullyRegistered(
    row: any,
    allDecisions: Record<string, unknown>[]
): boolean {
    if (!row?.id) return false;
    if (isExecutorRowRejectedAndFinal(row)) return false;
    if (isExecutorHubRowInactiveForGoverning(row, allDecisions)) return false;
    if (!isExecutorRowApprovedWorkflowActive(row, allDecisions)) return false;
    return Boolean(String(row.seizureRequestSavedAt || '').trim());
}

/** اكتمال التسجيل — يبقى زر «السجل» ظاهراً حتى أثناء الطعن */
function isSeizureRegistrationComplete(
    row: any,
    allDecisions: Record<string, unknown>[]
): boolean {
    if (!row?.id) return false;
    if (isExecutorRowRejectedAndFinal(row)) return false;
    if (isExecutorHubRowInactiveForGoverning(row, allDecisions)) return false;
    return Boolean(String(row.seizureRequestSavedAt || '').trim());
}

type UnifiedSeizureLogTab = 'movable' | 'property' | 'third_party' | 'salary';

const SEIZURE_LOG_TAB_SUBTYPE: Record<UnifiedSeizureLogTab, SeizureRequestSubtype> = {
    movable: 'movable_auction',
    third_party: 'third_party',
    property: 'property',
    salary: 'salary',
};

function openUnifiedSeizureLogTab(tab: UnifiedSeizureLogTab): void {
    try {
        window.dispatchEvent(
            new CustomEvent('hami-open-unified-seizure-log', { detail: { tab } })
        );
    } catch {
        /* ignore */
    }
}

function SeizureLogNavigateBadge(props: {
    tab: UnifiedSeizureLogTab;
    tone?: 'sky' | 'violet' | 'amber' | 'emerald';
    /** عند التسجيل المكتمل: إغلاق الاختصار وإعادة دورة الطلب ثم فتح السجل */
    onAcknowledgeCycle?: () => void;
}) {
    const toneClass =
        props.tone === 'violet'
            ? 'border-violet-300/35 bg-violet-500/10 text-violet-100 hover:bg-violet-500/18'
            : props.tone === 'amber'
              ? 'border-amber-300/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/18'
              : props.tone === 'emerald'
                ? 'border-emerald-300/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/18'
                : 'border-sky-300/35 bg-sky-500/10 text-sky-100 hover:bg-sky-500/18';

    const handleClick = props.onAcknowledgeCycle ?? (() => openUnifiedSeizureLogTab(props.tab));
    const actionLabel = props.onAcknowledgeCycle
        ? 'إغلاق الاختصار وفتح سجل الحجز'
        : 'فتح سجل الحجز';

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClick();
            }}
            className={`inline-flex shrink-0 flex-row-reverse items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors ${toneClass}`}
            title={actionLabel}
            aria-label={actionLabel}
        >
            <ClipboardList size={12} strokeWidth={2.25} className="opacity-90" />
            <span>السجل</span>
        </button>
    );
}

type SeizureWorkspaceWrapperProps = {
    executionId: string;
    patchExecutionIds?: string[];
    row: any;
    title: string;
    completion: React.ReactNode;
    onOpenAppeals: (decisionId?: string) => void;
    onOpenDecisions?: (decisionId?: string) => void;
    expandSignal?: number;
    hideExecutorShortcuts?: boolean;
};

const SeizureWorkspaceWrapper: React.FC<SeizureWorkspaceWrapperProps> = ({
    executionId,
    patchExecutionIds,
    row,
    title,
    completion,
    onOpenAppeals,
    onOpenDecisions,
    expandSignal,
    hideExecutorShortcuts = false,
}) => {
    const allDecisions = React.useMemo(
        () => readExecutorDecisionsArray(executionId) as Record<string, unknown>[],
        [executionId, row]
    );
    const decisionId = String(row?.id || '').trim();
    const rejected = Boolean(decisionId) && isExecutorRowRejectedAndFinal(row);
    const outcome = String(row?.executorOutcome ?? 'pending').trim();
    const alternative = outcome === 'alternative';
    const approved =
        Boolean(decisionId) &&
        !rejected &&
        (alternative || isExecutorRowApprovedWorkflowActive(row, allDecisions));
    const savedAt = String(row?.seizureRequestSavedAt || '').trim();
    const needsCompletion = approved && !savedAt;
    const vanish = approved && Boolean(savedAt);

    const [expanded, setExpanded] = React.useState(needsCompletion);
    const [busy, setBusy] = React.useState(false);
    const prevNeedsCompletionRef = React.useRef<boolean>(false);
    const prevExpandSignalRef = React.useRef<number>(-1);
    React.useEffect(() => {
        const prev = prevNeedsCompletionRef.current;
        prevNeedsCompletionRef.current = needsCompletion;
        if (needsCompletion && !prev) setExpanded(true);
        if (!needsCompletion) setExpanded(false);
    }, [needsCompletion]);
    React.useEffect(() => {
        const sig = typeof expandSignal === 'number' ? expandSignal : -1;
        if (sig === prevExpandSignalRef.current) return;
        prevExpandSignalRef.current = sig;
        if (needsCompletion) setExpanded(true);
    }, [expandSignal, needsCompletion]);

    if (!decisionId) return null;
    if (vanish) return null;

    const resolve = (nextOutcome: 'approved' | 'rejected') => {
        if (busy) return;
        const base = String(executionId || '').trim();
        const ids = Array.from(
            new Set(
                [base, ...(Array.isArray(patchExecutionIds) ? patchExecutionIds : [])]
                    .map((x) => String(x || '').trim())
                    .filter((x) => x && x !== 'undefined' && x !== 'null')
            )
        );
        if (ids.length === 0) return;
        setBusy(true);
        const nowIso = new Date().toISOString();
        try {
            patchExecutorDecisionRowEverywhere(decisionId, {
                executorOutcome: nextOutcome,
                status: nextOutcome === 'rejected' ? 'rejected' : 'accepted',
                appealStatus: 'pending',
                appealPhase: null,
                appealBaseBranch: nextOutcome === 'rejected' ? 'after_rejection' : 'after_approval',
                resolvedAt: nowIso,
            } as any);
        } catch {}
        try {
            window.dispatchEvent(
                new CustomEvent('hami-execution-decision-outcome', {
                    detail: {
                        executionId: ids[0],
                        requestKind: 'seizure',
                        outcome: nextOutcome,
                        decisionId,
                    },
                })
            );
        } catch {}
        setBusy(false);
    };

    if (rejected) {
        return (
            <div className="mt-2 rounded-2xl border p-3 border-rose-500/35 bg-rose-950/25">
                <p className="text-[11px] font-black text-right text-rose-200">قرار المنفذ</p>
                <p className="mt-1 text-[10px] text-slate-400 text-right">تم رفض الطلب</p>
                <div className="mt-3 border-t border-white/10 pt-3">
                    <button
                        type="button"
                        onClick={() => onOpenAppeals(decisionId)}
                        className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/15"
                    >
                        تقديم طعن (الذهاب لمركز القرارات)
                    </button>
                </div>
            </div>
        );
    }

    const pending = !approved && !rejected;

    if (pending) {
        if (hideExecutorShortcuts) {
            return (
                <div className="mt-2 rounded-2xl border border-white/10 bg-[#05060D]/55 p-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-black text-right text-slate-100">قرار المنفذ</p>
                        <p className="text-[10px] text-slate-400">قيد البت</p>
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-slate-400 text-right">
                        سجِّل موافقة المنفذ أو رفضه من مركز القرارات والطعون — لا يُختصر من هنا.
                    </p>
                    {onOpenDecisions ? (
                        <button
                            type="button"
                            onClick={() => onOpenDecisions(decisionId)}
                            className="mt-3 w-full rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 px-3 py-2 text-[11px] font-extrabold text-[#F5E6A8] hover:bg-[#E6C673]/15"
                        >
                            فتح مركز القرارات
                        </button>
                    ) : null}
                </div>
            );
        }
        return (
            <div className="mt-2 rounded-2xl border border-white/10 bg-[#05060D]/55 p-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black text-right text-slate-100">قرار المنفذ</p>
                    <p className="text-[10px] text-slate-400">قيد البت</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => resolve('approved')}
                        className="rounded-xl bg-emerald-600/25 border border-emerald-500/35 py-2.5 text-[12px] font-black text-emerald-100 hover:bg-emerald-600/30 disabled:opacity-40"
                    >
                        موافقة
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => resolve('rejected')}
                        className="rounded-xl bg-rose-700/25 border border-rose-500/35 py-2.5 text-[12px] font-black text-rose-100 hover:bg-rose-700/30 disabled:opacity-40"
                    >
                        رفض
                    </button>
                </div>
            </div>
        );
    }

    const steps: ExecutionInlineStep[] = [
        {
            id: `${decisionId}:sent`,
            title,
            subtitle: 'تم إرسال الطلب',
            status: 'done',
            tone: 'success',
        },
        {
            id: `${decisionId}:executor`,
            title: 'قرار المنفذ',
            subtitle: 'تمت الموافقة',
            status: 'done',
            tone: 'success',
        },
        ...(needsCompletion
            ? [
                  {
                      id: `${decisionId}:complete`,
                      title: 'إكمال بيانات الحجز',
                      subtitle: 'أكمل الحقول ثم احفظ',
                      status: 'active' as const,
                      tone: 'neutral' as const,
                      content: completion,
                  },
              ]
            : []),
    ];

    return (
        <div className="mt-2">
            <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/10 py-2 text-[11px] font-bold text-slate-200 transition hover:bg-black/20"
            >
                <span className="text-[#D4AF37]/85">{expanded ? 'تصغير' : 'توسيع'}</span>
            </button>
            {expanded ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion steps={steps} />
                </div>
            ) : null}
        </div>
    );
};

function SeizureRequestBlock(props: {
    onClick: () => void;
    disabled?: boolean;
    className: string;
    icon: React.ReactNode;
    label: React.ReactNode;
    children?: React.ReactNode;
    afterButton?: React.ReactNode;
    trailingSlot?: React.ReactNode;
}) {
    const { onClick, disabled, className, icon, label, children, afterButton, trailingSlot } = props;

    return (
        <div className="relative">
            <div className={`flex flex-row-reverse items-stretch overflow-hidden ${className}`}>
                <button
                    type="button"
                    onClick={onClick}
                    disabled={disabled}
                    className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-[12px] font-bold text-slate-100 text-right transition-colors disabled:opacity-40"
                >
                    <span className="flex flex-row-reverse items-center gap-3 w-full">
                        {icon}
                        <span className="flex-1 min-w-0 text-right">{label}</span>
                    </span>
                </button>
                {trailingSlot ? (
                    <div className="flex shrink-0 flex-row-reverse items-center gap-1 self-center px-2">
                        {trailingSlot}
                    </div>
                ) : null}
            </div>
            {afterButton}
            {children}
        </div>
    );
}

export interface SeizureRequestsTabProps {
    executionId: string | undefined;
    executionData: ExecutionFile | null;
    remainingBalanceIqd?: number;
    financialCenterTotalIqd?: number;
    seizureMatrix?: SeizureMatrixResult;
    seizureDetailCompletion: { decisionRowId: string; assetId: string; actionType: 'salary' | 'property' | 'vehicle' } | null;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    persistGuarantorFollowupDetails: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: {
            salaryIqd: number | null;
            deductionIqd: number | null;
            guaranteeType?: 'amount' | 'attendance';
        }
    ) => void;
    pushTimelineEvent: (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void;
    nextTimelineId: () => string;
    getLocalTodayYmd: () => string;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
    activeDebtorIsDeceased: boolean;
    activeDebtorIsEmployee?: boolean;
    executionCoerciveButtonDisabled: boolean;
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    handleCoerciveAction: (type: string) => void;
    handleGuarantorRequestFromFollowup: () => void;
    requestFollowupSeizureDecision: (subtype: 'third_party', title: string, body: string) => void;
    hideAllGuarantorPresence?: boolean;
    financialGuarantorRequestOnly?: boolean;
    isFinancialDebtCollectionClaim?: boolean;
    settlementBreachTriggeredAt?: string | null;
    ledgerPendingSettlement?: unknown;
    isAlimonyClaim?: boolean;
    claimType?: string;
}

export const SeizureRequestsTab: React.FC<SeizureRequestsTabProps> = ({
    executionId,
    executionData,
    remainingBalanceIqd = 0,
    seizureMatrix: seizureMatrixProp,
    seizureDetailCompletion,
    saveCoerciveAction,
    persistExecutionMerge,
    persistGuarantorFollowupDetails,
    pushTimelineEvent,
    nextTimelineId,
    getLocalTodayYmd,
    showToast,
    activeDebtorIsDeceased,
    activeDebtorIsEmployee = false,
    executionCoerciveButtonDisabled,
    coerciveUiLocked,
    isHistoricalMode,
    inlineActionGateKey,
    setInlineActionGateKey,
    handleCoerciveAction,
    handleGuarantorRequestFromFollowup,
    requestFollowupSeizureDecision,
    hideAllGuarantorPresence = false,
    financialGuarantorRequestOnly = false,
    isFinancialDebtCollectionClaim = false,
    settlementBreachTriggeredAt = null,
    ledgerPendingSettlement = null,
    isAlimonyClaim = false,
    claimType = '',
}) => {
    const seizureMatrix = React.useMemo(
        () =>
            seizureMatrixProp ??
            resolveSeizureMatrixFromExecution({
                remainingBalanceIqd,
                executionData,
                activeDebtorIsEmployee,
            }),
        [seizureMatrixProp, remainingBalanceIqd, executionData, activeDebtorIsEmployee]
    );
    const matrixBlocksSeizure = seizureMatrix.allSeizureDisabled;
    const domainBlocksSeizure = React.useMemo(() => {
        const gate = isFollowupRequestKindAllowed(
            executionData as Record<string, unknown> | null | undefined,
            executionId,
            'seizure'
        );
        return !gate.allowed;
    }, [executionData, executionId]);
    const effectiveMatrixBlocksSeizure = matrixBlocksSeizure || domainBlocksSeizure;
    const progressive = seizureMatrix.progressiveDisclosure;
    const seizureActionsDisabled =
        executionCoerciveButtonDisabled || isHistoricalMode || effectiveMatrixBlocksSeizure;

    const [additionalSeizureExpanded, setAdditionalSeizureExpanded] = React.useState(false);
    const [maximumSeizureExpanded, setMaximumSeizureExpanded] = React.useState(false);

    React.useEffect(() => {
        setAdditionalSeizureExpanded(false);
        setMaximumSeizureExpanded(false);
    }, [
        seizureMatrix.ruleId,
        seizureMatrix.remainingBalanceIqd,
        seizureMatrix.buttons.salary,
        seizureMatrix.buttons.movable,
        seizureMatrix.buttons.third_party,
        seizureMatrix.buttons.property,
    ]);

    const financialCenterBalanceIqd = Math.max(
        0,
        Math.round(Number(seizureMatrix.remainingBalanceIqd ?? remainingBalanceIqd) || 0)
    );

    const matrixRecommendsButton = React.useCallback(
        (key: SeizureMatrixButtonKey) => {
            if (!seizureMatrix.showTabContentButtons || effectiveMatrixBlocksSeizure) return false;
            if (key === 'salary' && (activeDebtorIsEmployee || activeDebtorIsDeceased)) {
                return financialCenterBalanceIqd > 0;
            }
            return Boolean(seizureMatrix.buttons[key]);
        },
        [
            activeDebtorIsDeceased,
            activeDebtorIsEmployee,
            financialCenterBalanceIqd,
            effectiveMatrixBlocksSeizure,
            seizureMatrix.buttons,
            seizureMatrix.showTabContentButtons,
        ]
    );

    const showRecommendedButton = React.useCallback(
        (key: SeizureMatrixButtonKey) => {
            if (key === 'salary') {
                return matrixRecommendsButton('salary');
            }
            return matrixRecommendsButton(key);
        },
        [matrixRecommendsButton]
    );

    const showManualButton = React.useCallback(
        (key: SeizureMatrixButtonKey, tier: 'additional' | 'maximum') => {
            if (!seizureMatrix.showTabContentButtons || effectiveMatrixBlocksSeizure) return false;
            if (tier === 'additional') {
                return additionalSeizureExpanded && progressive.additionalButtons.includes(key);
            }
            return maximumSeizureExpanded && progressive.maximumButtons.includes(key);
        },
        [
            additionalSeizureExpanded,
            maximumSeizureExpanded,
            effectiveMatrixBlocksSeizure,
            progressive.additionalButtons,
            progressive.maximumButtons,
            seizureMatrix.showTabContentButtons,
        ]
    );

    const domainAllowsGuarantorRequest = React.useMemo(() => {
        return isFollowupRequestKindAllowed(
            executionData as Record<string, unknown> | null | undefined,
            executionId,
            'guarantor_request'
        ).allowed;
    }, [executionData, executionId]);
    const showGuarantorRequestInTab =
        domainAllowsGuarantorRequest &&
        shouldShowGuarantorRequestInSeizureTab(
            {
                hideAllGuarantorPresence,
                isFinancialDebtCollection: isFinancialDebtCollectionClaim,
                showFinancialGuarantorRequestOnly: financialGuarantorRequestOnly,
            } as Parameters<typeof shouldShowGuarantorRequestInSeizureTab>[0],
            {
                executionData,
                financialCenterTotalIqd: financialCenterBalanceIqd,
                settlementBreachTriggeredAt,
                ledgerPendingSettlement,
                activeDebtorIsDeceased,
                activeDebtorIsEmployee,
            }
        );
    const normalizeExecutionId = React.useCallback((v: unknown): string => {
        const s = String(v ?? '').trim();
        if (!s) return '';
        if (s === 'undefined' || s === 'null') return '';
        return s;
    }, []);
    const executionIdsForDecisions = React.useMemo(() => {
        const ids = [normalizeExecutionId(executionId), normalizeExecutionId(executionData?.id)]
            .map((x) => String(x || '').trim())
            .filter(Boolean);
        return Array.from(new Set(ids));
    }, [executionData?.id, executionId, normalizeExecutionId]);
    const resolvedExecutionId = executionIdsForDecisions[0] || '';
    const [guarantorExistingWarningOpen, setGuarantorExistingWarningOpen] = React.useState(false);
    const [lastSalaryDecisionId, setLastSalaryDecisionId] = React.useState('');
    const salaryAutoRegisterSigRef = React.useRef('');

    const readAllDecisions = React.useCallback((): Record<string, unknown>[] => {
        const merged: Record<string, unknown>[] = [];
        for (const id of executionIdsForDecisions) {
            merged.push(...readExecutorDecisionsArray(id));
        }
        const byId = new Map<string, Record<string, unknown>>();
        for (const row of merged) {
            const rid = String((row as any)?.id ?? '').trim();
            if (!rid) continue;
            const prev = byId.get(rid);
            if (!prev) {
                byId.set(rid, row);
                continue;
            }
            const a = String((prev as any)?.resolvedAt ?? (prev as any)?.date ?? '');
            const b = String((row as any)?.resolvedAt ?? (row as any)?.date ?? '');
            if (b.localeCompare(a, undefined, { numeric: true }) > 0) byId.set(rid, row);
        }
        return Array.from(byId.values());
    }, [executionIdsForDecisions]);

    const [decisions, setDecisions] = React.useState<Record<string, unknown>[]>(() => readAllDecisions());
    React.useEffect(() => {
        const sync = () => setDecisions(readAllDecisions());
        sync();
        window.addEventListener(DECISIONS_RELOAD_EVENT, sync);
        window.addEventListener('hami-execution-decision-outcome', sync as EventListener);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, sync);
            window.removeEventListener('hami-execution-decision-outcome', sync as EventListener);
            window.removeEventListener('focus', sync);
        };
    }, [readAllDecisions]);

    const [thirdPartyNameDraft, setThirdPartyNameDraft] = React.useState('');
    const [thirdPartyAmountDraft, setThirdPartyAmountDraft] = React.useState('');
    const [propertyDetailsDraftByDecisionId, setPropertyDetailsDraftByDecisionId] = React.useState<Record<string, { propertyNumber: string; propertyDistrict: string; propertyType: string }>>({});
    const [vehicleDetailsDraftByDecisionId, setVehicleDetailsDraftByDecisionId] = React.useState<
        Record<string, { movableDescription: string; movableLocation: string }>
    >({});

    const openAppeals = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: resolvedExecutionId,
                            tab: 'appeals',
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {}
        },
        [resolvedExecutionId]
    );

    const openDecisions = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: {
                            executionId: resolvedExecutionId,
                            tab: 'current',
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [resolvedExecutionId]
    );

    const openGuarantorDetails = React.useCallback(
        (decisionId?: string) => {
            if (!resolvedExecutionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-guarantor-details', {
                        detail: {
                            executionId: resolvedExecutionId,
                            decisionId: decisionId || undefined,
                        },
                    })
                );
            } catch {}
        },
        [resolvedExecutionId]
    );

    const findLatestGuarantorDecision = React.useMemo(() => {
        const row = decisions.find((r) => isGuarantorRequestDecisionRow(r));
        return (row as any) || null;
    }, [decisions]);

    const acknowledgeSeizureRequestFromLog = React.useCallback(
        (tab: UnifiedSeizureLogTab) => {
            if (!resolvedExecutionId) return;
            closeSeizureSubtypeDecisionCycle({
                executionId: resolvedExecutionId,
                subtype: SEIZURE_LOG_TAB_SUBTYPE[tab],
            });
            openUnifiedSeizureLogTab(tab);
        },
        [resolvedExecutionId]
    );

    const thirdPartyDecision = React.useMemo(
        () => getGoverningSeizureDecisionBySubtype(resolvedExecutionId, 'third_party', decisions),
        [resolvedExecutionId, decisions]
    );
    const salaryDecision = React.useMemo(() => {
        const bySubtype = getGoverningSeizureDecisionBySubtype(resolvedExecutionId, 'salary', decisions);
        if (bySubtype) return bySubtype as any;

        const isGuarantorRelated = (txt: string) => /الكفيل|كفيل/i.test(String(txt || ''));
        const isSalaryRelated = (txt: string) =>
            /حجز\s*راتب|حجز\s*الحوافز|الحوافز|المخصصات|الراتب/i.test(String(txt || ''));

        const candidates = decisions.filter((r) => {
            const rk = String((r as any)?.requestKind || '').trim();
            const rid = String((r as any)?.id || '').trim();
            const isSeizureLike = rk === 'seizure' || (!rk && /^seizure_req_/i.test(rid));
            if (!isSeizureLike) return false;
            const st = String((r as any)?.seizureSubtype || '').trim();
            if (st && st !== 'salary') return false;
            const title = String((r as any)?.title || '');
            const body = String((r as any)?.body || '');
            if (isGuarantorRelated(title) || isGuarantorRelated(body)) return false;
            return isSalaryRelated(title) || isSalaryRelated(body);
        });
        if (candidates.length === 0) return null;
        const first = candidates[0] as any;
        return candidates.reduce((acc: any, cur: any) => {
            const a = String(acc?.resolvedAt ?? acc?.date ?? '');
            const b = String(cur?.resolvedAt ?? cur?.date ?? '');
            return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
        }, first) as any;
    }, [resolvedExecutionId, decisions]);

    React.useEffect(() => {
        const did = String((salaryDecision as any)?.id || '').trim();
        if (!did) return;
        setLastSalaryDecisionId(did);
    }, [salaryDecision]);
    const propertyDecision = React.useMemo(
        () => getGoverningSeizureDecisionBySubtype(resolvedExecutionId, 'property', decisions),
        [resolvedExecutionId, decisions]
    );
    const movableDecision = React.useMemo(
        () => getGoverningSeizureDecisionBySubtype(resolvedExecutionId, 'movable_auction', decisions),
        [resolvedExecutionId, decisions]
    );

    const parseIsoFromYmd = (ymd: string): string | null => {
        const t = String(ymd || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
        const dt = new Date(`${t}T00:00:00.000Z`);
        return Number.isFinite(dt.getTime()) ? dt.toISOString() : null;
    };

    const normalizeDigitsOnly = (raw: string): string => {
        const t = String(raw || '');
        const ascii = t.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
        return ascii.replace(/[^\d]/g, '');
    };

    const renderDecisionInline = (row: any, requestKind: string) => {
        if (!row?.id) return null;
        const decisionId = String(row.id || '').trim();
        if (!decisionId) return null;
        const rejected = isExecutorRowRejectedAndFinal(row);
        const pending = String(row.executorOutcome ?? 'pending') === 'pending' || String(row.executorOutcome ?? '') === '';
        if (!pending && !rejected) return null;
        if (rejected) {
            return (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-3">
                    <p className="text-[11px] font-black text-rose-200 text-right">
                        تم رفض الطلب من قبل المنفذ
                    </p>
                    <div className="mt-2">
                        <ExecutionInlineExecutorDecisionActions
                            executionId={resolvedExecutionId}
                            decisionId={decisionId}
                            requestKind={requestKind}
                            disabled
                            onOpenAppealCenter={() => openAppeals(decisionId)}
                        />
                    </div>
                </div>
            );
        }
        return (
            <ExecutionInlineExecutorDecisionActions
                executionId={resolvedExecutionId}
                decisionId={decisionId}
                requestKind={requestKind}
            />
        );
    };

    const renderThirdPartyInlineCompletionIfAny = (row: any) => {
        if (!row?.id) return null;
        if (!isExecutorRowApprovedWorkflowActive(row, decisions)) return null;
        const savedAt = String(row.seizureRequestSavedAt || '').trim();
        if (savedAt) return null;

        const name = String(thirdPartyNameDraft || '').trim();
        const amount = parseExecutionAmountInt(thirdPartyAmountDraft);
        const notifyYmd = getLocalTodayYmd();
        const iso = parseIsoFromYmd(notifyYmd);

        const canSave = Boolean(name) && amount > 0 && Boolean(resolvedExecutionId);

        return (
            <div className="space-y-2">
                <p className="text-[10px] text-slate-300 text-right">
                    أكمل البيانات هنا بدل نافذة منبثقة:
                </p>
                <div className="grid grid-cols-1 gap-2">
                    <input
                        type="text"
                        value={thirdPartyNameDraft}
                        onChange={(e) => setThirdPartyNameDraft(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                        placeholder="اسم الجهة الثالثة (مثلاً: مصرف الرافدين)"
                    />
                    <input
                        type="text"
                        inputMode="numeric"
                        value={thirdPartyAmountDraft}
                        onChange={(e) => {
                            const digits = normalizeDigitsOnly(String(e.target.value || ''));
                            setThirdPartyAmountDraft(digits ? formatNumberInput(digits) : '');
                        }}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right tabular-nums"
                        placeholder="المبلغ المطلوب حجزه (د.ع)"
                    />
                </div>
                <button
                    type="button"
                    disabled={!canSave}
                    className="w-full rounded-xl bg-gradient-to-l from-cyan-500 to-sky-700 px-5 py-2.5 text-[12px] font-black text-white shadow-md shadow-black/20 disabled:opacity-40"
                    onClick={() => {
                        if (!canSave || !resolvedExecutionId) return;
                        const decisionId = String(row.id || '').trim();
                        const entityId = `tps_${decisionId}_${Date.now()}`;
                        const notificationDateIso = iso ?? new Date().toISOString();
                        const nextSeizure = {
                            id: entityId,
                            decisionRowId: decisionId,
                            thirdPartyName: name,
                            requestedAmountIqd: amount,
                            notificationDateIso,
                            replyStatus: 'pending',
                            transferredAmountIqd: null,
                            status: 'notified',
                        };
                        const prev = Array.isArray((executionData as any)?.thirdPartySeizures)
                            ? ((executionData as any).thirdPartySeizures as any[])
                            : [];
                        const nextSeizures = [nextSeizure, ...prev.filter((x) => String(x?.id || '') !== entityId)];

                        const nowIso = new Date().toISOString();
                        pushTimelineEvent(
                            {
                                id: nextTimelineId(),
                                date: notifyYmd,
                                timestamp: nowIso,
                                title: '📨 حجز مال المدين لدى الغير — تم التسجيل',
                                description: `الجهة: ${name}\nالمبلغ المطلوب حجزه: ${amount.toLocaleString('ar-IQ')} د.ع.`,
                                type: 'coercive',
                                source: 'التنفيذ والمحجوزات',
                                metadata: {
                                    thirdPartySeizureId: entityId,
                                    decisionRowId: decisionId,
                                    timelineThreadKey: `third_party_seizure:${decisionId}`,
                                },
                            },
                            { mergePatch: { thirdPartySeizures: nextSeizures } }
                        );

                        const patched = patchExecutorDecisionRowEverywhere(decisionId, {
                            seizureRequestSavedAt: nowIso,
                            seizureRequestDetails: [
                                `الجهة: ${name}`,
                                `المبلغ المطلوب حجزه: ${amount.toLocaleString('ar-IQ')} د.ع`,
                            ].join('\n'),
                            seizurePayloadJson: JSON.stringify({
                                thirdPartySeizureId: entityId,
                                thirdPartyName: name,
                                requestedAmountIqd: amount,
                                notificationDateIso,
                            }),
                        });
                        if (!patched.ok) {
                            showToast('تعذّر ربط الحفظ ببطاقة القرار — أعد المحاولة.', 'warning');
                            return;
                        }
                        dispatchDecisionsReload();

                        persistExecutionMerge({ thirdPartySeizures: nextSeizures });
                        setThirdPartyNameDraft('');
                        setThirdPartyAmountDraft('');
                        showToast('تم الحفظ — اكتملت دورة الطلب.', 'success');
                    }}
                >
                    الحفظ
                </button>
            </div>
        );
    };

    const submitBasicSeizureRequest = React.useCallback(
        (args: { actionType: 'salary' | 'property' | 'vehicle'; title: string; body: string; subtype: any }) => {
            const exId = resolvedExecutionId;
            if (!exId) return null;
            if (
                args.actionType === 'salary' &&
                isSalarySeizureLaneOccupied({
                    seizedAssets: executionData?.seizedAssets,
                    seizureDraftsByDecisionId: executionData?.seizureDraftsByDecisionId as
                        | Record<string, import('@/app/types/execution').SeizedAsset>
                        | undefined,
                })
            ) {
                showToast('يوجد حجز راتب نشط أو طلب قيد البت — لا يمكن التكرار قبل فك الحجز.', 'warning');
                return null;
            }
            const decisionId = appendPendingExecutorSeizureDecision({
                executionId: exId,
                requestTitle: `${args.title} — قيد البت لدى المنفذ`,
                requestBody: args.body,
                seizureSubtype: args.subtype,
            } as any);
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning');
                return null;
            }
            const nowIso = new Date().toISOString();
            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    type: 'decision',
                    title: `📋 ${args.title} — قيد البت`,
                    description: args.body,
                    date: nowIso.slice(0, 10),
                    timestamp: nowIso,
                    source: 'التنفيذ والمحجوزات',
                    metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
                } as any
            );
            showToast('تم إنشاء الطلب — قرار المنفذ يظهر هنا مباشرة.', 'success');
            return decisionId;
        },
        [appendPendingExecutorSeizureDecision, executionData?.seizedAssets, executionData?.seizureDraftsByDecisionId, nextTimelineId, pushTimelineEvent, resolvedExecutionId, showToast]
    );

    const salaryRowForUi = React.useMemo(() => {
        const direct = salaryDecision as any;
        if (direct?.id) return direct;
        const did = String(lastSalaryDecisionId || '').trim();
        if (!did) return null;
        const found = decisions.find((r) => String((r as any)?.id || '').trim() === did) as any;
        if (found?.id) return found;
        return {
            id: did,
            title: activeDebtorIsDeceased ? 'طلب حجز الحوافز والمخصصات' : 'طلب حجز راتب',
            requestKind: 'seizure',
            seizureSubtype: 'salary',
            executorOutcome: 'pending',
        } as any;
    }, [activeDebtorIsDeceased, decisions, lastSalaryDecisionId, salaryDecision]);

    const hasActiveSalarySeizure = React.useMemo(
        () =>
            (executionData?.seizedAssets || []).some(
                (a) => isSalarySeizureAsset(a) && String(a.status || '') === 'seized'
            ),
        [executionData?.seizedAssets]
    );

    const salaryLaneOccupied = React.useMemo(
        () =>
            isSalarySeizureLaneOccupied({
                seizedAssets: executionData?.seizedAssets,
                seizureDraftsByDecisionId: executionData?.seizureDraftsByDecisionId as
                    | Record<string, import('@/app/types/execution').SeizedAsset>
                    | undefined,
            }),
        [executionData?.seizedAssets, executionData?.seizureDraftsByDecisionId]
    );

    const salaryRequestOpen = React.useMemo(() => {
        const row = salaryRowForUi;
        if (!row?.id) return salaryLaneOccupied;
        if (isExecutorRowRejectedAndFinal(row)) return false;
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' ||
            String(row.executorOutcome ?? '') === '';
        const approvedNotSaved =
            isExecutorRowApprovedWorkflowActive(row, decisions) &&
            !String(row.seizureRequestSavedAt || '').trim();
        return salaryLaneOccupied || pending || approvedNotSaved;
    }, [decisions, salaryLaneOccupied, salaryRowForUi]);

    const salaryRequestSettled = React.useMemo(
        () =>
            hasActiveSalarySeizure ||
            (salaryRowForUi ? isSeizureRequestFullyRegistered(salaryRowForUi, decisions) : false),
        [decisions, hasActiveSalarySeizure, salaryRowForUi]
    );
    const salaryLogReady = React.useMemo(
        () =>
            hasActiveSalarySeizure ||
            (salaryRowForUi ? isSeizureRegistrationComplete(salaryRowForUi, decisions) : false),
        [decisions, hasActiveSalarySeizure, salaryRowForUi]
    );
    const salaryRegistrationAckReady = React.useMemo(
        () => Boolean(salaryRowForUi && isSeizureRegistrationComplete(salaryRowForUi, decisions)),
        [decisions, salaryRowForUi]
    );

    const openSalarySeizureRequest = React.useCallback(async () => {
        if (seizureActionsDisabled) return;
        if (hasActiveSalarySeizure) {
            const open = await SmartDialog.confirm(
                'تم حجز الراتب فعلاً. هل تريد فتح الطلب؟',
                {
                    title: 'حجز الراتب',
                    confirmText: 'فتح الطلب',
                    cancelText: 'إلغاء',
                }
            );
            if (!open) return;
            const did = String(salaryRowForUi?.id || '').trim();
            if (did) {
                openDecisions(did);
                return;
            }
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-unified-seizure-log', { detail: { tab: 'salary' } })
                );
            } catch {
                /* ignore */
            }
            return;
        }
        const did = String(salaryRowForUi?.id || '').trim();
        if (did) {
            const outcome = String(salaryRowForUi?.executorOutcome ?? 'pending').trim();
            const alternative = outcome === 'alternative';
            const rejected = isExecutorRowRejectedAndFinal(salaryRowForUi);
            const approved =
                !rejected &&
                (alternative || isExecutorRowApprovedWorkflowActive(salaryRowForUi, decisions));
            const savedAt = String(salaryRowForUi?.seizureRequestSavedAt || '').trim();
            const needsCompletion = approved && !savedAt;
            if (needsCompletion) {
                return;
            }
            if (approved && savedAt) {
                openDecisions(did);
                return;
            }
            openDecisions(did);
            return;
        }
        if (coerciveUiLocked) return;
        setInlineActionGateKey('seizure_salary');
    }, [
        coerciveUiLocked,
        hasActiveSalarySeizure,
        openDecisions,
        salaryRowForUi,
        seizureActionsDisabled,
    ]);

    const salaryRequestTitle = activeDebtorIsDeceased
        ? 'طلب حجز الحوافز والمخصصات'
        : 'طلب حجز راتب';

    React.useEffect(() => {
        const row = salaryRowForUi;
        if (!row?.id) return;
        if (isExecutorRowRejectedAndFinal(row)) return;
        if (!isExecutorRowApprovedWorkflowActive(row, decisions)) return;
        const savedAt = String(row.seizureRequestSavedAt || '').trim();
        if (savedAt) {
            salaryAutoRegisterSigRef.current = '';
            return;
        }
        const decisionId = String(row.id).trim();
        if (!decisionId) return;
        if (salaryAutoRegisterSigRef.current === decisionId) return;
        const alreadyInRegistry = (executionData?.seizedAssets || []).some((a) => {
            if (!isSalarySeizureAsset(a)) return false;
            const det =
                typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                    ? (a.details as Record<string, unknown>)
                    : null;
            return String(det?.decisionRowId || '') === decisionId;
        });
        if (alreadyInRegistry) return;
        salaryAutoRegisterSigRef.current = decisionId;
        saveCoerciveAction('salary', {
            decisionRowId: decisionId,
            employerName: '',
            salaryAmount: '',
            monthlyDeductionIqd: '',
        });
    }, [decisions, executionData?.seizedAssets, salaryRowForUi, saveCoerciveAction]);

    const renderPropertyCompletion = (row: any) => {
        const decisionId = String(row?.id || '').trim();
        if (!decisionId) return null;
        if (!isExecutorRowApprovedWorkflowActive(row, decisions)) return null;
        const savedAt = String(row.seizureRequestSavedAt || '').trim();
        if (savedAt) return null;
        const draft = propertyDetailsDraftByDecisionId[decisionId] || { propertyNumber: '', propertyDistrict: '', propertyType: '' };
        return (
            <div className="space-y-2">
                <input
                    type="text"
                    value={draft.propertyNumber}
                    onChange={(e) =>
                        setPropertyDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, propertyNumber: e.target.value },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="رقم العقار"
                />
                <input
                    type="text"
                    value={draft.propertyDistrict}
                    onChange={(e) =>
                        setPropertyDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, propertyDistrict: e.target.value },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="المقاطعة"
                />
                <input
                    type="text"
                    value={draft.propertyType}
                    onChange={(e) =>
                        setPropertyDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, propertyType: e.target.value },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="نوع العقار"
                />
                <button
                    type="button"
                    disabled={!String(draft.propertyNumber || '').trim() || !String(draft.propertyDistrict || '').trim() || !String(draft.propertyType || '').trim()}
                    onClick={() => {
                        if (!String(draft.propertyNumber || '').trim()) return showToast('أدخل رقم العقار', 'warning');
                        if (!String(draft.propertyDistrict || '').trim()) return showToast('أدخل المقاطعة', 'warning');
                        if (!String(draft.propertyType || '').trim()) return showToast('أدخل نوع العقار', 'warning');
                        saveCoerciveAction('property', {
                            decisionRowId: decisionId,
                            propertyNumber: String(draft.propertyNumber || '').trim(),
                            propertyDistrict: String(draft.propertyDistrict || '').trim(),
                            propertyType: String(draft.propertyType || '').trim(),
                        });
                    }}
                    className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                >
                    حفظ التفاصيل
                </button>
            </div>
        );
    };

    const renderVehicleCompletion = (row: any) => {
        const decisionId = String(row?.id || '').trim();
        if (!decisionId) return null;
        if (!isExecutorRowApprovedWorkflowActive(row, decisions)) return null;
        const savedAt = String(row.seizureRequestSavedAt || '').trim();
        if (savedAt) return null;
        const draft = vehicleDetailsDraftByDecisionId[decisionId] || {
            movableDescription: '',
            movableLocation: '',
        };
        return (
            <div className="space-y-2">
                <input
                    type="text"
                    value={draft.movableDescription}
                    onChange={(e) =>
                        setVehicleDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, movableDescription: e.target.value },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="وصف المال المنقول"
                />
                <input
                    type="text"
                    value={draft.movableLocation}
                    onChange={(e) =>
                        setVehicleDetailsDraftByDecisionId((prev) => ({
                            ...prev,
                            [decisionId]: { ...draft, movableLocation: e.target.value },
                        }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-100 text-right"
                    placeholder="مكان تواجد المال المنقول"
                />
                <button
                    type="button"
                    disabled={
                        !String(draft.movableDescription || '').trim() ||
                        !String(draft.movableLocation || '').trim()
                    }
                    onClick={() => {
                        if (!String(draft.movableDescription || '').trim())
                            return showToast('أدخل وصف المال المنقول', 'warning');
                        if (!String(draft.movableLocation || '').trim())
                            return showToast('أدخل مكان تواجد المال المنقول', 'warning');
                        saveCoerciveAction('vehicle', {
                            decisionRowId: decisionId,
                            movableDescription: String(draft.movableDescription || '').trim(),
                            movableLocation: String(draft.movableLocation || '').trim(),
                        });
                    }}
                    className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                >
                    حفظ التفاصيل
                </button>
            </div>
        );
    };

    const buildRequestSteps = (title: string, row: any, requestKind: string, extra?: React.ReactNode): ExecutionInlineStep[] => {
        const hasRow = Boolean(row?.id);
        const rejected = hasRow ? isExecutorRowRejectedAndFinal(row) : false;
        const approved = hasRow ? isExecutorRowApprovedWorkflowActive(row, decisions) : false;
        const pending = hasRow ? String(row.executorOutcome ?? 'pending') === 'pending' || String(row.executorOutcome ?? '') === '' : false;
        return [
            {
                id: `${title}:submit`,
                title,
                subtitle: hasRow ? 'تم إرسال الطلب إلى سلطة المنفذ' : 'لم يتم إرسال الطلب بعد',
                status: hasRow ? 'done' : 'active',
                tone: hasRow ? 'success' : 'neutral',
            } satisfies ExecutionInlineStep,
            {
                id: `${title}:executor`,
                title: 'قرار المنفذ',
                subtitle: rejected ? 'تم رفض الطلب' : approved ? 'تمت الموافقة' : pending ? 'قيد البت' : '—',
                status: rejected ? 'active' : pending ? 'active' : hasRow ? 'done' : 'locked',
                tone: rejected ? 'danger' : approved ? 'success' : 'neutral',
                content: hasRow ? renderDecisionInline(row, requestKind) : null,
            } satisfies ExecutionInlineStep,
            ...(extra
                ? [
                      {
                          id: `${title}:details`,
                          title: 'إكمال البيانات',
                          subtitle: 'حقول مدمجة داخل نفس البطاقة',
                          status: approved && !rejected ? 'active' : 'locked',
                          tone: approved && !rejected ? 'neutral' : 'neutral',
                          content: approved && !rejected ? extra : null,
                      } satisfies ExecutionInlineStep,
                  ]
                : []),
        ];
    };

    const renderMovableSeizureBlock = () => {
        const movableSettled =
            movableDecision && isSeizureRequestFullyRegistered(movableDecision, decisions);
        const movableLogReady =
            movableDecision && isSeizureRegistrationComplete(movableDecision, decisions);
        return (
        <SeizureRequestBlock
            disabled={seizureActionsDisabled}
            className="w-full rounded-2xl border border-sky-300/15 bg-sky-500/[0.06] hover:bg-sky-500/[0.10] hover:border-sky-200/25"
            onClick={() => {
                if (seizureActionsDisabled) return;
                if (movableSettled) {
                    acknowledgeSeizureRequestFromLog('movable');
                    return;
                }
                setInlineActionGateKey('seizure_vehicle');
            }}
            icon={
                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                    <Package className="w-6 h-6 text-white/70" />
                </span>
            }
            label={
                <span className="flex flex-col items-end gap-0.5">
                    <span>طلب حجز مال منقول</span>
                    {movableSettled ? (
                        <span className="text-[10px] font-semibold text-sky-200/80">
                            تم التسجيل — اضغط أو «السجل» للمتابعة
                        </span>
                    ) : null}
                </span>
            }
            trailingSlot={
                movableLogReady ? (
                    <SeizureLogNavigateBadge
                        tab="movable"
                        tone="sky"
                        onAcknowledgeCycle={() => acknowledgeSeizureRequestFromLog('movable')}
                    />
                ) : null
            }
            afterButton={
                <InlineActionGate
                    gateKey="seizure_vehicle"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        setInlineActionGateKey(null);
                        submitBasicSeizureRequest({
                            actionType: 'vehicle',
                            title: 'طلب حجز مال منقول',
                            body: 'طلب حجز مال منقول (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.',
                            subtype: 'movable_auction',
                        });
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            }
        >
            {movableDecision && !movableSettled ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion
                        steps={buildRequestSteps(
                            'طلب حجز مال منقول',
                            movableDecision,
                            'seizure',
                            renderVehicleCompletion(movableDecision)
                        )}
                    />
                </div>
            ) : null}
        </SeizureRequestBlock>
        );
    };

    const renderThirdPartySeizureBlock = () => {
        const thirdPartySettled =
            thirdPartyDecision && isSeizureRequestFullyRegistered(thirdPartyDecision, decisions);
        const thirdPartyLogReady =
            thirdPartyDecision && isSeizureRegistrationComplete(thirdPartyDecision, decisions);
        return (
        <SeizureRequestBlock
            disabled={seizureActionsDisabled}
            className="w-full rounded-2xl border border-violet-300/15 bg-violet-500/[0.06] hover:bg-violet-500/[0.10] hover:border-violet-200/25"
            onClick={() => {
                if (seizureActionsDisabled) return;
                if (thirdPartySettled) {
                    acknowledgeSeizureRequestFromLog('third_party');
                    return;
                }
                setInlineActionGateKey('seizure_third_party');
            }}
            icon={
                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                    <Users className="w-6 h-6 text-white/70" />
                </span>
            }
            label={
                <span className="flex flex-col items-end gap-0.5">
                    <span>طلب حجز مال المدين لدى الغير</span>
                    {thirdPartySettled ? (
                        <span className="text-[10px] font-semibold text-violet-200/80">
                            تم التسجيل — اضغط أو «السجل» للمتابعة
                        </span>
                    ) : null}
                </span>
            }
            trailingSlot={
                thirdPartyLogReady ? (
                    <SeizureLogNavigateBadge
                        tab="third_party"
                        tone="violet"
                        onAcknowledgeCycle={() => acknowledgeSeizureRequestFromLog('third_party')}
                    />
                ) : null
            }
            afterButton={
                <InlineActionGate
                    gateKey="seizure_third_party"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        setInlineActionGateKey(null);
                        requestFollowupSeizureDecision(
                            'third_party',
                            'حجز مال المدين لدى الغير',
                            'طلب حجز مال المدين لدى الغير وفقاً لإجراءات التنفيذ.'
                        );
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            }
        >
            {thirdPartyDecision && !thirdPartySettled ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion
                        steps={buildRequestSteps(
                            'طلب حجز مال المدين لدى الغير',
                            thirdPartyDecision,
                            'seizure',
                            renderThirdPartyInlineCompletionIfAny(thirdPartyDecision)
                        )}
                    />
                </div>
            ) : null}
        </SeizureRequestBlock>
        );
    };

    const renderPropertySeizureBlock = () => {
        const propertySettled =
            propertyDecision && isSeizureRequestFullyRegistered(propertyDecision, decisions);
        const propertyLogReady =
            propertyDecision && isSeizureRegistrationComplete(propertyDecision, decisions);
        return (
        <SeizureRequestBlock
            disabled={seizureActionsDisabled}
            className="w-full rounded-2xl border border-amber-300/15 bg-amber-500/[0.06] hover:bg-amber-500/[0.10] hover:border-amber-200/25"
            onClick={() => {
                if (seizureActionsDisabled) return;
                if (propertySettled) {
                    acknowledgeSeizureRequestFromLog('property');
                    return;
                }
                setInlineActionGateKey('seizure_property');
            }}
            icon={
                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                    <Building2 className="w-6 h-6 text-white/70" />
                </span>
            }
            label={
                <span className="flex flex-col items-end gap-0.5">
                    <span>طلب حجز عقار</span>
                    {propertySettled ? (
                        <span className="text-[10px] font-semibold text-amber-200/80">
                            تم التسجيل — اضغط أو «السجل» للمتابعة
                        </span>
                    ) : null}
                </span>
            }
            trailingSlot={
                propertyLogReady ? (
                    <SeizureLogNavigateBadge
                        tab="property"
                        tone="amber"
                        onAcknowledgeCycle={() => acknowledgeSeizureRequestFromLog('property')}
                    />
                ) : null
            }
            afterButton={
                <InlineActionGate
                    gateKey="seizure_property"
                    activeKey={inlineActionGateKey}
                    onConfirm={() => {
                        setInlineActionGateKey(null);
                        submitBasicSeizureRequest({
                            actionType: 'property',
                            title: 'طلب حجز عقار',
                            body: 'طلب حجز عقار (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.',
                            subtype: 'property',
                        });
                    }}
                    onCancel={() => setInlineActionGateKey(null)}
                />
            }
        >
            {propertyDecision && !propertySettled ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion
                        steps={buildRequestSteps(
                            'طلب حجز عقار',
                            propertyDecision,
                            'seizure',
                            renderPropertyCompletion(propertyDecision)
                        )}
                    />
                </div>
            ) : null}
        </SeizureRequestBlock>
        );
    };

    return (
        <div className="p-4 space-y-3 text-right">
        {showGuarantorRequestInTab ? (
            <SeizureRequestBlock
                disabled={executionCoerciveButtonDisabled || coerciveUiLocked || isHistoricalMode}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 text-[12px] font-bold text-slate-100 backdrop-blur-xl transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5 hover:border-amber-400/35 hover:shadow-[0_18px_48px_rgba(0,0,0,0.45),0_0_0_1px_rgba(230,198,115,0.08)] disabled:opacity-40"
                onClick={() => {
                    if (executionCoerciveButtonDisabled || coerciveUiLocked || isHistoricalMode)
                        return;
                    const did = String(findLatestGuarantorDecision?.id || '').trim();
                    const rejected = Boolean(did) && isExecutorRowRejectedAndFinal(findLatestGuarantorDecision);
                    const outcome = String(findLatestGuarantorDecision?.executorOutcome ?? 'pending').trim();
                    const alternative = outcome === 'alternative';
                    const approved =
                        Boolean(did) &&
                        !rejected &&
                        (alternative ||
                            isExecutorRowApprovedWorkflowActive(findLatestGuarantorDecision, decisions));
                    const detailsSaved = Boolean(
                        String(findLatestGuarantorDecision?.guarantorDetailsSavedAt || '').trim()
                    );
                    const needsCompletion = approved && !detailsSaved;
                    if (needsCompletion) {
                        openGuarantorDetails(did || undefined);
                        return;
                    }
                    if (executionData?.guarantor_followup?.details_saved === true) {
                        setGuarantorExistingWarningOpen(true);
                        return;
                    }
                    setInlineActionGateKey('guarantor_request');
                }}
                icon={
                    <span className="grid size-10 place-items-center rounded-full bg-amber-500/10 text-amber-200">
                        <Shield size={18} className="text-current" />
                    </span>
                }
                label={<p className="text-white font-bold text-sm">طلب كفيل ضامن</p>}
                afterButton={
                    <InlineActionGate
                        gateKey="guarantor_request"
                        activeKey={inlineActionGateKey}
                        onConfirm={() => {
                            setInlineActionGateKey(null);
                            handleGuarantorRequestFromFollowup();
                        }}
                        onCancel={() => setInlineActionGateKey(null)}
                    />
                }
            >
                {guarantorExistingWarningOpen ? (
                    <div className="mt-2 rounded-2xl border border-amber-500/40 bg-amber-950/20 p-3 text-right">
                        <p className="text-amber-200 text-[11px] font-black">يوجد كفيل ضامن مُسجَّل في الإضبارة</p>
                        <p className="mt-1 text-amber-100/85 text-[10px] leading-relaxed">
                            هذا الطلب سيُستخدم لإدخال كفيل جديد. أكمل الطلب فقط إذا كنت تريد استبدال الكفيل الحالي.
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setGuarantorExistingWarningOpen(false);
                                    setInlineActionGateKey('guarantor_request');
                                }}
                                className="rounded-xl border border-amber-400/55 bg-gradient-to-r from-amber-900/40 to-amber-800/30 py-2.5 text-[11px] font-extrabold text-amber-100 hover:from-amber-800/50 hover:to-amber-700/35"
                            >
                                أتفهم الأمر
                            </button>
                            <button
                                type="button"
                                onClick={() => setGuarantorExistingWarningOpen(false)}
                                className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-[11px] font-bold text-slate-200 hover:bg-white/10"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                ) : null}
                {findLatestGuarantorDecision ? (
                    <GuarantorWorkspaceWrapper
                        executionId={resolvedExecutionId}
                        row={findLatestGuarantorDecision}
                        guarantorFollowup={executionData?.guarantor_followup}
                        persistGuarantorFollowupDetails={persistGuarantorFollowupDetails}
                        disabled={isHistoricalMode || coerciveUiLocked}
                        onOpenAppeals={openAppeals}
                        onOpenDecisions={openDecisions}
                        onOpenGuarantorDetails={openGuarantorDetails}
                    />
                ) : null}
            </SeizureRequestBlock>
        ) : null}
        {!seizureMatrix.showTabContentButtons ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                <p className="text-sm leading-relaxed text-slate-400">
                    لا تتوفر إجراءات حجز — تحقق من الوعاء المتبقي أو حالة الإضبارة.
                </p>
                <p className="mt-2 text-xs text-slate-500 tabular-nums">
                    المتبقي بذمة المدين: {financialCenterBalanceIqd.toLocaleString('ar-IQ')} د.ع
                </p>
            </div>
        ) : (
        <div className="flex flex-col gap-3">
        {showRecommendedButton('salary') && !salaryRequestOpen ? (
        <SeizureRequestBlock
            disabled={seizureActionsDisabled}
            className={`w-full rounded-2xl border ${
                hasActiveSalarySeizure
                    ? 'border-slate-500/30 bg-slate-800/40 text-slate-300 cursor-pointer'
                    : 'border-emerald-300/15 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.10] hover:border-emerald-200/25'
            }`}
            onClick={() => {
                if (seizureActionsDisabled) return;
                if (salaryRequestSettled) {
                    if (salaryRegistrationAckReady) {
                        acknowledgeSeizureRequestFromLog('salary');
                    } else {
                        openUnifiedSeizureLogTab('salary');
                    }
                    return;
                }
                if (hasActiveSalarySeizure) {
                    void openSalarySeizureRequest();
                    return;
                }
                setInlineActionGateKey('seizure_salary');
            }}
            icon={
                <span
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl ${
                        hasActiveSalarySeizure ? 'bg-slate-700/40' : 'bg-white/5'
                    }`}
                >
                    {hasActiveSalarySeizure ? (
                        <Lock className="w-5 h-5 text-slate-400" />
                    ) : (
                        <Wallet className="w-6 h-6 text-white/70" />
                    )}
                </span>
            }
            label={
                <span className="flex flex-col items-end gap-0.5">
                    <span>{salaryRequestTitle}</span>
                    {hasActiveSalarySeizure || salaryRequestSettled ? (
                        <span className="text-[10px] font-semibold text-slate-400">
                            {salaryRequestSettled ? 'تم التسجيل — اضغط أو «السجل» للمتابعة' : 'تم الحجز — اضغط للاطلاع'}
                        </span>
                    ) : null}
                </span>
            }
            trailingSlot={
                salaryLogReady ? (
                    <SeizureLogNavigateBadge
                        tab="salary"
                        tone="emerald"
                        onAcknowledgeCycle={
                            salaryRegistrationAckReady
                                ? () => acknowledgeSeizureRequestFromLog('salary')
                                : undefined
                        }
                    />
                ) : null
            }
            afterButton={
                hasActiveSalarySeizure ? null : (
                    <InlineActionGate
                        gateKey="seizure_salary"
                        activeKey={inlineActionGateKey}
                        onConfirm={() => {
                            setInlineActionGateKey(null);
                            const did = submitBasicSeizureRequest({
                                actionType: 'salary',
                                title: salaryRequestTitle,
                                body: activeDebtorIsDeceased
                                    ? 'طلب حجز الحوافز والمخصصات (مبدئي) — يُسجَّل قرار المنفذ فقط.'
                                    : 'طلب حجز راتب (مبدئي) — يُسجَّل قرار المنفذ فقط.',
                                subtype: 'salary',
                            });
                            if (did) setLastSalaryDecisionId(did);
                        }}
                        onCancel={() => setInlineActionGateKey(null)}
                    />
                )
            }
        >
            {salaryRowForUi && !salaryRequestSettled ? (
                <div className="mt-2">
                    <ExecutionInlineAccordion
                        steps={buildRequestSteps(salaryRequestTitle, salaryRowForUi, 'seizure')}
                    />
                </div>
            ) : null}
        </SeizureRequestBlock>
        ) : null}
        {showRecommendedButton('movable') ? renderMovableSeizureBlock() : null}
        {showRecommendedButton('third_party') ? renderThirdPartySeizureBlock() : null}
        {showRecommendedButton('property') ? renderPropertySeizureBlock() : null}

        {progressive.showAdditionalExpand && !additionalSeizureExpanded ? (
            <SeizureMatrixExpandLink
                variant="additional"
                label="إظهار خيارات حجز إضافية..."
                onClick={() => setAdditionalSeizureExpanded(true)}
            />
        ) : null}

        {showManualButton('movable', 'additional') ? renderMovableSeizureBlock() : null}
        {showManualButton('third_party', 'additional') ? renderThirdPartySeizureBlock() : null}
        {showManualButton('property', 'additional') ? renderPropertySeizureBlock() : null}

        {progressive.showMaximumExpand && additionalSeizureExpanded && !maximumSeizureExpanded ? (
            <SeizureMatrixExpandLink
                variant="maximum"
                label="إظهار خيارات الحجز القصوى..."
                onClick={() => setMaximumSeizureExpanded(true)}
            />
        ) : null}

        {showManualButton('movable', 'maximum') ? renderMovableSeizureBlock() : null}
        {showManualButton('third_party', 'maximum') ? renderThirdPartySeizureBlock() : null}
        {showManualButton('property', 'maximum') ? renderPropertySeizureBlock() : null}
        </div>
        )}
    </div>
    );
};
