import SecureStoreService from '@/app/services/SecureStoreService';

export const EXECUTION_FILES_STORAGE_KEY = 'executionFiles';
export const EXECUTION_FILES_STORAGE_KEYS_LEGACY = [
    'hami-execution-files',
    'execution_files',
] as const;

export function loadExecutionFilesRaw(): unknown[] {
    try {
        const primary = SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY);
        if (primary) {
            const parsed: unknown = JSON.parse(primary);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch {
        /* ignore */
    }

    for (const k of EXECUTION_FILES_STORAGE_KEYS_LEGACY) {
        try {
            const raw = SecureStoreService.getItemSync(k);
            if (!raw) continue;
            const parsed: unknown = JSON.parse(raw);
            if (!Array.isArray(parsed)) continue;
            try {
                SecureStoreService.setItemSync(EXECUTION_FILES_STORAGE_KEY, JSON.stringify(parsed));
            } catch {
                /* ignore */
            }
            return parsed;
        } catch {
            /* ignore */
        }
    }

    return [];
}

export function saveExecutionFilesRaw(next: unknown[]): void {
    try {
        const payload = JSON.stringify(Array.isArray(next) ? next : []);
        try {
            SecureStoreService.setItemSync(EXECUTION_FILES_STORAGE_KEY, payload);
        } catch {
            /* ignore */
        }
        EXECUTION_FILES_STORAGE_KEYS_LEGACY.forEach((k) => {
            try {
                SecureStoreService.setItemSync(k, payload);
            } catch {
                /* ignore */
            }
        });
    } catch {
        /* ignore */
    }
}

export function mergeExecutionFilesById(primary: unknown[], incoming: unknown[]): unknown[] {
    const out: unknown[] = [];
    const seen = new Set<string>();
    const add = (v: unknown) => {
        if (!v || typeof v !== 'object' || Array.isArray(v)) return;
        const id = String((v as { id?: unknown }).id ?? '').trim();
        if (!id || seen.has(id)) return;
        seen.add(id);
        out.push(v);
    };
    primary.forEach(add);
    incoming.forEach(add);
    return out;
}

