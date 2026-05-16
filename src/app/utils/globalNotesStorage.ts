import SecureStoreService from '@/app/services/SecureStoreService';

export const GLOBAL_NOTES_STORAGE_KEY = 'globalNotes';
export const GLOBAL_NOTES_STORAGE_KEYS_LEGACY = ['global_notes'] as const;

export function loadGlobalNotesRaw(): unknown[] {
    try {
        const primary = SecureStoreService.getItemSync(GLOBAL_NOTES_STORAGE_KEY);
        if (primary) {
            const parsed: unknown = JSON.parse(primary);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch {
        /* ignore */
    }

    for (const k of GLOBAL_NOTES_STORAGE_KEYS_LEGACY) {
        try {
            const raw = SecureStoreService.getItemSync(k);
            if (!raw) continue;
            const parsed: unknown = JSON.parse(raw);
            if (!Array.isArray(parsed)) continue;
            try {
                SecureStoreService.setItemSync(GLOBAL_NOTES_STORAGE_KEY, JSON.stringify(parsed));
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

export function saveGlobalNotesRaw(next: unknown[]): void {
    try {
        const payload = JSON.stringify(Array.isArray(next) ? next : []);
        try {
            SecureStoreService.setItemSync(GLOBAL_NOTES_STORAGE_KEY, payload);
        } catch {
            /* ignore */
        }
        GLOBAL_NOTES_STORAGE_KEYS_LEGACY.forEach((k) => {
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

