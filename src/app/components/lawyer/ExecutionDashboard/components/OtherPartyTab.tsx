import React, { Suspense, useCallback, useMemo } from 'react';
import { OtherPartyEffectiveRequestsPanel } from './OtherPartyEffectiveRequestsPanel';
import type { OtherPartyEffectiveRequestsPanelProps, CreditorTrackDecisionHandlers } from './OtherPartyEffectiveRequestsPanel';
import type { OtherPartyActionLogEntry, OtherPartyRequestTrackEntry } from '@/app/types/execution';

export interface OtherPartyTabProps {
    executionData: Record<string, any> | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    handleOtherPartyActionSubmitToDecisions: (input: { date: string; content: string }) => { ok: boolean; decisionId?: string };
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    LazyOtherPartyActionsLog: React.LazyExoticComponent<React.ComponentType<any>>;
    showCreditorRequestsMirror?: boolean;
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
    persistExecutionMerge,
    handleOtherPartyActionSubmitToDecisions,
    EXEC_OVERLAY_LAZY_FALLBACK,
    LazyOtherPartyActionsLog,
    showCreditorRequestsMirror = false,
    creditorRequestsMirror,
    onOpenAppeals,
    creditorTrackHandlers,
}) => {
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

    const manualLog = useMemo(
        () => ({
            entries: manualEntries,
            onPersist: persistManualLog,
            onSubmitToDecisions: handleOtherPartyActionSubmitToDecisions,
        }),
        [manualEntries, persistManualLog, handleOtherPartyActionSubmitToDecisions]
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
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyOtherPartyActionsLog
                    entries={manualEntries}
                    onPersist={persistManualLog}
                    onSubmitToDecisions={handleOtherPartyActionSubmitToDecisions}
                />
            </Suspense>
        </div>
    );
};
