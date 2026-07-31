import SecureStoreService from '@/app/services/SecureStoreService';
import { normalizeExecutionStorageId } from '@/app/utils/executionStorageKeys';
import { getActiveExecutionFilesStorageOwner } from '@/app/utils/executionFilesStorage';

const TOMBSTONES_KEY_BASE = 'hami:execution:dossier-tombstones:v1';

function resolveTombstonesKey(): string {
    const owner = getActiveExecutionFilesStorageOwner();
    return owner ? `${TOMBSTONES_KEY_BASE}:${owner}` : TOMBSTONES_KEY_BASE;
}

function readTombstoneSet(): Set<string> {
    try {
        const raw = SecureStoreService.getItemSync(resolveTombstonesKey());
        if (!raw?.trim()) {
            // ترحيل لمرة من المفتاح العام عند وجود مالك
            const owner = getActiveExecutionFilesStorageOwner();
            if (owner) {
                const legacy = SecureStoreService.getItemSync(TOMBSTONES_KEY_BASE);
                if (legacy?.trim()) {
                    SecureStoreService.setItemSync(resolveTombstonesKey(), legacy);
                    return parseTombstoneRaw(legacy);
                }
            }
            return new Set();
        }
        return parseTombstoneRaw(raw);
    } catch {
        return new Set();
    }
}

function parseTombstoneRaw(raw: string): Set<string> {
    try {
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
        SecureStoreService.setItemSync(resolveTombstonesKey(), JSON.stringify([...set]));
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

export function listExecutionDossierTombstoneIds(): string[] {
    return [...readTombstoneSet()];
}
