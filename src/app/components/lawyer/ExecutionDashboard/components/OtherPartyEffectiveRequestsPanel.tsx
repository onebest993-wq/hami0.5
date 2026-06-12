import React from 'react';
import {
    Building2,
    ArrowUpLeft,
    ChevronDown,
    Gavel,
    Hammer,
    Package,
    Plane,
    Scale,
    Shield,
    ShieldAlert,
    UserX,
    Wallet,
    X,
} from 'lucide-react';
import {
    resolveOtherPartyRequestOptionBadges,
    type OtherPartyRequestBadge,
    type OtherPartyRequestOutcome,
} from '@/app/utils/otherPartyEffectiveRequestsUtils';
import type { CreditorMirrorWorkflowContext } from '@/app/utils/creditorOtherPartyMirrorVisibility';
import type { HiddenFollowupVisibilityInput, HiddenGuarantorContext } from './hiddenFollowupRequestsUtils';
import { ManualOtherPartyLogBlock } from '../../execution/OtherPartyActionsLog';
import type { OtherPartyActionLogEntry, OtherPartyRequestTrackEntry } from '@/app/types/execution';
import {
    mergeExternalTracksPreferLocalAdvance,
    patchOtherPartyRequestTrack,
    readOtherPartyRequestTracks,
    removeOtherPartyRequestTrack,
    trackMapByOptionId,
    tracksLogicalEqual,
    tracksLogicalSignature,
} from '@/app/utils/otherPartyRequestTrackUtils';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    readDecisionsForManualTrackSync,
    readDecisionsForManualTrackSyncEnriched,
    resolveManualTrackDisplayState,
    syncAllManualTracksFromDecisions,
    type ManualTrackDisplayState,
} from '@/app/utils/otherPartyManualTrackDecisionSync';
import {
    filterDecisionsForDomainContext,
    filterOtherPartyCatalogOptionIds,
    resolveExecutionDomainContext,
} from '@/app/utils/executionDomainIsolation';
import { WaiveInitialAppealButton } from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';

export interface CreditorTrackDecisionHandlers {
    onSubmitCreditorRequest: (input: {
        optionId: string;
        label: string;
        date: string;
    }) => { ok: boolean; decisionId?: string };
    onResolveCreditorDecision: (input: {
        decisionId: string;
        resolution: 'approved' | 'rejected';
    }) => boolean;
    onOpenDecision?: (decisionId: string) => void;
    showMessage?: (message: string, type?: 'warning' | 'success') => void;
}

export interface OtherPartyEffectiveRequestsPanelProps {
    executionId: string | undefined;
    claimType: string;
    flags: HiddenFollowupVisibilityInput;
    guarantorCtx: HiddenGuarantorContext;
    activeDebtorKey?: string;
    primaryDebtorKey?: string;
    remainingBalanceIqd?: number;
    executionData?: import('@/app/types/execution').ExecutionFile | null;
    activeDebtorIsDeceased?: boolean;
    mirrorWorkflow?: CreditorMirrorWorkflowContext;
    debtorAgentManualTrack?: boolean;
    onPersistTracks?: (next: OtherPartyRequestTrackEntry[]) => void;
    onOpenAppeals?: (decisionId?: string) => void;
    creditorTrackHandlers?: CreditorTrackDecisionHandlers;
    manualLog?: {
        entries: OtherPartyActionLogEntry[];
        onPersist: (next: OtherPartyActionLogEntry[]) => void;
        onSubmitToDecisions: (input: { date: string; content: string }) => { ok: boolean; decisionId?: string };
        executionId?: string;
        appealPerspective?: import('@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels').AppealUiPerspective;
    };
}

const STATUS_CHIP: Record<OtherPartyRequestOutcome, string> = {
    available: 'border-sky-400/25 bg-sky-500/10 text-sky-100',
    effective: 'border-emerald-400/30 bg-emerald-500/12 text-emerald-100',
    pending: 'border-amber-400/30 bg-amber-500/12 text-amber-50',
    rejected: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
    alternative: 'border-violet-400/25 bg-violet-500/10 text-violet-100',
    none: 'border-white/10 bg-white/5 text-slate-400',
};

const STATUS_ICON: Record<OtherPartyRequestOutcome, string> = {
    available: 'text-sky-300/80',
    effective: 'text-emerald-300/90',
    pending: 'text-amber-300/90',
    rejected: 'text-rose-300/90',
    alternative: 'text-violet-300/90',
    none: 'text-slate-500',
};

const STATUS_ACCENT: Record<OtherPartyRequestOutcome, string> = {
    available: 'border-r-sky-500/35',
    effective: 'border-r-emerald-500/45',
    pending: 'border-r-amber-500/40',
    rejected: 'border-r-rose-500/35',
    alternative: 'border-r-violet-500/35',
    none: 'border-r-white/10',
};

const BTN_PRIMARY =
    'inline-flex shrink-0 flex-row-reverse items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-bold transition disabled:opacity-40';
const BTN_ROW =
    'inline-flex flex-1 flex-row-reverse items-center justify-center gap-1 rounded-md py-1.5 text-[9px] font-bold transition';

function CollapsibleTracksSection({
    title,
    subtitle,
    children,
    defaultExpanded = false,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}) {
    const [expanded, setExpanded] = React.useState(defaultExpanded);
    return (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full flex-row-reverse items-center justify-between gap-2 border-b border-white/5 px-3 py-2 text-right transition hover:bg-white/[0.03]"
            >
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                />
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-slate-300">{title}</p>
                    {subtitle ? (
                        <p className="mt-0.5 text-[9px] text-slate-500">{subtitle}</p>
                    ) : null}
                </div>
            </button>
            {expanded ? <div className="p-2">{children}</div> : null}
        </div>
    );
}

function iconForBadge(id: string): React.ComponentType<{ size?: number; className?: string }> {
    if (id.startsWith('pc-forced_bring_in')) return UserX;
    if (id.startsWith('pc-travel_ban')) return Plane;
    if (id.startsWith('pc-arrest')) return ShieldAlert;
    if (id.startsWith('pc-executive_dossier')) return Scale;
    if (id.startsWith('pc-executive_detention')) return Gavel;
    if (id.includes('salary')) return Wallet;
    if (id.includes('property')) return Building2;
    if (id.includes('movable')) return Package;
    if (id.startsWith('gu-request') || id.startsWith('gu-guarantor')) return Shield;
    if (id.includes('break') || id.includes('Lock')) return Hammer;
    return Scale;
}

function ManualRequestBlock({
    badge,
    track,
    displayState,
    executionId,
    allDecisions,
    onUpdateTrack,
    onClearManualTrack,
    onOpenAppeals,
    creditorTrackHandlers,
}: {
    badge: OtherPartyRequestBadge;
    track: OtherPartyRequestTrackEntry | undefined;
    displayState: ManualTrackDisplayState;
    executionId: string | undefined;
    allDecisions: Decision[];
    onUpdateTrack: (patch: Partial<OtherPartyRequestTrackEntry>) => void;
    onClearManualTrack: () => void;
    onOpenAppeals?: (decisionId?: string) => void;
    creditorTrackHandlers?: CreditorTrackDecisionHandlers;
}) {
    const Icon = iconForBadge(badge.id);
    const [submitting, setSubmitting] = React.useState(false);
    const [resolving, setResolving] = React.useState<'approved' | 'rejected' | null>(null);
    const isClosed = displayState.phase === 'closed';
    const hasFooter =
        displayState.showExecutorVerdict || displayState.showAppealStrip || isClosed;
    const subtitle =
        displayState.phase === 'idle'
            ? 'لم يُسجَّل تقدّم بعد'
            : [displayState.statusShort, displayState.submittedDate].filter(Boolean).join(' · ');

    const applyOutcome = (value: 'approved' | 'rejected') => {
        if (resolving || !displayState.showExecutorVerdict) return;
        const decisionId = String(track?.decisionId || displayState.decisionId || '').trim();
        if (!decisionId || !creditorTrackHandlers) return;
        setResolving(value);
        try {
            const ok = creditorTrackHandlers.onResolveCreditorDecision({
                decisionId,
                resolution: value,
            });
            if (!ok) {
                creditorTrackHandlers.showMessage?.('تعذّر تسجيل قرار المنفذ — أعد المحاولة.', 'warning');
                return;
            }
            onUpdateTrack({
                label: badge.label,
                executorOutcome: value,
                submittedDate:
                    displayState.submittedDate || track?.submittedDate || getLocalTodayYmd(),
                decisionId,
            });
        } finally {
            setResolving(null);
        }
    };

    const handleCreditorSubmit = async () => {
        if (submitting) return;
        if (!displayState.showCreditorSubmit && !displayState.showResubmit) return;
        if (!creditorTrackHandlers) return;
        setSubmitting(true);
        const date = getLocalTodayYmd();
        const res = creditorTrackHandlers.onSubmitCreditorRequest({
            optionId: badge.id,
            label: badge.label,
            date,
        });
        if (!res.ok || !res.decisionId) {
            setSubmitting(false);
            return;
        }
        onUpdateTrack({
            label: badge.label,
            submittedDate: date,
            executorOutcome: 'submitted',
            decisionId: res.decisionId,
        });
        setSubmitting(false);
    };

    const handleOpenAppealsAndDismiss = () => {
        const decisionId =
            String(displayState.decisionId || track?.decisionId || '').trim() || undefined;
        onClearManualTrack();
        onOpenAppeals?.(decisionId);
    };

    return (
        <div
            className={`overflow-hidden rounded-lg border border-white/[0.07] border-r-2 bg-white/[0.02] ${STATUS_ACCENT[badge.outcome]}`}
        >
            <div className="flex flex-row-reverse items-center gap-2 px-2.5 py-2">
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/8 bg-black/25 ${STATUS_ICON[badge.outcome]}`}
                >
                    <Icon size={13} />
                </span>
                <div className="min-w-0 flex-1 text-right">
                    <p className="truncate text-[11px] font-semibold text-slate-100">{badge.label}</p>
                    <p className="truncate text-[9px] text-slate-500">{subtitle}</p>
                </div>
                {displayState.showCreditorSubmit ? (
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleCreditorSubmit()}
                        className={`${BTN_PRIMARY} border-sky-400/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/16`}
                    >
                        <ArrowUpLeft size={10} />
                        {submitting ? '…' : isClosed ? 'تقدّم جديد' : 'سجّل تقدّم الدائن'}
                    </button>
                ) : displayState.showResubmit ? (
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleCreditorSubmit()}
                        className={`${BTN_PRIMARY} border-amber-400/25 bg-amber-500/10 text-amber-50 hover:bg-amber-500/16`}
                    >
                        <ArrowUpLeft size={10} />
                        {submitting ? '…' : 'طلب جديد'}
                    </button>
                ) : (
                    <span
                        className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[8px] font-bold ${STATUS_CHIP[badge.outcome]}`}
                    >
                        {displayState.statusShort}
                    </span>
                )}
            </div>

            {hasFooter ? (
                <div className="space-y-1.5 border-t border-white/5 bg-black/10 px-2.5 py-1.5 text-right">
                    {displayState.showExecutorVerdict ? (
                        <div className="flex flex-row-reverse items-center gap-1.5">
                            <button
                                type="button"
                                disabled={Boolean(resolving)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    applyOutcome('approved');
                                }}
                                className={`${BTN_ROW} bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/16 disabled:pointer-events-none disabled:opacity-40`}
                            >
                                <Scale size={10} />
                                {resolving === 'approved' ? '…' : 'موافق'}
                            </button>
                            <button
                                type="button"
                                disabled={Boolean(resolving)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    applyOutcome('rejected');
                                }}
                                className={`${BTN_ROW} bg-rose-500/8 text-rose-100 hover:bg-rose-500/14 disabled:pointer-events-none disabled:opacity-40`}
                            >
                                <X size={10} />
                                {resolving === 'rejected' ? '…' : 'رفض'}
                            </button>
                            {displayState.decisionId && creditorTrackHandlers?.onOpenDecision ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        creditorTrackHandlers.onOpenDecision!(displayState.decisionId!)
                                    }
                                    className="shrink-0 rounded-md border border-white/10 px-2 py-1.5 text-[8px] font-bold text-slate-400 hover:text-slate-200"
                                >
                                    البطاقة
                                </button>
                            ) : null}
                        </div>
                    ) : null}

                    {displayState.showAppealStrip ? (
                        <>
                            <p className="text-[9px] leading-snug text-rose-100/90">
                                قرار نافذ — يحق التظلم أو الطعن خلال المدة النظامية.
                            </p>
                            <div className="flex flex-row-reverse gap-1.5">
                                {onOpenAppeals ? (
                                    <button
                                        type="button"
                                        onClick={handleOpenAppealsAndDismiss}
                                        className={`${BTN_ROW} border border-[#E6C673]/30 bg-[#E6C673]/10 text-[#F5E6A8] hover:bg-[#E6C673]/16`}
                                    >
                                        القرارات والطعون
                                    </button>
                                ) : null}
                                <div className="flex flex-1 [&>button]:w-full [&>button]:rounded-md [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:py-1.5 [&>button]:text-[9px] [&>button]:font-bold [&>button]:text-slate-300 [&>button]:hover:bg-white/10">
                                    <WaiveInitialAppealButton
                                        executionId={executionId}
                                        decisionId={String(
                                            displayState.decisionId || track?.decisionId || ''
                                        ).trim()}
                                        allDecisions={allDecisions}
                                        onApplied={(result) => {
                                            if (!result.ok) {
                                                creditorTrackHandlers?.showMessage?.(
                                                    result.message ??
                                                        'تعذّر تسجيل الاستغناء عن الطعن.',
                                                    'warning'
                                                );
                                                return;
                                            }
                                            creditorTrackHandlers?.showMessage?.(
                                                result.message ??
                                                    'لا حاجة للطعن — أُغلقت دورة الطلب.',
                                                'success'
                                            );
                                        }}
                                    />
                                </div>
                            </div>
                        </>
                    ) : null}

                    {isClosed ? (
                        <p className="text-[9px] text-slate-400">
                            لم يعد نافذاً — يمكن تسجيل تقدّم جديد.
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

export const OtherPartyEffectiveRequestsPanel: React.FC<OtherPartyEffectiveRequestsPanelProps> = ({
    executionId,
    claimType,
    flags,
    guarantorCtx,
    activeDebtorKey,
    primaryDebtorKey,
    remainingBalanceIqd,
    executionData,
    activeDebtorIsDeceased = false,
    mirrorWorkflow,
    debtorAgentManualTrack = false,
    onPersistTracks,
    onOpenAppeals,
    creditorTrackHandlers,
    manualLog,
}) => {
    const externalTracks = React.useMemo(
        () => readOtherPartyRequestTracks(executionData),
        [executionData?.other_party_request_tracks]
    );
    const externalTracksSig = React.useMemo(
        () => tracksLogicalSignature(externalTracks),
        [externalTracks]
    );
    const [tracks, setTracks] = React.useState<OtherPartyRequestTrackEntry[]>(externalTracks);
    const [decisionsTick, setDecisionsTick] = React.useState(0);
    const onPersistTracksRef = React.useRef(onPersistTracks);
    const skipExternalTracksMergeRef = React.useRef(false);
    const catalogOptionIdsRef = React.useRef<string[]>([]);
    const catalogLabelsByIdRef = React.useRef<Map<string, string>>(new Map());
    onPersistTracksRef.current = onPersistTracks;

    React.useEffect(() => {
        if (skipExternalTracksMergeRef.current) {
            skipExternalTracksMergeRef.current = false;
            return;
        }
        setTracks((prev) => {
            const merged = mergeExternalTracksPreferLocalAdvance(prev, externalTracks);
            return tracksLogicalEqual(merged, prev) ? prev : merged;
        });
    }, [externalTracksSig]);

    const domainContext = React.useMemo(
        () => resolveExecutionDomainContext(executionData ?? null, executionId),
        [executionData, executionId]
    );

    const decisions = React.useMemo(() => {
        const raw = readDecisionsForManualTrackSyncEnriched(executionId, tracks);
        return filterDecisionsForDomainContext(domainContext, raw);
    }, [executionId, decisionsTick, tracks, domainContext]);

    const catalogOptions = React.useMemo(() => {
        const all = resolveOtherPartyRequestOptionBadges({
            claimType,
            flags,
            guarantorCtx,
            decisions: [],
            activeDebtorKey,
            primaryDebtorKey,
            remainingBalanceIqd,
            executionData,
            activeDebtorIsDeceased,
            mirrorWorkflow,
            debtorAgentManualTrack,
        });
        if (!debtorAgentManualTrack) return all;
        const allowedIds = new Set(
            filterOtherPartyCatalogOptionIds(
                domainContext,
                all.map((b) => b.id)
            )
        );
        return all.filter((b) => allowedIds.has(b.id));
    }, [
        claimType,
        flags,
        guarantorCtx,
        activeDebtorKey,
        primaryDebtorKey,
        remainingBalanceIqd,
        executionData,
        activeDebtorIsDeceased,
        mirrorWorkflow,
        debtorAgentManualTrack,
        domainContext,
    ]);

    const catalogLabelsById = React.useMemo(() => {
        const map = new Map<string, string>();
        for (const badge of catalogOptions) map.set(badge.id, badge.label);
        return map;
    }, [catalogOptions]);

    const catalogOptionIds = React.useMemo(
        () => catalogOptions.map((b) => b.id),
        [catalogOptions]
    );
    catalogOptionIdsRef.current = catalogOptionIds;
    catalogLabelsByIdRef.current = catalogLabelsById;

    React.useEffect(() => {
        if (!debtorAgentManualTrack) return;

        const onDecisionChange = () => {
            setDecisionsTick((n) => n + 1);
            setTracks((prev) => {
                const nextDecisions = readDecisionsForManualTrackSyncEnriched(executionId, prev);
                const synced = syncAllManualTracksFromDecisions(
                    prev,
                    nextDecisions,
                    catalogOptionIdsRef.current,
                    catalogLabelsByIdRef.current,
                    executionId
                );
                if (tracksLogicalEqual(synced, prev)) return prev;
                skipExternalTracksMergeRef.current = true;
                onPersistTracksRef.current?.(synced);
                return synced;
            });
        };

        window.addEventListener('hami-decisions-reload', onDecisionChange);
        window.addEventListener('hami-execution-decision-outcome', onDecisionChange);
        return () => {
            window.removeEventListener('hami-decisions-reload', onDecisionChange);
            window.removeEventListener('hami-execution-decision-outcome', onDecisionChange);
        };
    }, [debtorAgentManualTrack, executionId]);

    const trackById = React.useMemo(() => trackMapByOptionId(tracks), [tracks]);

    const displayStateById = React.useMemo(() => {
        const map = new Map<string, ManualTrackDisplayState>();
        for (const badge of catalogOptions) {
            map.set(
                badge.id,
                resolveManualTrackDisplayState(
                    decisions,
                    trackById.get(badge.id),
                    badge.id,
                    executionId
                )
            );
        }
        return map;
    }, [catalogOptions, trackById, decisions]);

    const displayOptions = React.useMemo(() => {
        if (!debtorAgentManualTrack) return catalogOptions;
        return catalogOptions.map((badge) => {
            const display = displayStateById.get(badge.id)!;
            return {
                ...badge,
                outcome: display.badgeOutcome,
                statusShort: display.statusShort,
                hasRequest: display.phase !== 'idle',
            };
        });
    }, [catalogOptions, debtorAgentManualTrack, displayStateById]);

    const updateTrack = React.useCallback(
        (optionId: string, patch: Partial<OtherPartyRequestTrackEntry>) => {
            setTracks((prev) => {
                const next = patchOtherPartyRequestTrack(prev, optionId, patch);
                if (tracksLogicalEqual(next, prev)) return prev;
                skipExternalTracksMergeRef.current = true;
                onPersistTracksRef.current?.(next);
                return next;
            });
            if (
                patch.executorOutcome === 'submitted' ||
                patch.executorOutcome === 'approved' ||
                patch.executorOutcome === 'rejected' ||
                patch.executorOutcome === 'alternative'
            ) {
                setDecisionsTick((n) => n + 1);
            }
        },
        []
    );

    const clearManualTrack = React.useCallback((optionId: string) => {
        setTracks((prev) => {
            const next = removeOtherPartyRequestTrack(prev, optionId);
            if (tracksLogicalEqual(next, prev)) return prev;
            skipExternalTracksMergeRef.current = true;
            onPersistTracksRef.current?.(next);
            return next;
        });
    }, []);

    const manualTrackBlocks =
        displayOptions.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-slate-400">
                {debtorAgentManualTrack
                    ? 'لا تحركات ظاهرة للدائن في هذه المرحلة.'
                    : 'لا طلبات ظاهرة في هذه المرحلة.'}
            </p>
        ) : (
            <div className="space-y-1">
                {displayOptions.map((badge) =>
                    debtorAgentManualTrack ? (
                        <ManualRequestBlock
                            key={badge.id}
                            badge={badge}
                            track={trackById.get(badge.id)}
                            displayState={displayStateById.get(badge.id)!}
                            executionId={executionId}
                            allDecisions={decisions as Decision[]}
                            onUpdateTrack={(patch) => updateTrack(badge.id, patch)}
                            onClearManualTrack={() => clearManualTrack(badge.id)}
                            onOpenAppeals={onOpenAppeals}
                            creditorTrackHandlers={creditorTrackHandlers}
                        />
                    ) : null
                )}
            </div>
        );

    const manualLogBlock = manualLog ? (
        <ManualOtherPartyLogBlock
            entries={manualLog.entries}
            onPersist={manualLog.onPersist}
            onSubmitToDecisions={manualLog.onSubmitToDecisions}
            hideSavedEntries={debtorAgentManualTrack}
            executionId={manualLog.executionId || executionId}
            appealPerspective={manualLog.appealPerspective}
        />
    ) : null;

    if (displayOptions.length === 0 && !manualLog) {
        return (
            <p className="py-6 text-center text-[11px] text-slate-400">
                لا طلبات ظاهرة في هذه المرحلة.
            </p>
        );
    }

    const tracksSectionTitle = mirrorWorkflow
        ? 'تتبّع تحركات الدائن يدوياً'
        : 'تحركات الدائن';
    const tracksSectionSubtitle = mirrorWorkflow
        ? 'سجّل تقدّم الدائن ثم موافقة أو رفض المنفذ.'
        : undefined;

    const tracksPanel =
        debtorAgentManualTrack && displayOptions.length > 0 ? (
            <CollapsibleTracksSection
                title={tracksSectionTitle}
                subtitle={tracksSectionSubtitle}
            >
                {manualTrackBlocks}
            </CollapsibleTracksSection>
        ) : (
            manualTrackBlocks
        );

    return (
        <div className="space-y-2">
            {tracksPanel}
            {manualLogBlock}
        </div>
    );
};
