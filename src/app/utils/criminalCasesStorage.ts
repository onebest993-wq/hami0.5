// @ts-nocheck
import SecureStoreService from '@/app/services/SecureStoreService';

export const CRIMINAL_STORE_KEY = 'hami:criminal:store';

async function readCasesRootAsync(): Promise<{
    parsed: Record<string, unknown>;
    casesById: Record<string, unknown>;
} | null> {
    try {
        await SecureStoreService.ensurePersistedReady();
        const raw = await SecureStoreService.getItem(CRIMINAL_STORE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const root = parsed as Record<string, unknown>;
        const casesById = (root.state as { casesById?: unknown } | undefined)?.casesById ?? root.casesById;
        if (!casesById || typeof casesById !== 'object') return null;
        return { parsed: root, casesById: casesById as Record<string, unknown> };
    } catch {
        return null;
    }
}

function readCasesRoot(): {
    parsed: Record<string, unknown>;
    casesById: Record<string, unknown>;
} | null {
    try {
        const raw = SecureStoreService.getItemSync(CRIMINAL_STORE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const root = parsed as Record<string, unknown>;
        const casesById = (root.state as { casesById?: unknown } | undefined)?.casesById ?? root.casesById;
        if (!casesById || typeof casesById !== 'object') return null;
        return { parsed: root, casesById: casesById as Record<string, unknown> };
    } catch {
        return null;
    }
}

function writeCasesRoot(parsed: Record<string, unknown>, casesById: Record<string, unknown>): void {
    if (parsed.state && typeof parsed.state === 'object') {
        (parsed.state as Record<string, unknown>).casesById = casesById;
    } else {
        parsed.casesById = casesById;
    }
    SecureStoreService.setItemSync(CRIMINAL_STORE_KEY, JSON.stringify(parsed));
}

/** قراءة إضابير الجزائي من تخزين Zustand دون استيراد الـ Store (تجنّب دورات الاستيراد). */
export function loadCriminalCasesRaw(): Record<string, unknown>[] {
    const root = readCasesRoot();
    if (!root) return [];
    return Object.values(root.casesById);
}

/** قراءة آمنة بعد تحميل IndexedDB — للمزامنة عند بدء التشغيل. */
export async function loadCriminalCasesRawAsync(): Promise<Record<string, unknown>[]> {
    const root = await readCasesRootAsync();
    if (!root) return [];
    return Object.values(root.casesById);
}

/** تعديل إضبارة جزائية واحدة في التخزين (مزامنة عكسية من التقويم). */
export function patchCriminalCaseRecord(
    caseId: string,
    mutator: (caseRecord: Record<string, unknown>) => Record<string, unknown>,
): boolean {
    const root = readCasesRoot();
    if (!root) return false;
    const { parsed, casesById } = root;
    const key =
        Object.keys(casesById).find((k) => {
            const row = casesById[k];
            if (!row || typeof row !== 'object') return false;
            return String((row as { id?: unknown }).id ?? k) === String(caseId);
        }) ?? caseId;
    const current = casesById[key];
    if (!current || typeof current !== 'object') return false;
    casesById[key] = mutator({ ...(current as Record<string, unknown>) });
    try {
        writeCasesRoot(parsed, casesById);
        void SecureStoreService.setItem(CRIMINAL_STORE_KEY, JSON.stringify(parsed));
        try {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('hami:criminal-storage-patched', { detail: { caseId } }));
            }
        } catch {
            /* ignore */
        }
        return true;
    } catch {
        return false;
    }
}

export const CRIMINAL_STORAGE_PATCHED_EVENT = 'hami:criminal-storage-patched';
