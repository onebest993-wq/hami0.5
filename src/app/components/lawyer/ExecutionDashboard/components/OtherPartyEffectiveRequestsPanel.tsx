import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';
import { LazyManualOtherPartyLogBlock } from '../otherPartyManualLogBlockLazy';
import {
    resolveOtherPartyRequestOptionBadges,
} from '@/app/utils/otherPartyEffectiveRequestsUtils';
import type { CreditorMirrorWorkflowContext } from '@/app/utils/creditorOtherPartyMirrorVisibility';
import type { HiddenFollowupVisibilityInput, HiddenGuarantorContext } from './hiddenFollowupRequestsUtils';
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
import {
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
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import {
    ManualRequestBlock,
    type CreditorTrackDecisionHandlers,
} from './OtherPartyManualRequestBlock';

export type { CreditorTrackDecisionHandlers };

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
        <PreloadableOverlayGate
            lazy={LazyManualOtherPartyLogBlock}
            lazyProps={{
                entries: manualLog.entries,
                onPersist: manualLog.onPersist,
                onSubmitToDecisions: manualLog.onSubmitToDecisions,
                hideSavedEntries: debtorAgentManualTrack,
                executionId: manualLog.executionId || executionId,
                appealPerspective: manualLog.appealPerspective,
            }}
            fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
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
