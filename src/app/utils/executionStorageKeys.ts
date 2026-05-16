import SecureStoreService from '@/app/services/SecureStoreService';
const bundleDeletionInFlight = new Map<string, Promise<void>>();

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

export function executionFieldVisitAppointmentStorageKey(executionId: string | undefined): string {
    return `${executionStorageKey(executionId)}_eviction_field_visit_appointment_iso`;
}

export function executionDocumentsStorageKey(executionId: string | undefined): string {
    return `${executionStorageKey(executionId)}_documents`;
}

export function executionDocumentFoldersStorageKey(executionId: string | undefined): string {
    return `${executionStorageKey(executionId)}_document_folders`;
}

export function executionFormStorageKey(formId: string | undefined): string {
    return `execution_form_${normalizeExecutionStorageId(formId)}`;
}

export function executionExpensesStorageKey(): string {
    return 'execution_expenses';
}

export function executionExpensesChangedEventName(): string {
    return 'hami-expenses-changed';
}

export function executionGarnishmentFlagStorageKey(executionId: string | undefined): string {
    return `garnishment_${normalizeExecutionStorageId(executionId)}`;
}

export function executionGarnishmentDetailsStorageKey(executionId: string | undefined): string {
    return `hami_garnishment_details_${normalizeExecutionStorageId(executionId)}`;
}

export function executionBadgesHiddenStorageKey(executionId: string | undefined): string {
    return `hami_party_badges_hidden_${normalizeExecutionStorageId(executionId)}`;
}

export async function removeExecutionStorageBundleAsync(executionId: string | undefined): Promise<void> {
    const id = normalizeExecutionStorageId(executionId);
    const existing = bundleDeletionInFlight.get(id);
    if (existing) {
        await existing;
        return;
    }
    const task = (async () => {
        const base = `execution_${id}`;
        const keys = [
            executionStorageKey(id),
            executionDecisionsStorageKey(id),
            executionDocumentsStorageKey(id),
            executionFieldVisitAppointmentStorageKey(id),
            executionFormStorageKey(id),
            executionGarnishmentFlagStorageKey(id),
            executionGarnishmentDetailsStorageKey(id),
            executionBadgesHiddenStorageKey(id),
        ];
        await Promise.all(keys.map((k) => SecureStoreService.deleteItem(k)));
        const allKeys = await SecureStoreService.listKeys();
        await Promise.all(
            allKeys
                .filter((k) => k.startsWith(base))
                .map((k) => SecureStoreService.deleteItem(k))
        );
    })();
    bundleDeletionInFlight.set(id, task);
    try {
        await task;
    } finally {
        if (bundleDeletionInFlight.get(id) === task) {
            bundleDeletionInFlight.delete(id);
        }
    }
}

export function removeExecutionStorageBundle(executionId: string | undefined): void {
    void (async () => {
        try {
            await removeExecutionStorageBundleAsync(executionId);
        } catch {
            /* ignore */
        }
    })();
}
