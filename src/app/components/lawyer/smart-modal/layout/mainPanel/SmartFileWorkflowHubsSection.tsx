import React, { Suspense, lazy } from 'react';
import type { SmartFileMainPanelProps } from './smartFileMainPanelTypes';
import { storedFastTrackStatus } from '../../smartFile/fastTrackStatus';
import { buildSessionRecordPayload, isSessionHubFocusEvent } from '../../smartFile/sessionRecordEngine';
import { prefetchLegalActionsModalChunks } from '../../prefetchLegalActionsModalChunks';
import {
    LazyCivilLawReferenceHub,
    LazyQuickActions,
    LazySessionAndRequestsHub,
} from '../../smartFileMainPanelLazyHubs';

const LazyToDoList = lazy(() =>
    import('../../parts/ToDoList').then((m) => ({ default: m.ToDoList })),
);

export type SmartFileWorkflowHubsSectionProps = {
    showWorkflowSections: boolean;
    showWorkflowPanels: boolean;
    showSessionHubInStageTools: boolean;
    viewOnlySessionHubVisible: boolean;
    isCaseLinkViewOnly: boolean;
    viewOnlyQuickActionIds: string[] | undefined;
    quickActionsVariant: React.ComponentProps<typeof LazyQuickActions>['variant'];
    displayStage: SmartFileMainPanelProps['displayStage'];
    displayTimeline: SmartFileMainPanelProps['displayTimeline'];
    firstHearingDate?: string | null;
    editingEvent: SmartFileMainPanelProps['editingEvent'];
    setEditingEvent: SmartFileMainPanelProps['setEditingEvent'];
    handleQuickAction: SmartFileMainPanelProps['handleQuickAction'];
    setIsActionsMenuOpen: SmartFileMainPanelProps['setIsActionsMenuOpen'];
    handleAddAction: SmartFileMainPanelProps['handleAddAction'];
    setEditingFastTrack: SmartFileMainPanelProps['setEditingFastTrack'];
    setShowFastTrackModal: SmartFileMainPanelProps['setShowFastTrackModal'];
    setEditingAttachment: SmartFileMainPanelProps['setEditingAttachment'];
    setShowAttachmentModal: SmartFileMainPanelProps['setShowAttachmentModal'];
    handleSaveFastTrack: SmartFileMainPanelProps['handleSaveFastTrack'];
    setShowTaskModal: SmartFileMainPanelProps['setShowTaskModal'];
    handleToggleTask: SmartFileMainPanelProps['handleToggleTask'];
    handleAppealBriefFile: SmartFileMainPanelProps['handleAppealBriefFile'];
    handleAppealBriefOutcome: SmartFileMainPanelProps['handleAppealBriefOutcome'];
    handleCorrespondenceResponse: SmartFileMainPanelProps['handleCorrespondenceResponse'];
    setEditingTask: SmartFileMainPanelProps['setEditingTask'];
};

export function SmartFileWorkflowHubsSection({
    showWorkflowSections,
    showWorkflowPanels,
    showSessionHubInStageTools,
    viewOnlySessionHubVisible,
    isCaseLinkViewOnly,
    viewOnlyQuickActionIds,
    quickActionsVariant,
    displayStage,
    displayTimeline,
    firstHearingDate = null,
    editingEvent,
    setEditingEvent,
    handleQuickAction,
    setIsActionsMenuOpen,
    handleAddAction,
    setEditingFastTrack,
    setShowFastTrackModal,
    setEditingAttachment,
    setShowAttachmentModal,
    handleSaveFastTrack,
    setShowTaskModal,
    handleToggleTask,
    handleAppealBriefFile,
    handleAppealBriefOutcome,
    handleCorrespondenceResponse,
    setEditingTask,
}: SmartFileWorkflowHubsSectionProps) {
    return (
        <>
            {/* 4. Quick Actions — lazy secondary hub */}
            {showWorkflowSections && (
                <div className="print:hidden">
                    <Suspense fallback={null}>
                        <LazyQuickActions
                            variant={quickActionsVariant}
                            viewOnlyActionIds={viewOnlyQuickActionIds}
                            onAction={handleQuickAction}
                            onOpenLegalActions={() => {
                                prefetchLegalActionsModalChunks();
                                setIsActionsMenuOpen(true);
                            }}
                        />
                    </Suspense>
                </div>
            )}

            {/* أدوات المرحلة — مرجع قانوني + محضر في صف واحد */}
            {showWorkflowSections && !isCaseLinkViewOnly && (
                <div
                    className={`${showSessionHubInStageTools ? 'grid grid-cols-2' : ''} gap-2 mb-2 print:hidden`}
                >
                    <Suspense fallback={null}>
                        <LazyCivilLawReferenceHub compact />
                    </Suspense>
                    {showSessionHubInStageTools ? (
                        <Suspense fallback={null}>
                            <LazySessionAndRequestsHub
                                compose="session-only"
                                compactSessionTrigger
                                readOnly={isCaseLinkViewOnly}
                                visualVariant="civil"
                                timeline={displayTimeline}
                                firstHearingDate={firstHearingDate}
                                editingSessionRecord={
                                    editingEvent && isSessionHubFocusEvent(editingEvent)
                                        ? editingEvent
                                        : null
                                }
                                onCancelEditSessionRecord={() => setEditingEvent(null)}
                                onEditSessionRecord={(event) => setEditingEvent(event)}
                                onSubmitSessionRecord={(data) => {
                                    handleAddAction(buildSessionRecordPayload(data, data.id));
                                }}
                            />
                        </Suspense>
                    ) : null}
                </div>
            )}

            {/* الطلبات — لوحة مضغوطة قابلة للطي */}
            {showWorkflowPanels && viewOnlySessionHubVisible && isCaseLinkViewOnly && (
                <Suspense fallback={null}>
                    <LazySessionAndRequestsHub
                        compose="session-only"
                        compactSessionTrigger
                        readOnly
                        visualVariant="civil"
                        timeline={displayTimeline}
                        firstHearingDate={firstHearingDate}
                        editingSessionRecord={
                            editingEvent && isSessionHubFocusEvent(editingEvent)
                                ? editingEvent
                                : null
                        }
                        onCancelEditSessionRecord={() => setEditingEvent(null)}
                        onEditSessionRecord={(event) => setEditingEvent(event)}
                    />
                </Suspense>
            )}

            {showWorkflowPanels && viewOnlySessionHubVisible && (
                <Suspense fallback={null}>
                    <LazySessionAndRequestsHub
                        compose="requests-only"
                        readOnly={isCaseLinkViewOnly}
                        visualVariant="civil"
                        timeline={displayTimeline}
                        onAddFastTrack={(preset) => {
                            setEditingFastTrack(
                                preset?.requestType
                                    ? { type: preset.requestType, requestType: preset.requestType }
                                    : null,
                            );
                            setShowFastTrackModal(true);
                        }}
                        petitions={displayStage?.fastTrackPetitions ?? []}
                        attachments={displayStage?.attachments ?? []}
                        onEditPetition={(petition) => {
                            setEditingFastTrack(petition as unknown as Record<string, unknown>);
                            setShowFastTrackModal(true);
                        }}
                        onEditAttachment={(attachment) => {
                            setEditingAttachment(attachment as unknown as Record<string, unknown>);
                            setShowAttachmentModal(true);
                        }}
                        onResolvePetition={(petition, outcome) => {
                            handleSaveFastTrack({
                                id: petition.id,
                                type: petition.requestType || petition.type || '',
                                requestType: petition.requestType || petition.type || '',
                                reason: petition.subject || petition.reason || '',
                                subject: petition.subject || petition.reason || '',
                                requestDate: petition.submissionDate || petition.requestDate || '',
                                submissionDate: petition.submissionDate || petition.requestDate || '',
                                status: storedFastTrackStatus(outcome),
                                notes: '',
                            });
                        }}
                    />
                </Suspense>
            )}

            {showWorkflowPanels
                && (!isCaseLinkViewOnly || (displayStage?.tasks?.length ?? 0) > 0) && (
                <div className="mt-2">
                <Suspense fallback={null}>
                <LazyToDoList
                    tasks={displayStage?.tasks || []} 
                    visualVariant="civil"
                    readOnly={isCaseLinkViewOnly}
                    onAddTask={() => setShowTaskModal(true)}
                    onToggleTask={handleToggleTask}
                    onAppealBriefFile={handleAppealBriefFile}
                    onAppealBriefOutcome={handleAppealBriefOutcome}
                    onCorrespondenceResponse={handleCorrespondenceResponse}
                    onEditTask={(task) => setEditingTask(task)}
                />
                </Suspense>
                </div>
            )}
        </>
    );
}
