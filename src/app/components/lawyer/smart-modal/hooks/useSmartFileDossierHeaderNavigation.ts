import { useCallback } from 'react';
import { isSmartFileNestedOverlayOpen } from '../smartFile/smartFileNestedOverlayState';
import { isSmartFileInlineOverlayOpen } from '../smartFile/smartFileInlineOverlayRegistry';

export type UseSmartFileDossierHeaderNavigationParams = {
    onClose: () => void;
    onExitToProfile?: () => void;
    isTrashOpen: boolean;
    setIsTrashOpen: (open: boolean) => void;
    modalsPortal?: import('../layout/portal/smartFileModalsPortalTypes').SmartFileModalsPortalProps;
    caseLinkViewOnly?: boolean;
    onReturnFromCaseLinkBrowse?: () => void;
};

export function useSmartFileDossierHeaderNavigation({
    onClose,
    onExitToProfile,
    isTrashOpen,
    setIsTrashOpen,
    modalsPortal,
    caseLinkViewOnly = false,
    onReturnFromCaseLinkBrowse,
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
        if (caseLinkViewOnly && onReturnFromCaseLinkBrowse) {
            onReturnFromCaseLinkBrowse();
            return;
        }
        onClose();
    }, [
        isTrashOpen,
        setIsTrashOpen,
        modalsPortal,
        caseLinkViewOnly,
        onReturnFromCaseLinkBrowse,
        onClose,
    ]);

    const handleDossierExit = useCallback(() => {
        if (onExitToProfile) {
            onExitToProfile();
            return;
        }
        onClose();
    }, [onClose, onExitToProfile]);

    const dossierNestedNav =
        isTrashOpen || (caseLinkViewOnly && Boolean(onReturnFromCaseLinkBrowse));

    return { handleDossierBack, handleDossierExit, dossierNestedNav };
}
