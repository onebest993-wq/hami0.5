/** Lazy chunks for SmartFileModal — cold paths stay lazy; hot paths prefetch on intent */
import { lazy } from 'react';
import { AddTaskModal } from './modals/contentEntryModals';

export { AddTaskModal };
export const LazyAddTaskModal = AddTaskModal;
export const LazyEditCaseInfoModal = lazy(() =>
    import('./modals/EditCaseInfoModal').then((m) => ({ default: m.EditCaseInfoModal }))
);
export const LazyAddDocumentModal = lazy(() =>
    import('./modals/contentEntryModals').then((m) => ({ default: m.AddDocumentModal }))
);
export const LazyAddNoteModal = lazy(() =>
    import('./modals/contentEntryModals').then((m) => ({ default: m.AddNoteModal }))
);
export const LazyAddAppointmentModal = lazy(() =>
    import('./modals/contentEntryModals').then((m) => ({ default: m.AddAppointmentModal }))
);
export const LazyAddPaymentModal = lazy(() =>
    import('./modals/contentEntryModals').then((m) => ({ default: m.AddPaymentModal }))
);
export const LazyAddIncidentalCaseModal = lazy(() =>
    import('./modals/flow-modals/AddIncidentalCaseModal').then((m) => ({ default: m.AddIncidentalCaseModal }))
);
export const LazyPauseCaseModal = lazy(() =>
    import('./modals/flow-modals/PauseCaseModal').then((m) => ({ default: m.PauseCaseModal }))
);
export const LazyInterruptionModal = lazy(() =>
    import('./modals/flow-modals/InterruptionModal').then((m) => ({ default: m.InterruptionModal }))
);
export const LazyResumeInterruptionModal = lazy(() =>
    import('./modals/flow-modals/ResumeInterruptionModal').then((m) => ({ default: m.ResumeInterruptionModal }))
);
export const LazyTrashModal = lazy(() =>
    import('./modals/flow-modals/TrashModal').then((m) => ({ default: m.TrashModal }))
);
export const LazyInterlocutoryAppealModal = lazy(() =>
    import('./modals/appealObjectionModals').then((m) => ({ default: m.InterlocutoryAppealModal }))
);
export const LazyAppealRegistrationModal = lazy(() =>
    import('./modals/appealObjectionModals').then((m) => ({ default: m.AppealRegistrationModal }))
);
export const LazyAddProvisionalOrderModal = lazy(() =>
    import('./modals/flow-modals/AddProvisionalOrderModal').then((m) => ({ default: m.AddProvisionalOrderModal }))
);
export const LazyJudicialNotificationModal = lazy(() =>
    import('./modals/appealObjectionModals').then((m) => ({ default: m.JudicialNotificationModal }))
);
export const LazyObjectionRegistrationModal = lazy(() =>
    import('./modals/appealObjectionModals').then((m) => ({ default: m.ObjectionRegistrationModal }))
);
export const LazyObjectionJudgmentModal = lazy(() =>
    import('./modals/appealObjectionModals').then((m) => ({ default: m.ObjectionJudgmentModal }))
);
export const LazyAbsentJudgmentNotificationModal = lazy(() =>
    import('./modals/appealObjectionModals').then((m) => ({ default: m.AbsentJudgmentNotificationModal }))
);
export const LazyOpponentAbsentObjectionModal = lazy(() =>
    import('./modals/appealObjectionModals').then((m) => ({ default: m.OpponentAbsentObjectionModal }))
);
export const LazyExtraordinaryAppealModal = lazy(() =>
    import('./modals/extraordinaryAppealModal').then((m) => ({ default: m.ExtraordinaryAppealModal }))
);

export const LazyFastTrackModal = lazy(() =>
    import('./FastTrackModal').then((m) => ({ default: m.FastTrackModal }))
);
export const LazyAttachmentShieldModal = lazy(() =>
    import('./AttachmentShieldModal').then((m) => ({ default: m.AttachmentShieldModal }))
);
export const LazySmartJudgmentModal = lazy(() =>
    import('./SmartJudgmentModal')
        .then((m) => ({ default: m.SmartJudgmentModal }))
        .catch((error) => {
            throw error;
        })
);
export const LazyAppealTransitionModal = lazy(() =>
    import('./AppealTransitionModal')
        .then((m) => ({ default: m.AppealTransitionModal }))
        .catch((error) => {
            throw error;
        })
);
export const LazyCrossAppealModal = lazy(() =>
    import('./CrossAppealModal').then((m) => ({ default: m.CrossAppealModal }))
);
export const LazyMaterialErrorCorrectionModal = lazy(() =>
    import('./MaterialErrorCorrectionModal').then((m) => ({ default: m.MaterialErrorCorrectionModal }))
);

export const LazyJudgeRecusalModal = lazy(() =>
    import('./procedural-modals/JudgeRecusalModal').then((m) => ({ default: m.JudgeRecusalModal }))
);
export const LazyAppealBriefOutcomeModal = lazy(() =>
    import('./procedural-modals/AppealBriefOutcomeModal').then((m) => ({ default: m.AppealBriefOutcomeModal }))
);
