import SecureStoreService from '@/app/services/SecureStoreService';
import { normalizeExecutionStorageId } from '@/app/utils/executionStorageKeys';

const EXECUTION_DOSSIER_TOMBSTONES_KEY = 'hami:execution:dossier-tombstones:v1';

function readTombstoneSet(): Set<string> {
    try {
        const raw = SecureStoreService.getItemSync(EXECUTION_DOSSIER_TOMBSTONES_KEY);
        if (!raw?.trim()) return new Set();
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(
            parsed
                .map((id) => normalizeExecutionStorageId(String(id ?? '')))
                .filter((id) => id && id !== 'default'),
        );
    } catch {
        return new Set();
    }
}

function writeTombstoneSet(set: Set<string>): void {
    try {
        SecureStoreService.setItemSync(
            EXECUTION_DOSSIER_TOMBSTONES_KEY,
            JSON.stringify([...set]),
        );
    } catch {
        /* ignore */
    }
}

export function isExecutionDossierTombstoned(dossierId: string | number | undefined): boolean {
    const id = normalizeExecutionStorageId(String(dossierId ?? ''));
    if (!id || id === 'default') return false;
    return readTombstoneSet().has(id);
}

export function markExecutionDossierTombstone(dossierId: string | number | undefined): void {
    const id = normalizeExecutionStorageId(String(dossierId ?? ''));
    if (!id || id === 'default') return;
    const next = readTombstoneSet();
    next.add(id);
    writeTombstoneSet(next);
}

export function markExecutionDossierTombstones(dossierIds: Iterable<string | number>): void {
    const next = readTombstoneSet();
    for (const rawId of dossierIds) {
        const id = normalizeExecutionStorageId(String(rawId ?? ''));
        if (id && id !== 'default') next.add(id);
    }
    writeTombstoneSet(next);
}
