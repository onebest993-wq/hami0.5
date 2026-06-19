import type { SmartFileModalsPortalProps } from '../layout/SmartFileModalsPortal';

export type SmartFileModalHandlerSources = {
    handleUpdateCaseInfo: (...args: unknown[]) => void;
    handleAddTask: (...args: unknown[]) => void;
    handleAddDoc: (...args: unknown[]) => void;
    handleAddNote: (...args: unknown[]) => void;
    handleAddPayment: (...args: unknown[]) => void;
    handleAddIncidentalCase: (...args: unknown[]) => void;
    handleSpawnLinkedIncidentalCase: (...args: unknown[]) => void;
    handleSaveFastTrack: (...args: unknown[]) => void;
    handleSaveAttachment: (...args: unknown[]) => void;
    handleAddAction: (...args: unknown[]) => void;
    handleAddAppointment: (...args: unknown[]) => void;
    handlePauseConfirm: (...args: unknown[]) => void;
    handleInterruptionConfirm: (...args: unknown[]) => void;
    handleResumeInterruptionConfirm: (...args: unknown[]) => void;
    handleInterlocutoryAppealConfirm: (...args: unknown[]) => void;
    handleRegisterObjection: (...args: unknown[]) => void;
    handleObjectionJudgment: (...args: unknown[]) => void;
    handleAbsentJudgmentNotification: (...args: unknown[]) => void;
    handleOpponentAbsentObjection: (...args: unknown[]) => void;
    handleRestoreEvent: (...args: unknown[]) => void;
    handleHardDeleteEvent: (...args: unknown[]) => void;
    handleEmptyTrash: (...args: unknown[]) => void;
    handleJudgmentConfirm: (...args: unknown[]) => void;
    handleAppealRegistration: (...args: unknown[]) => void;
    handleAppealTransition: (...args: unknown[]) => void;
    handleCrossAppeal: (...args: unknown[]) => void;
    handleProvisionalOrderConfirm: (...args: unknown[]) => void;
    handleSaveNotification: (...args: unknown[]) => void;
    handleExtraordinaryAppeal: (...args: unknown[]) => void;
    handleMaterialErrorCorrection: (...args: unknown[]) => void;
    handleJudgeRecusal: (...args: unknown[]) => void;
    handleTransferJurisdiction: (...args: unknown[]) => void;
    handleCaseConsolidation: (...args: unknown[]) => void;
    handleCaseLinkExternal: (...args: unknown[]) => void;
    handleCorrespondence: (...args: unknown[]) => void;
    handleQuickAction: (...args: unknown[]) => void;
    handleAbandonment: (...args: unknown[]) => void;
    handleInterruptionToggle: (...args: unknown[]) => void;
    handleResume: (...args: unknown[]) => void;
    handleAppealBriefOutcome: (...args: unknown[]) => void;
};

/** Maps orchestrator action hooks → SmartFileModalsPortal handlers bag. */
export function buildSmartFileModalHandlers(
    src: SmartFileModalHandlerSources,
): SmartFileModalsPortalProps['handlers'] {
    return {
        handleUpdateCaseInfo: src.handleUpdateCaseInfo,
        handleAddTask: src.handleAddTask,
        handleAddDoc: src.handleAddDoc,
        handleAddNote: src.handleAddNote,
        handleAddPayment: src.handleAddPayment,
        handleAddIncidentalCase: src.handleAddIncidentalCase,
        handleSpawnLinkedIncidentalCase: src.handleSpawnLinkedIncidentalCase,
        handleSaveFastTrack: src.handleSaveFastTrack,
        handleSaveAttachment: src.handleSaveAttachment,
        handleAddAction: src.handleAddAction,
        handleAddAppointment: src.handleAddAppointment,
        handlePauseConfirm: src.handlePauseConfirm,
        handleInterruptionConfirm: src.handleInterruptionConfirm,
        handleResumeInterruptionConfirm: src.handleResumeInterruptionConfirm,
        handleInterlocutoryAppealConfirm: src.handleInterlocutoryAppealConfirm,
        handleRegisterObjection: src.handleRegisterObjection,
        handleObjectionJudgment: src.handleObjectionJudgment,
        handleAbsentJudgmentNotification: src.handleAbsentJudgmentNotification,
        handleOpponentAbsentObjection: src.handleOpponentAbsentObjection,
        handleRestoreEvent: src.handleRestoreEvent,
        handleHardDeleteEvent: src.handleHardDeleteEvent,
        handleEmptyTrash: src.handleEmptyTrash,
        handleJudgmentConfirm: src.handleJudgmentConfirm,
        handleAppealRegistration: src.handleAppealRegistration,
        handleAppealTransition: src.handleAppealTransition,
        handleCrossAppeal: src.handleCrossAppeal,
        handleProvisionalOrderConfirm: src.handleProvisionalOrderConfirm,
        handleSaveNotification: src.handleSaveNotification,
        handleExtraordinaryAppeal: src.handleExtraordinaryAppeal,
        handleMaterialErrorCorrection: src.handleMaterialErrorCorrection,
        handleJudgeRecusal: src.handleJudgeRecusal,
        handleTransferJurisdiction: src.handleTransferJurisdiction,
        handleCaseConsolidation: src.handleCaseConsolidation,
        handleCaseLinkExternal: src.handleCaseLinkExternal,
        handleCorrespondence: src.handleCorrespondence,
        handleQuickAction: src.handleQuickAction,
        handleAbandonment: src.handleAbandonment,
        handleInterruptionToggle: src.handleInterruptionToggle,
        handleResume: src.handleResume,
        handleAppealBriefOutcome: src.handleAppealBriefOutcome,
    };
}
