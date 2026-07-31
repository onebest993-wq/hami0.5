import { useCallback, useEffect } from 'react';
import { runExecutionDossierBackStep } from '../utils/executionDossierBackNavigation';
import {
    runExecutionDossierBackToArchive,
    runExecutionDossierExitToHome,
    setExecutionDossierNavHandlers,
} from '../utils/executionDossierNavRegistry';
import { setExecutionDossierBackHandler } from '../utils/executionDossierBackHandlerRegistry';

export type UseExecutionDossierHeaderNavigationParams = {
    /** احتياطي إن لم يُسجَّل سجل التنقّل */
    onClose?: () => void;
    closeLocalOverlay?: () => boolean;
    dossierContextBack?: () => boolean;
};

export function useExecutionDossierHeaderNavigation({
    onClose,
    closeLocalOverlay,
    dossierContextBack,
}: UseExecutionDossierHeaderNavigationParams) {
    const runScopedBackStep = useCallback(
        (includeDomDialogDismiss: boolean) =>
            runExecutionDossierBackStep({
                closeLocalOverlay,
                dossierContextBack,
                includeDomDialogDismiss,
            }),
        [closeLocalOverlay, dossierContextBack],
    );

    const handleDossierBack = useCallback(() => {
        if (runScopedBackStep(false)) return;
        if (runExecutionDossierBackToArchive()) return;
        onClose?.();
    }, [onClose, runScopedBackStep]);

    const handleDossierExit = useCallback(() => {
        if (runExecutionDossierExitToHome()) return;
        onClose?.();
    }, [onClose]);

    useEffect(() => {
        setExecutionDossierBackHandler(() => runScopedBackStep(true));
        return () => setExecutionDossierBackHandler(null);
    }, [runScopedBackStep]);

    return { handleDossierBack, handleDossierExit, runScopedBackStep };
}
