import SecureStoreService from '@/app/services/SecureStoreService';

export const LAWSUIT_FILES_STORAGE_KEY = 'lawsuitFiles';
export const LAWSUIT_FILES_STORAGE_KEYS_LEGACY = [
    'hami-lawsuit-files',
    'lawsuit_files',
] as const;

export function loadLawsuitFilesRaw(): unknown[] {
    try {
        const primary = SecureStoreService.getItemSync(LAWSUIT_FILES_STORAGE_KEY);
        if (primary) {
            const parsed: unknown = JSON.parse(primary);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch {
        /* ignore */
    }

    for (const k of LAWSUIT_FILES_STORAGE_KEYS_LEGACY) {
        try {
            const raw = SecureStoreService.getItemSync(k);
            if (!raw) continue;
            const parsed: unknown = JSON.parse(raw);
            if (!Array.isArray(parsed)) continue;
            try {
                SecureStoreService.setItemSync(LAWSUIT_FILES_STORAGE_KEY, JSON.stringify(parsed));
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

export function saveLawsuitFilesRaw(next: unknown[]): void {
    try {
        const payload = JSON.stringify(Array.isArray(next) ? next : []);
        try {
            SecureStoreService.setItemSync(LAWSUIT_FILES_STORAGE_KEY, payload);
        } catch {
            /* ignore */
        }
        LAWSUIT_FILES_STORAGE_KEYS_LEGACY.forEach((k) => {
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

