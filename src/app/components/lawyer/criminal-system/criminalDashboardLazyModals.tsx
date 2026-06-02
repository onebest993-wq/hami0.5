import React, { lazy, Suspense, type ComponentProps, type ReactNode } from 'react';

const LazyInvestigationDecisionModal = lazy(() =>
    import('./components/modals/InvestigationDecisionModal').then((m) => ({
        default: m.InvestigationDecisionModal,
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
const LazyCriminalStatementModal = lazy(() =>
    import('./components/modals/CriminalStatementModal').then((m) => ({
        default: m.CriminalStatementModal,
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
const LazyCriminalCaseTrashModal = lazy(() =>
    import('./components/modals/CriminalCaseTrashModal').then((m) => ({
        default: m.CriminalCaseTrashModal,
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

function ModalSuspense({ children }: { children: ReactNode }) {
    return <Suspense fallback={null}>{children}</Suspense>;
}

type LazyModalProps<C extends React.ComponentType<any>> = ComponentProps<C> & { open?: boolean };

function lazyModal<C extends React.ComponentType<any>>(Component: C) {
    return function LazyModalWrapper(props: LazyModalProps<C>) {
        if (props.open === false) return null;
        return (
            <ModalSuspense>
                <Component {...props} />
            </ModalSuspense>
        );
    };
}

/** مودالات جزائية — تُحمَّل عند الفتح فقط لتسريع فتح الإضبارة الأول. */
export const InvestigationDecisionModal = lazyModal(LazyInvestigationDecisionModal);
export const StageFinalDecisionModal = lazyModal(LazyStageFinalDecisionModal);
export const JudicialCassationAppealModal = lazyModal(LazyJudicialCassationAppealModal);
export const JudicialCassationResultModal = lazyModal(LazyJudicialCassationResultModal);
export const CriminalStatementModal = lazyModal(LazyCriminalStatementModal);
export const MergeCaseModal = lazyModal(LazyMergeCaseModal);
export const SeveranceTargetPickerModal = lazyModal(LazySeveranceTargetPickerModal);
export const CriminalCaseTrashModal = lazyModal(LazyCriminalCaseTrashModal);
export const TrialDepositionModal = lazyModal(LazyTrialDepositionModal);
export const ProceduralLinkedTimelineModal = lazyModal(LazyProceduralLinkedTimelineModal);
export const RequestQuickFinalizeModal = lazyModal(LazyRequestQuickFinalizeModal);
export const VerdictCassationFilingModal = lazyModal(LazyVerdictCassationFilingModal);
export const PartyIdentityCorrectionModal = lazyModal(LazyPartyIdentityCorrectionModal);
export const VenueIdentityCorrectionModal = lazyModal(LazyVenueIdentityCorrectionModal);

export type { JudicialCassationAppealModalVariant } from './components/JudicialCassationAppealModal';
