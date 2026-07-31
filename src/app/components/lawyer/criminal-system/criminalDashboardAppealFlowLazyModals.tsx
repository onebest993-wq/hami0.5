import { lazy } from 'react';
import { CRIMINAL_MODAL_Z } from './criminalModalPortal';
import { lazyModal } from './criminalLazyModalCore';

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

export const JudicialCassationAppealModal = lazyModal(LazyJudicialCassationAppealModal, {
    zIndex: CRIMINAL_MODAL_Z.stageCloser,
    legacyShell: true,
});

export const JudicialCassationResultModal = lazyModal(LazyJudicialCassationResultModal, {
    zIndex: CRIMINAL_MODAL_Z.stageCloser,
    legacyShell: true,
});

export type { JudicialCassationAppealModalVariant } from './components/JudicialCassationAppealModal';
