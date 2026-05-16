/** Lazy chunks for SmartFileModal — loaded on first open, not on initial case modal paint */
import { lazy } from 'react';

export const LazyEditCaseInfoModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.EditCaseInfoModal }))
);
export const LazyAddTaskModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.AddTaskModal }))
);
export const LazyAddDocumentModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.AddDocumentModal }))
);
export const LazyAddNoteModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.AddNoteModal }))
);
export const LazyAddPaymentModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.AddPaymentModal }))
);
export const LazyAddIncidentalCaseModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.AddIncidentalCaseModal }))
);
export const LazyAddAppointmentModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.AddAppointmentModal }))
);
export const LazyPauseCaseModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.PauseCaseModal }))
);
export const LazyInterruptionModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.InterruptionModal }))
);
export const LazyResumeInterruptionModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.ResumeInterruptionModal }))
);
export const LazyTrashModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.TrashModal }))
);
export const LazyInterlocutoryAppealModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.InterlocutoryAppealModal }))
);
export const LazyAppealRegistrationModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.AppealRegistrationModal }))
);
export const LazyAddProvisionalOrderModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.AddProvisionalOrderModal }))
);
export const LazyJudicialNotificationModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.JudicialNotificationModal }))
);
export const LazyObjectionRegistrationModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.ObjectionRegistrationModal }))
);
export const LazyObjectionJudgmentModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.ObjectionJudgmentModal }))
);
export const LazyAddActionModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.AddActionModal }))
);
export const LazyExtraordinaryAppealModal = lazy(() =>
    import('./SmartFileModals').then((m) => ({ default: m.ExtraordinaryAppealModal }))
);

export const LazyFastTrackModal = lazy(() =>
    import('./FastTrackModal').then((m) => ({ default: m.FastTrackModal }))
);
export const LazyAttachmentShieldModal = lazy(() =>
    import('./AttachmentShieldModal').then((m) => ({ default: m.AttachmentShieldModal }))
);
export const LazySmartJudgmentModal = lazy(() =>
    import('./SmartJudgmentModal').then((m) => ({ default: m.SmartJudgmentModal }))
);
export const LazyAppealTransitionModal = lazy(() =>
    import('./AppealTransitionModal').then((m) => ({ default: m.AppealTransitionModal }))
);
export const LazyCrossAppealModal = lazy(() =>
    import('./CrossAppealModal').then((m) => ({ default: m.CrossAppealModal }))
);
export const LazyMaterialErrorCorrectionModal = lazy(() =>
    import('./MaterialErrorCorrectionModal').then((m) => ({ default: m.MaterialErrorCorrectionModal }))
);

export const LazyJudgeRecusalModal = lazy(() =>
    import('./ProceduralModals').then((m) => ({ default: m.JudgeRecusalModal }))
);
export const LazyTransferJurisdictionModal = lazy(() =>
    import('./ProceduralModals').then((m) => ({ default: m.TransferJurisdictionModal }))
);
export const LazyCaseConsolidationModal = lazy(() =>
    import('./ProceduralModals').then((m) => ({ default: m.CaseConsolidationModal }))
);
export const LazyAttorneyResignationModal = lazy(() =>
    import('./ProceduralModals').then((m) => ({ default: m.AttorneyResignationModal }))
);
export const LazyExecutionTransferModal = lazy(() =>
    import('./ProceduralModals').then((m) => ({ default: m.ExecutionTransferModal }))
);
