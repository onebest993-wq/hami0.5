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

/**
 * شاهد القبر هو الشيء الوحيد الذي يمنع عودة الإضبارة المحذوفة من السحابة.
 * فإن فشلت كتابته صامتةً، يبقى الحذف محلياً ثم تُعاد الإضبارة عند أول مزامنة.
 * لذلك نتحقق بقراءة مرتجعة ونُعيد النتيجة للمنادي بدل الكتم.
 *
 * حدّ معروف: القراءة المرتجعة تُثبت الإلزام في الذاكرة فقط — `setItemSync`
 * يُطلق الكتابة الدائمة بلا انتظار ولا إشارة فشل. إثبات الدوام يحتاج تعديل
 * `SecureStoreService` نفسه، وهو خارج نطاق دورة الحذف.
 */
function writeTombstoneSet(set: Set<string>): boolean {
    const key = resolveTombstonesKey();
    const payload = JSON.stringify([...set]);
    try {
        SecureStoreService.setItemSync(key, payload);
    } catch {
        return false;
    }
    // setItemSync قد يعود صامتاً (رفض الكتابة الفارغة) — لا نثق إلا بالقراءة
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
    const next = readTombstoneSet();
    next.add(id);
    return writeTombstoneSet(next);
}

/** @returns false إن لم يُلزَم الشاهد — الإضابير معرّضة للعودة من السحابة */
export function markExecutionDossierTombstones(dossierIds: Iterable<string | number>): boolean {
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
