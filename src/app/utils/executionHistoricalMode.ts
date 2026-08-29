import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import { isExecutionArchived, isExecutionInTrash } from '@/app/utils/executionTrash';

export type ExecutionHistoricalModeInput = {
    dossierLifecycleStatus?: string | null;
    executionArchivedAt?: string | null;
    executionTrashDeletedAt?: string | null;
};

/** إضبارة للقراءة فقط — منتهية، مؤرشفة، أو في سلة المهملات */
export function resolveExecutionHistoricalMode(
    input: ExecutionHistoricalModeInput | string | null | undefined,
): boolean {
    if (typeof input === 'string' || input === null || input === undefined) {
        return normalizeDossierLifecycleStatus(input) === 'finished';
    }

    if (normalizeDossierLifecycleStatus(input.dossierLifecycleStatus) === 'finished') {
        return true;
    }

    const archiveProbe = {
        executionArchivedAt: input.executionArchivedAt,
        executionTrashDeletedAt: input.executionTrashDeletedAt,
    };
    return isExecutionArchived(archiveProbe) || isExecutionInTrash(archiveProbe);
}
