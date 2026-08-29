import React, { lazy } from 'react';
import { CRIMINAL_MODAL_Z } from './criminalModalPortal';
import { lazyModal } from './criminalLazyModalCore';

const LazyInvestigationDecisionModal = lazy(() =>
    import('./components/modals/InvestigationDecisionModal').then((m) => ({
        default: m.InvestigationDecisionModal,
    })),
);
const LazyCriminalStatementModal = lazy(() =>
    import('./components/modals/CriminalStatementModal').then((m) => ({
        default: m.CriminalStatementModal,
    })),
);
const LazyCriminalCaseTrashModal = lazy(() =>
    import('./components/modals/CriminalCaseTrashModal').then((m) => ({
        default: m.CriminalCaseTrashModal,
    })),
);
const LazyConfirmActionModal = lazy(() =>
    import('./ConfirmActionModal').then((m) => ({
        default: m.ConfirmActionModal,
    })),
);
const LazyStageFinalDecisionModal = lazy(() =>
    import('./components/modals/StageFinalDecisionModal').then((m) => ({
        default: m.StageFinalDecisionModal,
    })),
);
const LazyJudicialCassationAppealModal = lazy(() =>
    import('./components/JudicialCassationAppealModal').then((m) => ({
        default: m.JudicialCassationAppealModal,
    })),
);
const LazyJudicialCassationResultModal = lazy(() =>
    import('./components/JudicialCassationResultModal').then((m) => ({
        default: m.JudicialCassationResultModal,
    })),
);
const LazyMergeCaseModal = lazy(() =>
    import('./components/modals/MergeCaseModal').then((m) => ({
        default: m.MergeCaseModal,
    })),
);
const LazySeveranceTargetPickerModal = lazy(() =>
    import('./components/modals/SeveranceTargetPickerModal').then((m) => ({
        default: m.SeveranceTargetPickerModal,
    })),
);
const LazyTrialDepositionModal = lazy(() =>
    import('./components/modals/TrialDepositionModal').then((m) => ({
        default: m.TrialDepositionModal,
    })),
);
const LazyProceduralLinkedTimelineModal = lazy(() =>
    import('./components/modals/ProceduralLinkedTimelineModal').then((m) => ({
        default: m.ProceduralLinkedTimelineModal,
    })),
);
const LazyRequestQuickFinalizeModal = lazy(() =>
    import('./components/modals/RequestQuickFinalizeModal').then((m) => ({
        default: m.RequestQuickFinalizeModal,
    })),
);
const LazyVerdictCassationFilingModal = lazy(() =>
    import('./components/VerdictCassationModals').then((m) => ({
        default: m.VerdictCassationFilingModal,
    })),
);
const LazyPartyIdentityCorrectionModal = lazy(() =>
    import('./components/modals/CaseIdentityCorrectionModal').then((m) => ({
        default: m.PartyIdentityCorrectionModal,
    })),
);
const LazyVenueIdentityCorrectionModal = lazy(() =>
    import('./components/modals/VenueIdentityCorrectionModal').then((m) => ({
        default: m.VenueIdentityCorrectionModal,
    })),
);
const LazyStageCloserModal = lazy(() =>
    import('./components/StageCloserModal').then((m) => ({
        default: m.StageCloserModal,
    })),
);
const LazyRequestsEntryModal = lazy(() =>
    import('./components/RequestsEntryModal').then((m) => ({
        default: m.RequestsEntryModal,
    })),
);
const LazySendToCassationModal = lazy(() =>
    import('./components/SendToCassationModal').then((m) => ({
        default: m.SendToCassationModal,
    })),
);
const LazyLegalArticleEditModal = lazy(() =>
    import('./components/LegalArticleEditModal').then((m) => ({
        default: m.LegalArticleEditModal,
    })),
);
const LazyReopenCaseModal = lazy(() =>
    import('./components/ReopenCaseModal').then((m) => ({
        default: m.ReopenCaseModal,
    })),
);
const LazyBailForfeitureModal = lazy(() =>
    import('./components/BailForfeitureModal').then((m) => ({
        default: m.BailForfeitureModal,
    })),
);

/** مودالات جزائية — lazy عند الفتح (لا استيراد ثابت لـ store داخل registry) */
export const InvestigationDecisionModal = lazyModal(LazyInvestigationDecisionModal, {
    zIndex: CRIMINAL_MODAL_Z.stageCloser,
    legacyShell: true,
});
export const StageFinalDecisionModal = lazyModal(LazyStageFinalDecisionModal, {
    zIndex: CRIMINAL_MODAL_Z.stageCloser,
    legacyShell: true,
});
export const JudicialCassationAppealModal = lazyModal(LazyJudicialCassationAppealModal, {
    zIndex: CRIMINAL_MODAL_Z.stageCloser,
    legacyShell: true,
});
export const JudicialCassationResultModal = lazyModal(LazyJudicialCassationResultModal, {
    zIndex: CRIMINAL_MODAL_Z.stageCloser,
    legacyShell: true,
});
export const CriminalStatementModal = lazyModal(LazyCriminalStatementModal, {
    zIndex: CRIMINAL_MODAL_Z.request,
    legacyShell: true,
});
export const MergeCaseModal = lazyModal(LazyMergeCaseModal, { zIndex: CRIMINAL_MODAL_Z.request });
export const SeveranceTargetPickerModal = lazyModal(LazySeveranceTargetPickerModal, {
    zIndex: CRIMINAL_MODAL_Z.stageCloser,
    legacyShell: true,
});
export const CriminalCaseTrashModal = lazyModal(LazyCriminalCaseTrashModal, {
    zIndex: CRIMINAL_MODAL_Z.trash,
});
export const TrialDepositionModal = lazyModal(LazyTrialDepositionModal, {
    zIndex: CRIMINAL_MODAL_Z.trialPostpone,
    legacyShell: true,
});
export const ProceduralLinkedTimelineModal = lazyModal(LazyProceduralLinkedTimelineModal, {
    selfPortaled: true,
});
export const RequestQuickFinalizeModal = lazyModal(LazyRequestQuickFinalizeModal, {
    zIndex: CRIMINAL_MODAL_Z.procedural,
});
export const VerdictCassationFilingModal = lazyModal(LazyVerdictCassationFilingModal, {
    selfPortaled: true,
});
export const PartyIdentityCorrectionModal = lazyModal(LazyPartyIdentityCorrectionModal, {
    zIndex: CRIMINAL_MODAL_Z.default,
    legacyShell: true,
});
export const VenueIdentityCorrectionModal = lazyModal(LazyVenueIdentityCorrectionModal, {
    zIndex: CRIMINAL_MODAL_Z.default,
    legacyShell: true,
});

export const ConfirmActionModal = lazyModal(LazyConfirmActionModal, {
    zIndex: CRIMINAL_MODAL_Z.default,
    legacyShell: true,
});

/** Wave 2 — مودالات ثقيلة كانت ثابتة في ModalsHost */
export const StageCloserModal = lazyModal(LazyStageCloserModal, {
    zIndex: CRIMINAL_MODAL_Z.stageCloser,
    legacyShell: true,
});
export const RequestsEntryModal = lazyModal(LazyRequestsEntryModal, {
    zIndex: CRIMINAL_MODAL_Z.request,
    legacyShell: true,
});
export const SendToCassationModal = lazyModal(LazySendToCassationModal, {
    zIndex: CRIMINAL_MODAL_Z.default,
    legacyShell: true,
});
export const LegalArticleEditModal = lazyModal(LazyLegalArticleEditModal, {
    zIndex: CRIMINAL_MODAL_Z.default,
    legacyShell: true,
});
export const ReopenCaseModal = lazyModal(LazyReopenCaseModal, {
    zIndex: CRIMINAL_MODAL_Z.default,
    legacyShell: true,
});
export const BailForfeitureModal = lazyModal(LazyBailForfeitureModal, {
    zIndex: CRIMINAL_MODAL_Z.default,
    legacyShell: true,
});

export type { JudicialCassationAppealModalVariant } from './components/JudicialCassationAppealModal';
