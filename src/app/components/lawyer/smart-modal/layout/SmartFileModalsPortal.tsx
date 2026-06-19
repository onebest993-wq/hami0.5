import React, { Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { LazyLegalActionsMenu } from '../lazySmartFileModalWidgets';
import { LazyAddTaskModal } from '../lazySmartFileModalChunks';
import type { SmartFileModalsPortalProps } from './portal/smartFileModalsPortalTypes';
export type { SmartFileModalsPortalProps } from './portal/smartFileModalsPortalTypes';
import { SmartFileModalsContentSection } from './portal/SmartFileModalsContentSection';
import { SmartFileModalsFlowSection } from './portal/SmartFileModalsFlowSection';
import { SmartFileModalsJudgmentSection } from './portal/SmartFileModalsJudgmentSection';
import { SmartFileModalsAdminSection } from './portal/SmartFileModalsAdminSection';

const MODAL_LAZY_FALLBACK = null;

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
    } = props;

    return (
        <AnimatePresence>
            <Suspense fallback={null} key="actions-menu-suspense">
                <LazyLegalActionsMenu
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
                />
            </Suspense>
            <Suspense fallback={MODAL_LAZY_FALLBACK} key="modals-suspense">
                <SmartFileModalsContentSection {...props} />
                <SmartFileModalsFlowSection {...props} />
                <SmartFileModalsJudgmentSection {...props} />
                <SmartFileModalsAdminSection {...props} />
            </Suspense>
            {showTaskModal && (
                <Suspense fallback={null}>
                    <LazyAddTaskModal
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
                </Suspense>
            )}
        </AnimatePresence>
    );
}
