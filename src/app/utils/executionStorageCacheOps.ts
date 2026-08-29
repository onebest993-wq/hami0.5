import { seedFreshDecisionsNamespace } from '@/app/utils/executionDecisionsNamespace';
import {
    executionDecisionsStorageKey,
    executionStorageKey,
    getExecutionStorageBundleKeys,
    normalizeExecutionStorageId,
} from '@/app/utils/executionStorageKeysLite';
import { storageCache } from '@/app/utils/storageCache';

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
    if (typeof clean.notes !== 'string') delete clean.notes;
    return clean;
}

/** يمسح ذاكرة التخزين المؤقت للإضبارة — يُستدعى عند الحذف النهائي أو قبل تهيئة إضبارة جديدة */
export function purgeExecutionStorageCache(executionId: string | undefined): void {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return;
    for (const key of getExecutionStorageBundleKeys(id)) {
        storageCache.remove(key);
    }
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
