import {
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

function storageKeyHidden(executionId: string) {
    return `hami_party_badges_hidden_${executionId}`;
}

export function loadHidden(executionId: string): string[] {
    try {
        const raw = readSecureOrDrainLegacySync(storageKeyHidden(executionId));
        if (!raw) return [];
        const p = JSON.parse(raw);
        return Array.isArray(p) ? p.filter((x) => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

export function saveHidden(executionId: string, ids: string[]) {
    try {
        writeSecureAndClearLegacySync(storageKeyHidden(executionId), JSON.stringify(ids));
    } catch {
        /* ignore */
    }
}

export function hiddenBadgeIdsEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
