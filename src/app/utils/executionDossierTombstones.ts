import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import { normalizeExecutionStorageId } from '@/app/utils/executionStorageKeysLite';
import { getActiveExecutionFilesStorageOwner } from '@/app/utils/executionFilesStorage';

const TOMBSTONES_KEY_BASE = 'hami:execution:dossier-tombstones:v1';

function resolveTombstonesKey(): string {
    const owner = getActiveExecutionFilesStorageOwner();
    return owner ? `${TOMBSTONES_KEY_BASE}:${owner}` : TOMBSTONES_KEY_BASE;
}

function tombstoneKeysToProbe(): string[] {
    const key = resolveTombstonesKey();
    return key === TOMBSTONES_KEY_BASE ? [key] : [key, TOMBSTONES_KEY_BASE];
}

/** أصل مشفّر لم يُفكّ ≠ لا حذف. */
export function areExecutionDossierTombstonesUnreadSync(): boolean {
    try {
        return tombstoneKeysToProbe().some((k) => SecureStoreService.isUnreadSync(k));
    } catch {
        return false;
    }
}

/** يفكّ شواهد التنفيذ فقط. false = لا تدمج السحابة. */
export async function ensureExecutionDossierTombstonesReadable(): Promise<boolean> {
    if (!areExecutionDossierTombstonesUnreadSync()) return true;
    try {
        await Promise.all(tombstoneKeysToProbe().map((k) => SecureStoreService.getItem(k)));
    } catch {
        /* يبقى unread */
    }
    return !areExecutionDossierTombstonesUnreadSync();
}

function readTombstoneSet(): Set<string> {
    try {
        const key = resolveTombstonesKey();
        const raw = readSecureOrDrainLegacySync(key);
        if (raw?.trim()) return parseTombstoneRaw(raw);
        const owner = getActiveExecutionFilesStorageOwner();
        if (owner) {
            const legacy = readSecureOrDrainLegacySync(TOMBSTONES_KEY_BASE);
            if (legacy?.trim()) {
                writeSecureAndClearLegacySync(key, legacy);
                return parseTombstoneRaw(legacy);
            }
        }
        return new Set();
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

/**
 * شاهد القبر هو الشيء الوحيد الذي يمنع عودة الإضبارة المحذوفة من السحابة.
 * فإن فشلت كتابته صامتةً، يبقى الحذف محلياً ثم تُعاد الإضبارة عند أول مزامنة.
 * لذلك نتحقق بقراءة مرتجعة ونُعيد النتيجة للمنادي بدل الكتم.
 * `setItemSync` يعيد false عند رفض الكتابة الفارغة — نرفض الشاهد عندها.
 */
function writeTombstoneSet(set: Set<string>): boolean {
    const key = resolveTombstonesKey();
    const payload = JSON.stringify([...set]);
    try {
        const wrote = SecureStoreService.setItemSync(key, payload);
        if (wrote === false) return false;
    } catch {
        return false;
    }
    clearLegacyPlaintextMirror(key);
    clearLegacyPlaintextMirror(TOMBSTONES_KEY_BASE);
    return SecureStoreService.getItemSync(key) === payload;
}

export function isExecutionDossierTombstoned(dossierId: string | number | undefined): boolean {
    const id = normalizeExecutionStorageId(String(dossierId ?? ''));
    if (!id || id === 'default') return false;
    return readTombstoneSet().has(id);
}

/** @returns false إن لم يُلزَم الشاهد — الإضبارة معرّضة للعودة من السحابة */
export function markExecutionDossierTombstone(dossierId: string | number | undefined): boolean {
    const id = normalizeExecutionStorageId(String(dossierId ?? ''));
    if (!id || id === 'default') return false;
    /* unread ≠ قائمة فارغة — لا تكتب فوق ciphertext بارد */
    if (areExecutionDossierTombstonesUnreadSync()) return false;
    const next = readTombstoneSet();
    next.add(id);
    return writeTombstoneSet(next);
}

/** @returns false إن لم يُلزَم الشاهد — الإضابير معرّضة للعودة من السحابة */
export function markExecutionDossierTombstones(dossierIds: Iterable<string | number>): boolean {
    if (areExecutionDossierTombstonesUnreadSync()) return false;
    const next = readTombstoneSet();
    let marked = 0;
    for (const rawId of dossierIds) {
        const id = normalizeExecutionStorageId(String(rawId ?? ''));
        if (id && id !== 'default') {
            next.add(id);
            marked++;
        }
    }
    if (!marked) return false;
    return writeTombstoneSet(next);
}

export function listExecutionDossierTombstoneIds(): string[] {
    return [...readTombstoneSet()];
}
