import SecureStoreService from '@/app/services/SecureStoreService';
import { backupDomainForStorageKey } from './protectedStorageKeys';
import { QUANTUM_TASKS_STORAGE_KEY } from '@/app/utils/quantumTasksStorageKey';
import type { BackupDomain, DossierDomain } from './dossierPersistenceTypes';

const DOSSIER_DOMAINS = new Set<DossierDomain>(['lawsuit', 'execution']);

function readRevision(domain: BackupDomain): number {
    try {
        const raw = SecureStoreService.getItemSync(`hami:backup:rev:${domain}`);
        const n = raw ? Number.parseInt(raw, 10) : 0;
        return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
        return 0;
    }
}

function bumpRevision(domain: BackupDomain): number {
    const next = readRevision(domain) + 1;
    try {
        SecureStoreService.setItemSync(`hami:backup:rev:${domain}`, String(next));
    } catch {
        /* ignore */
    }
    return next;
}

function parseBackupPayload(storageKey: string, raw: string): unknown[] | null {
    try {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        if (storageKey === QUANTUM_TASKS_STORAGE_KEY && parsed && typeof parsed === 'object') {
            const tasks = (parsed as { tasks?: unknown }).tasks;
            return Array.isArray(tasks) && tasks.length > 0 ? tasks : null;
        }
        return null;
    } catch {
        return null;
    }
}

/** نسخة احتياطية لملاحظات/تقويم/مخزن/منتدى/مهام — الإضابير تُدار عبر dossierPersistenceService */
export async function writeProtectedBackupFromRaw(storageKey: string, raw: string): Promise<void> {
    const domain = backupDomainForStorageKey(storageKey);
    if (!domain || DOSSIER_DOMAINS.has(domain as DossierDomain)) return;

    const payload = parseBackupPayload(storageKey, raw);
    if (!payload) return;

    const revision = bumpRevision(domain);
    const { writeDossierBackup } = await import('./dossierBackupStore');
    await writeDossierBackup(domain, payload, revision);
}

export function scheduleProtectedBackupFromData(storageKey: string, data: unknown): void {
    try {
        if (data === undefined || data === null) return;
        if (storageKey === QUANTUM_TASKS_STORAGE_KEY && data && typeof data === 'object') {
            const tasks = (data as { tasks?: unknown }).tasks;
            if (Array.isArray(tasks) && tasks.length > 0) {
                void writeProtectedBackupFromRaw(storageKey, JSON.stringify({ tasks }));
                return;
            }
        }
        const raw = JSON.stringify(data);
        void writeProtectedBackupFromRaw(storageKey, raw);
    } catch {
        /* ignore backup failures */
    }
}

export function scheduleProtectedBackupFromRaw(storageKey: string, raw: string): void {
    void writeProtectedBackupFromRaw(storageKey, raw);
}
