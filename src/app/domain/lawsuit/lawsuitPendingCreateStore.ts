import type { FileData } from './lawsuitFileTypes';
import { awaitLawsuitWorkspaceCommit } from '@/app/domain/lawsuit/lawsuitPersistFlush';
import SecureStoreService from '@/app/services/SecureStoreService';
import { LAWSUIT_FILES_ACTIVE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
import { mergeRicherLawsuitActive } from '@/app/domain/lawsuit/lawsuitActiveDurability';
import { markLawsuitStagedThisPage } from '@/app/domain/lawsuit/lawsuitPageWriteGuard';
import {
    clearSecureJsonValue,
    readSecureJsonRawSync,
    writeSecureJsonValue,
} from '@/app/services/storage/syncSecureJson';

/**
 * مخزن إنشاء معلّق — مشفّر في SecureStore (نسخ FileData).
 * ليس في قشرة الإقلاع ولا PROTECTED_WARM. `flush` يفكّ المفتاح إن كان بارداً.
 * لا يُمسح إلا بعد تثبيت القرص (IndexedDB) — وإلا تختفي الإضبارة عند إعادة التحميل.
 */
export const LAWSUIT_PENDING_CREATES_KEY = 'hami_lawsuit_pending_creates_v1';

const PENDING_CAP = 40;

function parseFiles(raw: string | null): FileData[] {
    if (!raw?.trim()) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as FileData[]) : [];
    } catch {
        return [];
    }
}

function clearSessionLeftover(): void {
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.removeItem(LAWSUIT_PENDING_CREATES_KEY);
    } catch {
        /* ignore */
    }
}

function peekSessionLeftover(): FileData[] {
    if (typeof sessionStorage === 'undefined') return [];
    try {
        return parseFiles(sessionStorage.getItem(LAWSUIT_PENDING_CREATES_KEY));
    } catch {
        return [];
    }
}

function takeSessionLeftover(): FileData[] {
    const files = peekSessionLeftover();
    if (files.length > 0) clearSessionLeftover();
    return files;
}

function readRaw(): FileData[] {
    const unread = SecureStoreService.isUnreadSync(LAWSUIT_PENDING_CREATES_KEY);
    const fromSecure = parseFiles(readSecureJsonRawSync(LAWSUIT_PENDING_CREATES_KEY));
    const fromSession = unread ? peekSessionLeftover() : takeSessionLeftover();
    if (fromSession.length === 0) return fromSecure;
    const merged = mergeRicherLawsuitActive(fromSecure, fromSession);
    if (!unread && merged.length > 0) {
        writeSecureJsonValue(LAWSUIT_PENDING_CREATES_KEY, merged);
    }
    return merged;
}

function writeRaw(files: FileData[]): void {
    if (files.length === 0) {
        if (SecureStoreService.isUnreadSync(LAWSUIT_PENDING_CREATES_KEY)) return;
        clearSecureJsonValue(LAWSUIT_PENDING_CREATES_KEY);
        clearSessionLeftover();
        return;
    }
    writeSecureJsonValue(LAWSUIT_PENDING_CREATES_KEY, files);
    clearSessionLeftover();
}

export function clearLawsuitPendingCreatesForTests(): void {
    clearSecureJsonValue(LAWSUIT_PENDING_CREATES_KEY);
    clearSessionLeftover();
}

export async function settleLawsuitPendingPersist(): Promise<void> {
    await SecureStoreService.waitForPendingSetItem(LAWSUIT_PENDING_CREATES_KEY);
}

export function stagePendingLawsuitCreate(file: FileData): void {
    const id = String(file.id);
    markLawsuitStagedThisPage(id);
    const next = [file, ...readRaw().filter((f) => String(f.id) !== id)].slice(0, PENDING_CAP);
    try {
        writeRaw(next);
        if (listPendingLawsuitCreates().some((row) => String(row.id) === id)) return;
    } catch {
        /* fall through to lite */
    }
    const lite: FileData = {
        ...file,
        history: Array.isArray(file.history) ? file.history.slice(0, 8) : [],
        notes: [],
        images: [],
    };
    writeRaw([lite, ...readRaw().filter((f) => String(f.id) !== id)].slice(0, PENDING_CAP));
}

export function listPendingLawsuitCreates(): FileData[] {
    return readRaw();
}

export function clearPendingLawsuitCreate(fileId: string | number): void {
    const id = String(fileId);
    writeRaw(readRaw().filter((f) => String(f.id) !== id));
}

export function mergePendingLawsuitCreatesInto(active: FileData[]): FileData[] {
    const pending = readRaw();
    if (pending.length === 0) return active;
    return mergeRicherLawsuitActive(active, pending);
}

/**
 * بعد تسخين المفاتيح: ادمج المعلّق في المقطع النشط وثبّت القرص.
 * لا يُمسح المعلّق إلا بعد تحقق القرص — لا بعد ذاكرة sync.
 */
export async function flushPendingLawsuitCreatesToActive(): Promise<number> {
    if (SecureStoreService.isUnreadSync(LAWSUIT_PENDING_CREATES_KEY)) {
        await SecureStoreService.getItem(LAWSUIT_PENDING_CREATES_KEY);
    }
    const pending = readRaw();
    if (pending.length === 0) return 0;
    if (SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY)) return 0;

    const {
        loadLawsuitBootSegments,
        persistLawsuitFiles,
    } = await import('@/app/domain/lawsuit/lawsuitFilesRepository');
    const boot = loadLawsuitBootSegments().active;
    const merged = mergeRicherLawsuitActive(boot, pending);
    persistLawsuitFiles(merged);

    /* ديناميكي: كسر دائرة Pending → Verify → Pending عند تهيئة الوحدة */
    const { tryClearPendingLawsuitCreateAfterProof } = await import(
        '@/app/domain/lawsuit/lawsuitDurabilityVerify'
    );
    let cleared = 0;
    for (const row of pending) {
        const commit = await awaitLawsuitWorkspaceCommit({
            timeoutMs: 8_000,
            requireActiveFileId: row.id,
        });
        const didClear = await tryClearPendingLawsuitCreateAfterProof(row.id, commit);
        if (didClear) cleared += 1;
    }
    return cleared;
}
