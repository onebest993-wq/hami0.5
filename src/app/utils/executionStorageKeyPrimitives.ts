export function normalizeExecutionStorageId(executionId: string | undefined): string {
    const id = String(executionId ?? 'default').trim();
    return id || 'default';
}

export function executionStorageKey(executionId: string | undefined): string {
    return `execution_${normalizeExecutionStorageId(executionId)}`;
}

export function executionDecisionsStorageKey(executionId: string | undefined): string {
    return `${executionStorageKey(executionId)}_decisions`;
}
