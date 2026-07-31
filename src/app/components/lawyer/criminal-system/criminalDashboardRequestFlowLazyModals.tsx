import { lazy } from 'react';
import { CRIMINAL_MODAL_Z } from './criminalModalPortal';
import { lazyModal } from './criminalLazyModalCore';
import * as VerdictCassationModalsModule from './components/VerdictCassationModals';

const LazyRequestQuickFinalizeModal = lazy(() =>
    import('./components/modals/RequestQuickFinalizeModal').then((m) => ({
        default: m.RequestQuickFinalizeModal,
    })),
);

const LazyVerdictCassationFilingModal = lazy(() =>
    Promise.resolve({
        default: VerdictCassationModalsModule.VerdictCassationFilingModal,
    }),
);

export const RequestQuickFinalizeModal = lazyModal(LazyRequestQuickFinalizeModal, {
    zIndex: CRIMINAL_MODAL_Z.request,
});

export const VerdictCassationFilingModal = lazyModal(LazyVerdictCassationFilingModal, {
    zIndex: CRIMINAL_MODAL_Z.stageCloser,
});
