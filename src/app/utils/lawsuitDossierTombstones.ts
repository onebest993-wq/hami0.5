import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

export const LAWSUIT_DOSSIER_TOMBSTONES_KEY = 'hami:lawsuit:dossier-tombstones:v1';

function readTombstoneSet(): Set<string> {
    try {
        const raw = readSecureOrDrainLegacySync(LAWSUIT_DOSSIER_TOMBSTONES_KEY);
        if (!raw?.trim()) return new Set();
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(
            parsed
                .map((id) => String(id ?? '').trim())
                .filter(Boolean),
        );
    } catch {
        return new Set();
    }
}

function writeTombstoneSet(set: Set<string>): boolean {
    const payload = JSON.stringify([...set]);
    try {
        SecureStoreService.setItemSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY, payload);
    } catch {
        return false;
    }
    clearLegacyPlaintextMirror(LAWSUIT_DOSSIER_TOMBSTONES_KEY);
    return SecureStoreService.getItemSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY) === payload;
}

/** أصل مشفّر لم يُفكّ ≠ قائمة فارغة. دمج السحابة عندها يُعيد المحذوف. */
export function areLawsuitDossierTombstonesUnreadSync(): boolean {
    try {
        return SecureStoreService.isUnreadSync(LAWSUIT_DOSSIER_TOMBSTONES_KEY);
    } catch {
        return false;
    }
}

/** يفكّ شاهد الدعاوى فقط. false = لا تدمج السحابة. */
export async function ensureLawsuitDossierTombstonesReadable(): Promise<boolean> {
    if (!areLawsuitDossierTombstonesUnreadSync()) return true;
    try {
        await SecureStoreService.getItem(LAWSUIT_DOSSIER_TOMBSTONES_KEY);
    } catch {
        /* يبقى unread */
    }
    return !areLawsuitDossierTombstonesUnreadSync();
}

function isLawsuitDossierTombstoned(dossierId: string | number | undefined): boolean {
    const id = String(dossierId ?? '').trim();
    if (!id) return false;
    return readTombstoneSet().has(id);
}

/** معرّفات الحذف النهائي — لاستبعادها من دمج المقاطع بعد التحميل/المزامنة */
export function readLawsuitDossierTombstoneIds(): Set<string> {
    return readTombstoneSet();
}

export function markLawsuitDossierTombstone(dossierId: string | number | undefined): boolean {
    const id = String(dossierId ?? '').trim();
    if (!id) return false;
    /*
     * unread ≠ قائمة فارغة. كتابة ["id"] فوق ciphertext بارد تمسح شواهد سابقة
     * فتعود إضابير محذوفة من السحابة. ارفض حتى يُفكّ المفتاح.
     */
    if (areLawsuitDossierTombstonesUnreadSync()) return false;
    const next = readTombstoneSet();
    next.add(id);
    return writeTombstoneSet(next);
}

/** إزالة شاهد بعد استعادة مقصودة من السلة/الأرشيف */
export function clearLawsuitDossierTombstone(dossierId: string | number | undefined): boolean {
    const id = String(dossierId ?? '').trim();
    if (!id) return false;
    if (areLawsuitDossierTombstonesUnreadSync()) return false;
    const next = readTombstoneSet();
    if (!next.has(id)) return true;
    next.delete(id);
    return writeTombstoneSet(next);
}

export function excludeTombstonedLawsuitFiles<T extends { id?: string | number }>(
    rows: readonly T[] | null | undefined,
): T[] {
    if (!rows || rows.length === 0) return rows ? [...rows] : [];
    const tombstoned = readTombstoneSet();
    if (tombstoned.size === 0) return [...rows];
    return rows.filter((row) => {
        const id = String(row?.id ?? '').trim();
        return !id || !tombstoned.has(id);
    });
}

/**
 * مسار الحذف النهائي. `mark` المتزامن يرفض فوق مفتاح مشفّر لم يُفكّ، فيبقى الحذف
 * بلا شاهد وتعود الإضبارة عند أول مزامنة. هنا نفكّ المفتاح ثم نُعيد المحاولة،
 * ولا نُرجع false إلا إن تعذّر الفكّ فعلاً.
 */
export async function commitLawsuitDossierTombstone(
    dossierId: string | number | undefined,
): Promise<boolean> {
    if (markLawsuitDossierTombstone(dossierId)) return true;
    if (!(await ensureLawsuitDossierTombstonesReadable())) return false;
    return markLawsuitDossierTombstone(dossierId);
}

export function filterTombstonedLawsuitSyncRows(rows: unknown): unknown[] {
    if (!Array.isArray(rows)) return [];
    return rows.filter((row) => {
        if (!row || typeof row !== 'object') return false;
        const id = (row as { id?: string | number }).id;
        if (id === undefined || id === null) return false;
        return !isLawsuitDossierTombstoned(id);
    });
}
