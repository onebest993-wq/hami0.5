import { runExecutionDossierBackStep } from './executionDossierBackNavigation';

type ExecutionDossierBackHandler = () => boolean;

let activeHandler: ExecutionDossierBackHandler | null = null;

export function setExecutionDossierBackHandler(handler: ExecutionDossierBackHandler | null): void {
    activeHandler = handler;
}

export function runRegisteredExecutionDossierBackStep(): boolean {
    if (!activeHandler) return false;
    return activeHandler();
}

export function runExecutionDossierBackFromRegistryOrStore(): boolean {
    if (runRegisteredExecutionDossierBackStep()) return true;
    return runExecutionDossierBackStep({ includeDomDialogDismiss: true });
}
