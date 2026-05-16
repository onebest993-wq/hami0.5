import React, { Suspense } from 'react';

export interface OtherPartyTabProps {
    executionData: Record<string, any> | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    handleOtherPartyActionSubmitToDecisions: (input: { date: string; content: string }) => { ok: boolean; decisionId?: string };
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    LazyOtherPartyActionsLog: React.LazyExoticComponent<React.ComponentType<any>>;
}

export const OtherPartyTab: React.FC<OtherPartyTabProps> = ({
    executionData,
    persistExecutionMerge,
    handleOtherPartyActionSubmitToDecisions,
    EXEC_OVERLAY_LAZY_FALLBACK,
    LazyOtherPartyActionsLog,
}) => (
    <div className="p-4" onClick={(e) => e.stopPropagation()}>
        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyOtherPartyActionsLog
                entries={executionData?.other_party_actions_log ?? []}
                onPersist={(next: any) =>
                    persistExecutionMerge({ other_party_actions_log: next })
                }
                onSubmitToDecisions={handleOtherPartyActionSubmitToDecisions}
            />
        </Suspense>
    </div>
);
