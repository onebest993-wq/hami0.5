/** Lazy chunks for SmartFileModal — only symbols still mounted via portal sections. */
import { lazy } from 'react';

export const LazyEditCaseInfoModal = lazy(() =>
    import('./modals/EditCaseInfoModal').then((m) => ({ default: m.EditCaseInfoModal })),
);
export const LazyPauseCaseModal = lazy(() =>
    import('./modals/flow-modals/PauseCaseModal').then((m) => ({ default: m.PauseCaseModal })),
);
export const LazyInterruptionModal = lazy(() =>
    import('./modals/flow-modals/InterruptionModal').then((m) => ({ default: m.InterruptionModal })),
);
export const LazyTrashModal = lazy(() =>
    import('./modals/flow-modals/TrashModal').then((m) => ({ default: m.TrashModal })),
);
export const LazyObjectionRegistrationModal = lazy(() =>
    import('./modals/appealObjectionModals').then((m) => ({ default: m.ObjectionRegistrationModal })),
);
export const LazyAddProvisionalOrderModal = lazy(() =>
    import('./modals/flow-modals/AddProvisionalOrderModal').then((m) => ({
        default: m.AddProvisionalOrderModal,
    })),
);
export const LazyExtraordinaryAppealModal = lazy(() =>
    import('./modals/extraordinaryAppealModal').then((m) => ({ default: m.ExtraordinaryAppealModal })),
);
export const LazyFastTrackModal = lazy(() =>
    import('./FastTrackModal').then((m) => ({ default: m.FastTrackModal })),
);
export const LazyAttachmentShieldModal = lazy(() =>
    import('./AttachmentShieldModal').then((m) => ({ default: m.AttachmentShieldModal })),
);
export const LazyMaterialErrorCorrectionModal = lazy(() =>
    import('./MaterialErrorCorrectionModal').then((m) => ({ default: m.MaterialErrorCorrectionModal })),
);
export const LazyJudgeRecusalModal = lazy(() =>
    import('./procedural-modals/JudgeRecusalModal').then((m) => ({ default: m.JudgeRecusalModal })),
);
export const LazyAppealBriefOutcomeModal = lazy(() =>
    import('./procedural-modals/AppealBriefOutcomeModal').then((m) => ({
        default: m.AppealBriefOutcomeModal,
    })),
);
