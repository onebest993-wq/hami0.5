import { lazy } from 'react';
import { CRIMINAL_MODAL_Z } from './criminalModalPortal';
import { lazyModal } from './criminalLazyModalCore';

const LazyCriminalCaseTrashModal = lazy(() =>
    import('./components/modals/CriminalCaseTrashModal').then((m) => ({
        default: m.CriminalCaseTrashModal,
    })),
);

const LazySeveranceTargetPickerModal = lazy(() =>
    import('./components/modals/SeveranceTargetPickerModal').then((m) => ({
        default: m.SeveranceTargetPickerModal,
    })),
);

export const SeveranceTargetPickerModal = lazyModal(LazySeveranceTargetPickerModal, {
    zIndex: CRIMINAL_MODAL_Z.stageCloser,
    legacyShell: true,
});

export const CriminalCaseTrashModal = lazyModal(LazyCriminalCaseTrashModal, {
    zIndex: CRIMINAL_MODAL_Z.trash,
});
