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
            // #region debug-point C:lazy-judgment-import
            fetch('http://127.0.0.1:7778/event', {
                method: 'POST',
                body: JSON.stringify({
                    sessionId: 'pleadings-close-button',
                    runId: 'pre-fix',
                    hypothesisId: 'C',
                    location: 'lazySmartFileModalChunks.tsx:LazySmartJudgmentModal',
                    msg: '[DEBUG] lazy SmartJudgmentModal import failed',
                    data: {
                        message: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack ?? null : null,
                    },
                    ts: Date.now(),
                }),
            }).catch(() => {});
            // #endregion
            throw error;
        })
);
export const LazyAppealTransitionModal = lazy(() =>
    import('./AppealTransitionModal')
        .then((m) => ({ default: m.AppealTransitionModal }))
        .catch((error) => {
            // #region debug-point B:lazy-appeal-transition-import
            fetch('http://127.0.0.1:7777/event', {
                method: 'POST',
                body: JSON.stringify({
                    sessionId: 'opponent-appeal-crash',
                    runId: 'pre-fix',
                    hypothesisId: 'B',
                    location: 'lazySmartFileModalChunks.tsx:LazyAppealTransitionModal',
                    msg: '[DEBUG] lazy AppealTransitionModal import failed',
                    data: {
                        message: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack ?? null : null,
                    },
                    ts: Date.now(),
                }),
            }).catch(() => {});
            // #endregion
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
export const LazyTransferJurisdictionModal = lazy(() =>
    import('./procedural-modals/TransferJurisdictionModal').then((m) => ({ default: m.TransferJurisdictionModal }))
);
export const LazyCaseConsolidationModal = lazy(() =>
    import('./procedural-modals/CaseConsolidationModal').then((m) => ({ default: m.CaseConsolidationModal }))
);
export const LazyCaseLinkModal = lazy(() =>
    import('./procedural-modals/CaseLinkModal').then((m) => ({ default: m.CaseLinkModal }))
);
export const LazyCorrespondenceModal = lazy(() =>
    import('./procedural-modals/CorrespondenceModal').then((m) => ({ default: m.CorrespondenceModal }))
);
export const LazyAppealBriefOutcomeModal = lazy(() =>
    import('./procedural-modals/AppealBriefOutcomeModal').then((m) => ({ default: m.AppealBriefOutcomeModal }))
);
