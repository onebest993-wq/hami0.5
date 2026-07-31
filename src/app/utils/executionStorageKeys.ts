import SecureStoreService from '@/app/services/SecureStoreService';
import { seedFreshDecisionsNamespace } from '@/app/utils/executionDecisionsNamespace';
import { storageCache } from '@/app/utils/storageCache';
export {
    normalizeExecutionStorageId,
    unscopedExecutionStorageKey,
    executionStorageKey,
    executionDecisionsStorageKey,
    executionFieldVisitAppointmentStorageKey,
    executionDocumentsStorageKey,
    executionDocumentFoldersStorageKey,
    executionFormStorageKey,
    executionExpensesStorageKey,
    executionExpensesChangedEventName,
    executionGarnishmentFlagStorageKey,
    executionGarnishmentDetailsStorageKey,
    executionBadgesHiddenStorageKey,
    generateExecutionDossierId,
    getExecutionStorageBundleKeys,
    executionDossierIdFromStorageKey,
    scopeExecutionDeviceStorageKey,
    stripExecutionDeviceStorageUserScope,
} from '@/app/utils/executionStorageKeysLite';
import {
    normalizeExecutionStorageId,
    unscopedExecutionStorageKey,
    executionStorageKey,
    executionDecisionsStorageKey,
    scopeExecutionDeviceStorageKey,
    stripExecutionDeviceStorageUserScope,
    getExecutionStorageBundleKeys,
} from '@/app/utils/executionStorageKeysLite';
import { EXECUTION_WIPE_KEY_PREFIXES } from '@/app/utils/executionWipeRegistry';

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
    if (typeof clean.notes !== 'string') delete clean.notes;
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

/**
 * حدّ ملكية المفتاح للإضبارة.
 *
 * كان المسح `k.startsWith(base)` بلا حدّ: حذف الإضبارة `1` يبتلع مفاتيح
 * الإضبارة `12` لأن `execution_12_decisions` يبدأ فعلاً بـ`execution_1`
 * — إبادة صامتة لبيانات إضبارة سليمة أثناء حذف أخرى.
 *
 * كل لاحقة مشروعة تبدأ بفاصل: `_decisions` و`_documents` … أو `:u:{uid}`
 * للنطاق بالمالك. فالمطابقة تتوقف عند الفاصل.
 */
function isKeyOwnedByExecutionBase(key: string, base: string): boolean {
    if (!base || !key.startsWith(base)) return false;
    const rest = key.slice(base.length);
    return rest === '' || rest.startsWith('_') || rest.startsWith(':');
}

/**
 * الشِّق الثاني من الحذف: مدفوع بالبادئات لا بالتعداد.
 *
 * حزمة `getExecutionStorageBundleKeys` تُعدّد المفاتيح واحداً واحداً، وهذا
 * تعداد يتخلّف كلما أضاف أحدهم عائلة مفاتيح جديدة — وهو ما حدث فعلاً فنجا
 * السجل المالي وحالة مهلة التخلية وفكّ قفل الموظف من «الحذف النهائي».
 *
 * فبدل الاعتماد على أن يتذكّر كاتب الكود تحديث قائمة، نمسح هنا كل مفتاح
 * تملكه عائلة في `EXECUTION_WIPE_KEY_PREFIXES` وينتهي بمعرّف هذه الإضبارة.
 * كل مفاتيح القسم تُلحق المعرّف بفاصل (`…_7` أو `…:7`)، والفاصل شرط حتى لا
 * يبتلع حذف الإضبارة `2` مفاتيح الإضبارة `12`.
 */
function isKeyOwnedByDossierTail(key: string, id: string): boolean {
    if (!id || id === 'default') return false;
    if (!EXECUTION_WIPE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) return false;
    const unscoped = stripExecutionDeviceStorageUserScope(key);
    if (!unscoped.endsWith(id) || unscoped.length <= id.length) return false;
    const boundary = unscoped[unscoped.length - id.length - 1];
    return boundary === '_' || boundary === ':';
}

export async function removeExecutionStorageBundleAsync(executionId: string | undefined): Promise<void> {
    const id = normalizeExecutionStorageId(executionId);
    const existing = bundleDeletionInFlight.get(id);
    if (existing) {
        await existing;
        return;
    }
    const task = (async () => {
        const base = unscopedExecutionStorageKey(id);
        const scopedBase = scopeExecutionDeviceStorageKey(base);
        const keys = getExecutionStorageBundleKeys(id);
        await Promise.all(keys.map((k) => SecureStoreService.deleteItem(k)));
        const allKeys = await SecureStoreService.listKeys();
        await Promise.all(
            allKeys
                .filter(
                    (k) =>
                        isKeyOwnedByExecutionBase(k, base) ||
                        isKeyOwnedByExecutionBase(k, scopedBase) ||
                        isKeyOwnedByDossierTail(k, id),
                )
                .map((k) => SecureStoreService.deleteItem(k)),
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
