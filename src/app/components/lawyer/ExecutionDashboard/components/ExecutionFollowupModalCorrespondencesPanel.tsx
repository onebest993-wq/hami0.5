import React from 'react';
import { FollowupTabKeepAlivePanel } from './FollowupTabKeepAlivePanel';
import type { ExecutionFollowupModalPortalController } from '../hooks/useExecutionFollowupModalPortalController';

export function ExecutionFollowupModalCorrespondencesPanel({
    c,
}: {
    c: ExecutionFollowupModalPortalController;
}) {
    const {
        TabCommunications,
        activeFollowupDebtorKey,
        activePanelKey,
        decisionsStorageExecutionId,
        executionDataRef,
        executionId,
        inlineActionGateKey,
        mergeSimilarRecentTimelineEvent,
        nextTimelineId,
        panelsToRender,
        persistExecutionMerge,
        queueMicrotask,
        setEncroachmentCaseExpenses,
        setInlineActionGateKey,
        setTimelineEvents,
        showToast,
        spec,
        viewExecutionData,
    } = c;

    if (!panelsToRender.has('correspondences')) return null;

    return (
        <FollowupTabKeepAlivePanel
            key={`correspondences:${String(activeFollowupDebtorKey ?? '')}`}
            panelId="correspondences"
            active={activePanelKey === 'correspondences'}
            className="space-y-3"
        >
            <TabCommunications
                decisionsStorageExecutionId={decisionsStorageExecutionId}
                executionData={viewExecutionData as Record<string, unknown>}
                showToast={showToast}
                showSoftFieldProcedures={spec.showCorrespondencesSoftProcedures}
                showEncroachmentSurveyor={spec.showEncroachmentRemovalRequestCards}
                showSpecificDeliverySurveyor={spec.showSpecificDeliverySurveyorCard}
                inlineActionGateKey={inlineActionGateKey}
                setInlineActionGateKey={setInlineActionGateKey}
                onEncroachmentExpenseRecorded={(row) => {
                    setEncroachmentCaseExpenses((prev) => [...prev, row]);
                }}
                pushTimelineEvent={(event) => {
                    setTimelineEvents((prev) => {
                        const next = mergeSimilarRecentTimelineEvent(prev, event);
                        queueMicrotask(() => {
                            persistExecutionMerge({ timelineEvents: next });
                            const execId = String(
                                executionDataRef.current?.id ?? executionId ?? ''
                            );
                            if (!execId || execId === 'undefined') return;
                            const findEvent = next.find((e) => e.id === event.id) ?? next[0];
                            if (!findEvent) return;
                            void import('@/app/services/timelineEventsSupabase').then(
                                ({ insertTimelineEventToSupabase }) =>
                                    insertTimelineEventToSupabase({
                                        executionFileId: execId,
                                        event: findEvent,
                                    })
                            );
                        });
                        return next;
                    });
                }}
                nextTimelineId={nextTimelineId}
            />
        </FollowupTabKeepAlivePanel>
    );
}
