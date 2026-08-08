import React from 'react';
import type { CaseStage, TimelineEvent } from '@/app/components/lawyer/LawyerShared';
import type { CaseFlowActionsPanelProps } from '@/app/components/lawyer/smart-modal/parts/CaseFlowActionsPanel';
import type { SmartFileMainPanelProps } from '@/app/components/lawyer/smart-modal/layout/mainPanel/smartFileMainPanelTypes';
import { SessionAndRequestsHub } from '@/app/components/lawyer/smart-modal/parts/SessionAndRequestsHub';
import { ToDoList } from '@/app/components/lawyer/smart-modal/parts/ToDoList';
import { TimelineFeed } from '@/app/components/lawyer/smart-modal/parts/TimelineFeed';
import type { PersonalApplicableLaw } from './personalStatusValidation';
import { buildPersonalStatusSessionHubProps } from './buildPersonalStatusDossierProps';
import { PersonalStatusWorkToolbar } from './PersonalStatusWorkToolbar';
import { PersonalStatusRequestsSection } from './PersonalStatusRequestsSection';
import { PersonalStatusArabesqueLayers } from './PersonalStatusMoroccanGlass';
import { PS_PANEL, PS_SECTION_LABEL } from './personalStatusPearlTheme';

type PersonalStatusDossierPanelProps = {
    p: SmartFileMainPanelProps;
    displayTimeline: TimelineEvent[];
    isViewingArchived: boolean;
    displayStage?: CaseStage | null;
    quickActionsVariant: 'full' | 'notes-only';
    showWorkToolbar: boolean;
    onOpenLegalActions: () => void;
    applicableLaw?: PersonalApplicableLaw | '' | undefined;
    caseFlow: {
        onInterrupt: () => void;
        onPause: () => void;
        onResume: () => void;
        onAbandon: () => void;
        flowStage?: CaseFlowActionsPanelProps['flowStage'];
        isPaused: boolean;
        isInterrupted: boolean;
    };
};

export function PersonalStatusDossierPanel({
    p,
    displayTimeline,
    isViewingArchived,
    displayStage,
    quickActionsVariant,
    showWorkToolbar,
    onOpenLegalActions,
    applicableLaw,
    caseFlow,
}: PersonalStatusDossierPanelProps) {
    const sessionHubProps = buildPersonalStatusSessionHubProps(p, isViewingArchived);
    const requestCount =
        (displayStage?.fastTrackPetitions?.length ?? 0) + (displayStage?.attachments?.length ?? 0);
    const taskCount = displayStage?.tasks?.length ?? 0;

    const dockCaseFlow = {
        onInterrupt: caseFlow.onInterrupt,
        onPause: caseFlow.onPause,
        onResume: caseFlow.onResume,
        onAbandon: caseFlow.onAbandon,
        flowStage: displayStage ?? undefined,
        isPaused: caseFlow.isPaused,
        isInterrupted: caseFlow.isInterrupted,
    };

    const openRequestModal = () => {
        p.setEditingFastTrack(null);
        p.setShowFastTrackModal(true);
    };

    return (
        <section className={`${PS_PANEL} mb-2 max-w-3xl overflow-hidden print:block`} dir="rtl">
            <PersonalStatusArabesqueLayers primary={0.045} fine={0.022} />

            {showWorkToolbar ? (
                <div className="relative z-[1] border-b border-white/[0.08]">
                    <PersonalStatusWorkToolbar
                        variant={quickActionsVariant}
                        onAction={p.handleQuickAction}
                        onOpenLegalActions={onOpenLegalActions}
                        onOpenTasks={() => p.setShowTaskModal(true)}
                        taskCount={taskCount}
                        applicableLaw={applicableLaw}
                        showLawReference={!isViewingArchived}
                        caseFlow={dockCaseFlow}
                        sessionSlot={
                            <SessionAndRequestsHub
                                {...sessionHubProps}
                                compose="session-only"
                                heroSessionTrigger
                            />
                        }
                    />
                </div>
            ) : null}

            {showWorkToolbar && taskCount > 0 ? (
                <div className="relative z-[1] border-b border-white/[0.06] px-2 py-1.5 max-h-[min(24vh,180px)] overflow-y-auto scrollbar-hide">
                    <ToDoList
                        tasks={displayStage?.tasks || []}
                        visualVariant="personal-pearl"
                        onAddTask={() => p.setShowTaskModal(true)}
                        onToggleTask={p.handleToggleTask}
                        onAppealBriefFile={p.handleAppealBriefFile}
                        onAppealBriefOutcome={p.handleAppealBriefOutcome}
                        onCorrespondenceResponse={p.handleCorrespondenceResponse}
                        onEditTask={(task) => p.setEditingTask(task)}
                    />
                </div>
            ) : null}

            {showWorkToolbar ? (
                <PersonalStatusRequestsSection
                    petitions={sessionHubProps.petitions}
                    attachments={sessionHubProps.attachments}
                    onAddFastTrack={sessionHubProps.onAddFastTrack}
                    onEditPetition={sessionHubProps.onEditPetition}
                    onEditAttachment={sessionHubProps.onEditAttachment}
                    onResolvePetition={sessionHubProps.onResolvePetition}
                    readOnly={sessionHubProps.readOnly}
                    requestCount={requestCount}
                    onAddRequest={openRequestModal}
                />
            ) : null}

            <div className="relative z-[1] px-2 pt-1.5 pb-0 border-b border-white/[0.06]">
                <span className={PS_SECTION_LABEL}>سجل</span>
            </div>
            <div className="relative z-[1] p-1.5 pt-1">
                <TimelineFeed
                    events={displayTimeline}
                    visualVariant="personal-pearl"
                    onDelete={!isViewingArchived ? p.handleDeleteEvent : undefined}
                />
            </div>
        </section>
    );
}
