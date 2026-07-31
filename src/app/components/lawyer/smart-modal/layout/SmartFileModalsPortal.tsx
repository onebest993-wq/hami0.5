import React from 'react';
import { AddTaskModal } from '../modals/contentEntryModals';
import type { SmartFileModalsPortalProps } from './portal/smartFileModalsPortalTypes';
export type { SmartFileModalsPortalProps } from './portal/smartFileModalsPortalTypes';
import { SmartFileModalsContentSection } from './portal/SmartFileModalsContentSection';
import { SmartFileModalsFlowSection } from './portal/SmartFileModalsFlowSection';
import { SmartFileModalsJudgmentSection } from './portal/SmartFileModalsJudgmentSection';
import { SmartFileModalsAdminSection } from './portal/SmartFileModalsAdminSection';
import { LegalActionsMenu } from '../parts/LegalActionsMenu';

export function SmartFileModalsPortal(props: SmartFileModalsPortalProps) {
    const {
        isViewingArchived,
        isActionsMenuOpen,
        setIsActionsMenuOpen,
        showTaskModal,
        setShowTaskModal,
        editingTask,
        setEditingTask,
        displayStage,
        parentData,
        handlers: h,
        setShowNotificationModal,
        setShowExtraordinaryAppealModal,
        setShowTransferJurisdictionModal,
        setShowCaseConsolidationModal,
        setShowCaseLinkModal,
        setShowCorrespondenceModal,
        stages,
        viewingStageIndex,
    } = props;

    return (
        <>
            {isActionsMenuOpen ? (
                <LegalActionsMenu
                    isOpen={isActionsMenuOpen}
                    onClose={() => setIsActionsMenuOpen(false)}
                    onNotification={!isViewingArchived ? () => setShowNotificationModal(true) : undefined}
                    onAction={h.handleQuickAction}
                    currentStageName={displayStage?.stageName}
                    displayStage={displayStage}
                    parentData={parentData}
                    setShowExtraordinaryAppealModal={
                        !isViewingArchived ? setShowExtraordinaryAppealModal : undefined
                    }
                    setShowTransferJurisdictionModal={
                        !isViewingArchived ? setShowTransferJurisdictionModal : undefined
                    }
                    setShowCaseConsolidationModal={
                        !isViewingArchived ? setShowCaseConsolidationModal : undefined
                    }
                    setShowCaseLinkModal={!isViewingArchived ? setShowCaseLinkModal : undefined}
                    setShowCorrespondenceModal={
                        !isViewingArchived ? setShowCorrespondenceModal : undefined
                    }
                    stages={stages}
                    viewingStageIndex={viewingStageIndex}
                />
            ) : null}
            <SmartFileModalsContentSection {...props} />
            <SmartFileModalsFlowSection {...props} />
            <SmartFileModalsJudgmentSection {...props} />
            <SmartFileModalsAdminSection {...props} />
            {showTaskModal ? (
                <AddTaskModal
                    key="add-task"
                    isOpen={showTaskModal}
                    onClose={() => {
                        setShowTaskModal(false);
                        setEditingTask(null);
                    }}
                    onAdd={h.handleAddTask}
                    editMode={!!editingTask}
                    editData={editingTask}
                />
            ) : null}
        </>
    );
}
