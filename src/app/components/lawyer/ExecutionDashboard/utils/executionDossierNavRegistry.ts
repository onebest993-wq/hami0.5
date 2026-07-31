export type ExecutionDossierNavHandlers = {
    backToArchive: () => void;
    exitToHome: () => void;
};

let handlers: ExecutionDossierNavHandlers | null = null;

export function setExecutionDossierNavHandlers(next: ExecutionDossierNavHandlers | null): void {
    handlers = next;
}

export function runExecutionDossierBackToArchive(): boolean {
    if (!handlers?.backToArchive) return false;
    handlers.backToArchive();
    return true;
}

export function runExecutionDossierExitToHome(): boolean {
    if (!handlers?.exitToHome) return false;
    handlers.exitToHome();
    return true;
}
