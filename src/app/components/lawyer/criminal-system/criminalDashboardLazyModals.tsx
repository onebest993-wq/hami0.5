// @ts-nocheck
import React, { lazy, Suspense, type ComponentProps, type ReactNode } from 'react';
import { CriminalModalPortal, CRIMINAL_MODAL_Z, renderCriminalModalPortal } from './criminalModalPortal';

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

function ModalSuspense({ children }: { children: ReactNode }) {
    return <Suspense fallback={null}>{children}</Suspense>;
}

type LazyModalProps<C extends React.ComponentType<any>> = ComponentProps<C> & { open?: boolean };

type LazyModalOptions = {
    zIndex?: number;
    /** المكوّن يستخدم CriminalModalPortal داخلياً — لا نُضيف غلافاً خارجياً */
    selfPortaled?: boolean;
    /** المكوّن ما زال يحمل fixed inset-0 — نرفعه بـ createPortal فقط دون غلاف مزدوج */
    legacyShell?: boolean;
};

function lazyModal<C extends React.ComponentType<any>>(
    Component: C,
    options: LazyModalOptions = {},
) {
    const zIndex = options.zIndex ?? CRIMINAL_MODAL_Z.default;
    return function LazyModalWrapper(props: LazyModalProps<C>) {
        if (props.open === false) return null;
        const body = (
            <ModalSuspense>
                <Component {...props} />
            </ModalSuspense>
        );
        if (options.selfPortaled) return body;
        if (options.legacyShell) return renderCriminalModalPortal(body);
        return <CriminalModalPortal zIndex={zIndex}>{body}</CriminalModalPortal>;
    };
}

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

export type { JudicialCassationAppealModalVariant } from './components/JudicialCassationAppealModal';
