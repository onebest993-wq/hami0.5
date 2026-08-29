import React, { useCallback, useMemo } from 'react';
import { OtherPartyEffectiveRequestsPanel } from './OtherPartyEffectiveRequestsPanel';
import type { OtherPartyEffectiveRequestsPanelProps, CreditorTrackDecisionHandlers } from './OtherPartyEffectiveRequestsPanel';
import type {
    ExecutionFile,
    OtherPartyActionLogEntry,
    OtherPartyRequestTrackEntry,
    TimelineEvent,
} from '@/app/types/execution';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import { isExecutionHandlerStubLeaf } from '../hooks/executionHandlerClusterStubs';
import { submitOtherPartyFollowupAction } from '@/app/application/execution/followup/submitOtherPartyFollowupAction';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';

type OtherPartyActionsLogProps = {
    entries: OtherPartyActionLogEntry[];
    onPersist: (next: OtherPartyActionLogEntry[]) => void;
    onSubmitToDecisions: (input: {
        date: string;
        content: string;
    }) => { ok: boolean; decisionId?: string; logEntryId?: string } | undefined | null;
    executionId?: string;
    appealPerspective?: AppealUiPerspective;
};

export interface OtherPartyTabProps {
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId?: string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    handleOtherPartyActionSubmitToDecisions: (input: { date: string; content: string }) => {
        ok: boolean;
        decisionId?: string;
        logEntryId?: string;
    };
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    LazyOtherPartyActionsLog: React.LazyExoticComponent<React.ComponentType<OtherPartyActionsLogProps>>;
    appealPerspective?: AppealUiPerspective;
    showCreditorRequestsMirror?: boolean;
    isRepresentingDebtor?: boolean;
    showToast?: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    pushTimelineEvent?: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => void;
    nextTimelineId?: () => string;
    creditorRequestsMirror?: Omit<
        OtherPartyEffectiveRequestsPanelProps,
        'manualLog' | 'onPersistTracks' | 'debtorAgentManualTrack' | 'creditorTrackHandlers'
    >;
    onOpenAppeals?: (decisionId?: string) => void;
    creditorTrackHandlers?: CreditorTrackDecisionHandlers;
}

const EMPTY_OTHER_PARTY_LOG: OtherPartyActionLogEntry[] = [];

export const OtherPartyTab: React.FC<OtherPartyTabProps> = ({
    executionData,
    decisionsStorageExecutionId,
    persistExecutionMerge,
    handleOtherPartyActionSubmitToDecisions,
    EXEC_OVERLAY_LAZY_FALLBACK: _EXEC_OVERLAY_LAZY_FALLBACK,
    LazyOtherPartyActionsLog,
    showCreditorRequestsMirror = false,
    isRepresentingDebtor = false,
    showToast,
    pushTimelineEvent,
    nextTimelineId,
    creditorRequestsMirror,
    onOpenAppeals,
    creditorTrackHandlers,
    appealPerspective = 'creditor_agent',
}) => {
    const decisionsExecutionId = String(
        decisionsStorageExecutionId || executionData?.id || ''
    ).trim();
    const manualEntries = (executionData?.other_party_actions_log ??
        EMPTY_OTHER_PARTY_LOG) as OtherPartyActionLogEntry[];

    const persistTracks = useCallback(
        (next: OtherPartyRequestTrackEntry[]) => {
            persistExecutionMerge({ other_party_request_tracks: next });
        },
        [persistExecutionMerge]
    );

    const persistManualLog = useCallback(
        (next: OtherPartyActionLogEntry[]) => {
            persistExecutionMerge({ other_party_actions_log: next });
        },
        [persistExecutionMerge]
    );

    const submitOtherPartyAction = useCallback(
        (input: { date: string; content: string }) => {
            const clusterHandler = handleOtherPartyActionSubmitToDecisions;
            if (typeof clusterHandler === 'function' && !isExecutionHandlerStubLeaf(clusterHandler)) {
                const clusterResult = clusterHandler(input);
                if (clusterResult && typeof clusterResult === 'object' && clusterResult.ok) {
                    return clusterResult;
                }
            }

            const d = String(input.date || '').trim();
            const content = String(input.content || '').trim();
            const directResult = submitOtherPartyFollowupAction({
                date: d,
                content,
                decisionsStorageExecutionId: decisionsExecutionId || undefined,
                existingLog: manualEntries,
                executionData: executionData as Record<string, unknown> | null | undefined,
                persistExecutionMerge,
                isRepresentingDebtor,
                showToast,
            });

            if (
                directResult.ok &&
                typeof pushTimelineEvent === 'function' &&
                typeof nextTimelineId === 'function'
            ) {
                const now = new Date().toISOString();
                if (isRepresentingDebtor) {
                    pushTimelineEvent({
                        id: nextTimelineId(),
                        date: d,
                        timestamp: now,
                        title: 'تحرك الطرف الآخر',
                        description: content,
                        type: 'other_party',
                        source: 'تحركات الطرف الآخر',
                    });
                } else if (directResult.decisionId) {
                    pushTimelineEvent({
                        id: nextTimelineId(),
                        date: d,
                        timestamp: now,
                        title: 'تحرك الطرف الآخر — قيد البت',
                        description: `بتاريخ ${d}:\n\n${content}`,
                        type: 'decision',
                        source: 'محضر المتابعة',
                        metadata: {
                            timelineThreadKey: `executor_decision:${directResult.decisionId}`,
                            decisionRowId: directResult.decisionId,
                        },
                    });
                }
            }

            return directResult;
        },
        [
            decisionsExecutionId,
            executionData,
            handleOtherPartyActionSubmitToDecisions,
            isRepresentingDebtor,
            manualEntries,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
            showToast,
        ],
    );

    const manualLog = useMemo(
        () => ({
            entries: manualEntries,
            onPersist: persistManualLog,
            onSubmitToDecisions: submitOtherPartyAction,
            executionId: decisionsExecutionId,
            appealPerspective,
        }),
        [
            appealPerspective,
            decisionsExecutionId,
            manualEntries,
            persistManualLog,
            submitOtherPartyAction,
        ]
    );

    if (showCreditorRequestsMirror && creditorRequestsMirror) {
        return (
            <div className="p-2 md:p-3" onClick={(e) => e.stopPropagation()}>
                <OtherPartyEffectiveRequestsPanel
                    {...creditorRequestsMirror}
                    debtorAgentManualTrack
                    onOpenAppeals={onOpenAppeals}
                    creditorTrackHandlers={creditorTrackHandlers}
                    onPersistTracks={persistTracks}
                    manualLog={manualLog}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4" onClick={(e) => e.stopPropagation()}>
            <PreloadableOverlayGate
                lazy={LazyOtherPartyActionsLog}
                lazyProps={{
                    entries: manualEntries,
                    onPersist: persistManualLog,
                    onSubmitToDecisions: submitOtherPartyAction,
                    executionId: decisionsExecutionId,
                    appealPerspective,
                }}
                fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
            />
        </div>
    );
};
