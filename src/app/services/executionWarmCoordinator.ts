/**
 * منسّق تسخين التنفيذ — يمنع سباق hub + archive overlay على نفس الـ chunks.
 */
let workspaceWarmGeneration = 0;
let lastWorkspaceWarmAt = 0;
let lastDossierWarmAt = 0;

const WORKSPACE_COOLDOWN_MS = 2_500;
const DOSSIER_FROM_ARCHIVE_COOLDOWN_MS = 3_000;

export function markExecutionWorkspaceWarmed(now = Date.now()): void {
    workspaceWarmGeneration += 1;
    lastWorkspaceWarmAt = now;
}

export function markExecutionDossierWarmed(now = Date.now()): void {
    lastDossierWarmAt = now;
}

/** هل يُسمح بتسخين ثانوي للإضبارة من مضيف الأرشيف؟ (تجنّب تكرار خلال نافذة قصيرة بعد تسخين الـ hub) */
export function shouldWarmExecutionDossierFromArchiveHost(now = Date.now()): boolean {
    if (now - lastDossierWarmAt < DOSSIER_FROM_ARCHIVE_COOLDOWN_MS) return false;
    if (now - lastWorkspaceWarmAt < WORKSPACE_COOLDOWN_MS) return false;
    return true;
}

export function getExecutionWarmCoordinatorSnapshot(): {
    workspaceWarmGeneration: number;
    lastWorkspaceWarmAt: number;
    lastDossierWarmAt: number;
} {
    return {
        workspaceWarmGeneration,
        lastWorkspaceWarmAt,
        lastDossierWarmAt,
    };
}

/** للاختبارات فقط */
export function __resetExecutionWarmCoordinatorForTests(): void {
    workspaceWarmGeneration = 0;
    lastWorkspaceWarmAt = 0;
    lastDossierWarmAt = 0;
}
