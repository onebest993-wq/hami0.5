/**
 * Domain isolation — SecureStore dossier read for gates (keys lite + dynamic storageCache).
 */
import { getEffectiveClaimTypes } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    executionStorageKey,
    normalizeExecutionStorageId,
} from '@/app/utils/executionStorageKeysLite';
import { readScopedSecureOrDrainLegacySync } from '@/app/utils/readScopedSecureOrDrainLegacySync';

type StorageCacheLite = {
    invalidate: (key: string) => void;
    touchCacheEntry: (key: string, record: Record<string, unknown>) => void;
};

function touchStorageCache(
    op: 'invalidate' | 'touch',
    key: string,
    record?: Record<string, unknown>,
): void {
    void import('@/app/utils/storageCache')
        .then((m) => {
            const cache = m.storageCache as StorageCacheLite;
            if (op === 'invalidate') cache.invalidate(key);
            else if (record) cache.touchCacheEntry(key, record);
        })
        .catch(() => undefined);
}

/** قراءة بيانات الإضبارة للبوابات — المصدر الموثوق هو SecureStore (لا cache قديم) */
export function readExecutionDataForDomainGate(
    executionId: string | undefined,
): Record<string, unknown> | null {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return null;
    const key = executionStorageKey(id);
    try {
        const raw = readScopedSecureOrDrainLegacySync(key);
        if (!raw?.trim()) {
            touchStorageCache('invalidate', key);
            return null;
        }
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return null;
        }
        const record = parsed as Record<string, unknown>;
        touchStorageCache('touch', key, record);
        return record;
    } catch {
        return null;
    }
}

/** يفضّل لقطة الواجهة الحية (إضبارة فرعية) على تخزين الأب عند اختلاف المعرّف */
export function resolveExecutionDataForDomainGate(
    executionId: string | undefined,
    executionDataHint?: Record<string, unknown> | null,
): Record<string, unknown> | null {
    if (executionDataHint && typeof executionDataHint === 'object' && !Array.isArray(executionDataHint)) {
        const types = getEffectiveClaimTypes(executionDataHint);
        const single = String(executionDataHint.claimType || '').trim();
        if (types.length > 0 || single) {
            return executionDataHint;
        }
    }
    return readExecutionDataForDomainGate(executionId);
}
