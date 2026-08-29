import React, { Suspense, lazy, useMemo } from 'react';
import type { SmartFileModalsPortalProps } from './portal/smartFileModalsPortalTypes';
export type { SmartFileModalsPortalProps } from './portal/smartFileModalsPortalTypes';
import { SmartFileModalsContentSection } from './portal/SmartFileModalsContentSection';
/** Judgment shell (SmartJudgmentModal) يبقى eager — keep-mounted.
 * AppealTransition / CrossAppeal lazy خلف show* مع prefetch عند فتح الإضبارة / نية الزر. */
import { SmartFileModalsJudgmentSection } from './portal/SmartFileModalsJudgmentSection';

const LazyLegalActionsMenu = lazy(() =>
    import('../parts/LegalActionsMenu').then((m) => ({ default: m.LegalActionsMenu })),
);

const LazyAddTaskModal = lazy(() =>
    import('../modals/contentEntry/AddTaskModal').then((m) => ({ default: m.AddTaskModal })),
);

const LazySmartFileModalsFlowSection = lazy(() =>
    import('./portal/SmartFileModalsFlowSection').then((m) => ({
        default: m.SmartFileModalsFlowSection,
    })),
);

const LazySmartFileModalsAdminSection = lazy(() =>
    import('./portal/SmartFileModalsAdminSection').then((m) => ({
        default: m.SmartFileModalsAdminSection,
    })),
);

function isFlowSectionNeeded(props: SmartFileModalsPortalProps): boolean {
    return Boolean(
        props.isTrashOpen ||
            props.showPauseModal ||
            props.showInterruptionModal ||
            props.showResumeInterruptionModal ||
            props.showAbandonmentRenewalModal ||
            props.showPauseResumeModal ||
            props.showInterlocutoryModal ||
            props.showObjectionRegistrationModal ||
            props.showAbsentJudgmentNotificationModal ||
            props.showOpponentAbsentObjectionModal,
    );
}

function isAdminSectionNeeded(props: SmartFileModalsPortalProps): boolean {
    return Boolean(
        props.showExtraordinaryAppealModal ||
            props.showMaterialErrorModal ||
            props.showJudgeRecusalModal ||
            props.showTransferJurisdictionModal ||
            props.showCaseConsolidationModal ||
            props.showCaseLinkModal ||
            props.showCorrespondenceModal ||
            props.appealOutcomeTask,
    );
}

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

    const needFlow = useMemo(
        () => isFlowSectionNeeded(props),
        [
            props.isTrashOpen,
            props.showPauseModal,
            props.showInterruptionModal,
            props.showResumeInterruptionModal,
            props.showAbandonmentRenewalModal,
            props.showPauseResumeModal,
            props.showInterlocutoryModal,
            props.showObjectionRegistrationModal,
            props.showAbsentJudgmentNotificationModal,
            props.showOpponentAbsentObjectionModal,
        ],
    );

    const needAdmin = useMemo(
        () => isAdminSectionNeeded(props),
        [
            props.showExtraordinaryAppealModal,
            props.showMaterialErrorModal,
            props.showJudgeRecusalModal,
            props.showTransferJurisdictionModal,
            props.showCaseConsolidationModal,
            props.showCaseLinkModal,
            props.showCorrespondenceModal,
            props.appealOutcomeTask,
        ],
    );

    return (
        <>
            {isActionsMenuOpen ? (
                <Suspense fallback={null}>
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
                    stages={stages}
                    viewingStageIndex={viewingStageIndex}
                    />
                </Suspense>
            ) : null}
            <SmartFileModalsContentSection {...props} />
            {needFlow ? (
                <Suspense fallback={null}>
                    <LazySmartFileModalsFlowSection {...props} />
                </Suspense>
            ) : null}
            <SmartFileModalsJudgmentSection {...props} />
            {needAdmin ? (
                <Suspense fallback={null}>
                    <LazySmartFileModalsAdminSection {...props} />
                </Suspense>
            ) : null}
            {showTaskModal ? (
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
            ) : null}
        </>
    );
}
