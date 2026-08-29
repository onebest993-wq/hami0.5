import type { FileData } from './lawsuitFileTypes';
import { mergeRicherLawsuitActive } from '@/app/domain/lawsuit/lawsuitActiveDurability';
import { awaitLawsuitWorkspaceCommit } from '@/app/domain/lawsuit/lawsuitPersistFlush';
import SecureStoreService from '@/app/services/SecureStoreService';
import { LAWSUIT_FILES_ACTIVE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
import { markLawsuitJournaledThisPage } from '@/app/domain/lawsuit/lawsuitPageWriteGuard';
import {
    clearSecureJsonValue,
    readSecureJsonRawSync,
    writeSecureJsonValue,
} from '@/app/services/storage/syncSecureJson';

/**
 * سجل كتابة append-only — مشفّر في SecureStore (نسخ FileData: أسماء وأرقام دعاوى).
 * ليس في قشرة الإقلاع ولا PROTECTED_WARM (الحمولة قد تكون ثقيلة).
 * `flushLawsuitJournalToActive` يفكّ المفتاح إن كان بارداً ثم يدمج.
 * يُمسح فقط بعد إثبات القرص.
 */
export const LAWSUIT_WRITE_JOURNAL_KEY = 'hami_lawsuit_write_journal_v1';

const JOURNAL_CAP = 80;

export type LawsuitWriteJournalEntry = {
    v: 1;
    fileId: string;
    file: FileData;
    ts: number;
};

function parseEntries(raw: string | null): LawsuitWriteJournalEntry[] {
    if (!raw?.trim()) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (row): row is LawsuitWriteJournalEntry =>
                !!row &&
                typeof row === 'object' &&
                (row as LawsuitWriteJournalEntry).v === 1 &&
                typeof (row as LawsuitWriteJournalEntry).fileId === 'string' &&
                !!(row as LawsuitWriteJournalEntry).file,
        );
    } catch {
        return [];
    }
}

function readRaw(): LawsuitWriteJournalEntry[] {
    return parseEntries(readSecureJsonRawSync(LAWSUIT_WRITE_JOURNAL_KEY));
}

function writeRaw(entries: LawsuitWriteJournalEntry[]): void {
    if (entries.length === 0) {
        if (SecureStoreService.isUnreadSync(LAWSUIT_WRITE_JOURNAL_KEY)) return;
        clearSecureJsonValue(LAWSUIT_WRITE_JOURNAL_KEY);
        return;
    }
    writeSecureJsonValue(LAWSUIT_WRITE_JOURNAL_KEY, entries);
}

export function clearLawsuitWriteJournalForTests(): void {
    clearSecureJsonValue(LAWSUIT_WRITE_JOURNAL_KEY);
}

export async function settleLawsuitJournalPersist(): Promise<void> {
    await SecureStoreService.waitForPendingSetItem(LAWSUIT_WRITE_JOURNAL_KEY);
}

export function listLawsuitJournalEntries(): LawsuitWriteJournalEntry[] {
    return readRaw();
}

export function hasUnverifiedLawsuitJournal(): boolean {
    return readRaw().length > 0;
}

export function isLawsuitJournalStillOpen(fileId: string | number): boolean {
    const id = String(fileId);
    return readRaw().some((entry) => entry.fileId === id);
}

/** تسجيل محاولة كتابة قبل active segment — WAL */
export function stageLawsuitJournalRecords(files: readonly FileData[]): void {
    if (!files.length) return;
    const byId = new Map(readRaw().map((entry) => [entry.fileId, entry]));
    const ts = Date.now();
    for (const file of files) {
        const fileId = String(file.id ?? '');
        if (!fileId) continue;
        markLawsuitJournaledThisPage(fileId);
        byId.set(fileId, { v: 1, fileId, file, ts });
    }
    writeRaw(Array.from(byId.values()).slice(-JOURNAL_CAP));
}

export function mergeLawsuitJournalInto(active: FileData[]): FileData[] {
    const entries = readRaw();
    if (entries.length === 0) return active;
    return mergeRicherLawsuitActive(
        active,
        entries.map((entry) => entry.file),
    );
}

export function pruneLawsuitJournalForFileIds(fileIds: readonly (string | number)[]): void {
    const ids = new Set(fileIds.map(String));
    if (ids.size === 0) return;
    writeRaw(readRaw().filter((entry) => !ids.has(entry.fileId)));
}

/**
 * بعد تسخين المفاتيح: ادمج السجل في النشط وثبّت القرص.
 * يُمسح السجل فقط بعد تحقق القرص.
 */
export async function flushLawsuitJournalToActive(): Promise<number> {
    if (SecureStoreService.isUnreadSync(LAWSUIT_WRITE_JOURNAL_KEY)) {
        await SecureStoreService.getItem(LAWSUIT_WRITE_JOURNAL_KEY);
    }
    const entries = readRaw();
    if (entries.length === 0) return 0;
    if (SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY)) return 0;

    const {
        loadLawsuitBootSegments,
        persistLawsuitFiles,
    } = await import('@/app/domain/lawsuit/lawsuitFilesRepository');
    const boot = loadLawsuitBootSegments().active;
    const merged = mergeLawsuitJournalInto(boot);
    persistLawsuitFiles(merged);

    /* ديناميكي: كسر دائرة Journal → Verify → Journal عند تهيئة الوحدة */
    const { tryFinalizeLawsuitJournalAfterProof } = await import(
        '@/app/domain/lawsuit/lawsuitDurabilityVerify'
    );
    let cleared = 0;
    for (const entry of entries) {
        const commit = await awaitLawsuitWorkspaceCommit({
            timeoutMs: 8_000,
            requireActiveFileId: entry.fileId,
        });
        const didClear = await tryFinalizeLawsuitJournalAfterProof(entry.fileId, commit);
        if (didClear) cleared += 1;
    }
    return cleared;
}
