import SecureStoreService from '@/app/services/SecureStoreService';
import { seedFreshDecisionsNamespace } from '@/app/utils/executionDecisionsNamespace';
import { storageCache } from '@/app/utils/storageCache';

const bundleDeletionInFlight = new Map<string, Promise<void>>();

const FRESH_DOSSIER_EMPTY_ARRAY_KEYS = [
    'timelineEvents',
    'decisions',
    'caseNotesLog',
    'caseTasksPending',
    'seizedAssets',
    'seizedProperties',
    'seizedMovables',
    'thirdPartySeizures',
    'realEstateSeizureAssets',
    'activeCoerciveActions',
    'procedural_guarantee_history',
    'guarantor_followup_history',
] as const;

const FRESH_DOSSIER_NULL_KEYS = ['guarantor_followup', 'procedural_guarantee'] as const;

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

export function generateExecutionDossierId(): string {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi?.randomUUID) return `exec_${cryptoApi.randomUUID()}`;
    return `exec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getExecutionStorageBundleKeys(executionId: string | undefined): string[] {
    const id = normalizeExecutionStorageId(executionId);
    return [
        executionStorageKey(id),
        executionDecisionsStorageKey(id),
        executionDocumentsStorageKey(id),
        executionDocumentFoldersStorageKey(id),
        executionFieldVisitAppointmentStorageKey(id),
        executionFormStorageKey(id),
        executionGarnishmentFlagStorageKey(id),
        executionGarnishmentDetailsStorageKey(id),
        executionBadgesHiddenStorageKey(id),
    ];
}

/** يمسح ذاكرة التخزين المؤقت للإضبارة — يُستدعى عند الحذف النهائي أو قبل تهيئة إضبارة جديدة */
export function purgeExecutionStorageCache(executionId: string | undefined): void {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return;
    for (const key of getExecutionStorageBundleKeys(id)) {
        storageCache.remove(key);
    }
}

export function buildFreshExecutionDossierBlob(file: Record<string, unknown>): Record<string, unknown> {
    const id = normalizeExecutionStorageId(String(file.id ?? ''));
    const clean: Record<string, unknown> = { ...file, id };
    for (const key of FRESH_DOSSIER_EMPTY_ARRAY_KEYS) {
        clean[key] = [];
    }
    for (const key of FRESH_DOSSIER_NULL_KEYS) {
        clean[key] = null;
    }
    clean.seizureDraftsByDecisionId = {};
    clean.linkedDossiers = [];
    clean.hasGuarantor = false;
    clean.updatedAt = new Date().toISOString();
    return clean;
}

/** يضمن عدم تسرب إجراءات إضبارة سابقة عند إنشاء إضبارة جديدة */
export function seedFreshExecutionDossierStorage(file: Record<string, unknown>): void {
    const id = normalizeExecutionStorageId(String(file.id ?? ''));
    if (!id || id === 'default') return;
    purgeExecutionStorageCache(id);
    const clean = buildFreshExecutionDossierBlob(file);
    storageCache.set(executionStorageKey(id), clean);
    storageCache.set(executionDecisionsStorageKey(id), []);
    seedFreshDecisionsNamespace(id, clean);
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
        const keys = getExecutionStorageBundleKeys(id);
        await Promise.all(keys.map((k) => SecureStoreService.deleteItem(k)));
        const allKeys = await SecureStoreService.listKeys();
        await Promise.all(
            allKeys
                .filter((k) => k.startsWith(base))
                .map((k) => SecureStoreService.deleteItem(k))
        );
        purgeExecutionStorageCache(id);
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
