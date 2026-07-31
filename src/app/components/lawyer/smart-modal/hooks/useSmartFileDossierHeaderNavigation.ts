import { useCallback } from 'react';
import { isSmartFileNestedOverlayOpen } from '../smartFile/smartFileNestedOverlayState';
import { isSmartFileInlineOverlayOpen } from '../smartFile/smartFileInlineOverlayRegistry';

export type UseSmartFileDossierHeaderNavigationParams = {
    onClose: () => void;
    onExitToProfile?: () => void;
    isTrashOpen: boolean;
    setIsTrashOpen: (open: boolean) => void;
    modalsPortal?: import('../layout/portal/smartFileModalsPortalTypes').SmartFileModalsPortalProps;
};

export function useSmartFileDossierHeaderNavigation({
    onClose,
    onExitToProfile,
    isTrashOpen,
    setIsTrashOpen,
    modalsPortal,
}: UseSmartFileDossierHeaderNavigationParams) {
    const handleDossierBack = useCallback(() => {
        if (isTrashOpen) {
            setIsTrashOpen(false);
            return;
        }
        if (
            isSmartFileNestedOverlayOpen(modalsPortal) ||
            isSmartFileInlineOverlayOpen()
        ) {
            return;
        }
        onClose();
    }, [isTrashOpen, setIsTrashOpen, modalsPortal, onClose]);

    const handleDossierExit = useCallback(() => {
        if (onExitToProfile) {
            onExitToProfile();
            return;
        }
        onClose();
    }, [onClose, onExitToProfile]);

    return { handleDossierBack, handleDossierExit };
}
