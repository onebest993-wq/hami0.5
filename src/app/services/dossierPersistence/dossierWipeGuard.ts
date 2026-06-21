import {
    isProtectedStorageKey,
    PROTECTED_ARRAY_STORAGE_KEYS,
    PROTECTED_OBJECT_STORAGE_KEYS,
} from './protectedStorageKeys';
import { QUANTUM_TASKS_STORAGE_KEY } from '@/app/utils/quantumTasksStorage';

/** يعدّ عناصر مصفوفة JSON */
export function countDossierArray(raw: string | null | undefined): number {
    if (!raw?.trim()) return 0;
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
        return 0;
    }
}

function countCasesInCriminalStore(raw: string | null | undefined): number {
    if (!raw?.trim()) return 0;
    try {
        const root = JSON.parse(raw) as {
            state?: { casesById?: Record<string, unknown> };
            casesById?: Record<string, unknown>;
        };
        const cases = root.state?.casesById ?? root.casesById;
        return cases && typeof cases === 'object' ? Object.keys(cases).length : 0;
    } catch {
        return 0;
    }
}

/** يعدّ عناصر البيانات المحمية (مصفوفات أو كائنات) */
export function countProtectedItems(storageKey: string, raw: string | null | undefined): number {
    if (!raw?.trim()) return 0;
    try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.length;
        if (parsed && typeof parsed === 'object') {
            if (storageKey === 'hami:criminal:store') {
                return countCasesInCriminalStore(raw);
            }
            if (storageKey === QUANTUM_TASKS_STORAGE_KEY) {
                const tasks = (parsed as { tasks?: unknown }).tasks;
                return Array.isArray(tasks) ? tasks.length : 0;
            }
            return Object.keys(parsed as object).length;
        }
        return 0;
    } catch {
        return 0;
    }
}

/** يمنع استبدال بيانات محمية غير فارغة بقائمة/كائن فارغ أو حمولة تالفة */
export function shouldRejectDossierWipe(
    storageKey: string,
    incomingRaw: string,
    existingRaw: string | null | undefined,
): boolean {
    if (!existingRaw?.trim()) return false;

    const trimmed = incomingRaw.trim();
    if (trimmed === '' || trimmed === 'null') return true;

    if (!isProtectedStorageKey(storageKey)) {
        if (trimmed === '{}') return true;
        return false;
    }

    if (trimmed === '{}' && countProtectedItems(storageKey, existingRaw) > 0) return true;

    const isArrayKey =
        PROTECTED_ARRAY_STORAGE_KEYS.has(storageKey) || storageKey.includes('lawyer_files');
    const isObjectKey = PROTECTED_OBJECT_STORAGE_KEYS.has(storageKey);

    if (isArrayKey || isObjectKey) {
        const incomingCount = countProtectedItems(storageKey, incomingRaw);
        const existingCount = countProtectedItems(storageKey, existingRaw);
        if (incomingCount === 0 && existingCount > 0) return true;
    }

    return false;
}
