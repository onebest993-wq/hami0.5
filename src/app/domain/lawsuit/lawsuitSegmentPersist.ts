/**
 * كتابة/قراءة مقاطع الدعوى — ورقة بلا اعتماد على بوابة المتانة.
 * البوابة تستورد من هنا لا من `lawsuitSegmentStorage` حتى لا تُغلق دائرة تهيئة
 * (Gate → Storage → Gate) وقت الإقلاع.
 */
import type { FileData } from './lawsuitFileTypes';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import { ENCRYPT_MAX_BYTES } from '@/app/services/secureStorageKeys';
import { saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_ARCHIVED_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
    LAWSUIT_FILES_TRASH_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import { scheduleLawsuitWorkspaceCommit } from '@/app/domain/lawsuit/lawsuitPersistFlush';
import { type LawsuitLifecycleIndex } from './lawsuitLifecycleIndex';
import {
    isPoorerLawsuitActiveList,
    mergeRicherLawsuitActive,
    parseLawsuitActiveFiles,
} from './lawsuitActiveDurability';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

/** DEV: مقطع واحد ما زال فوق حدّ التشفير رغم التقسيم active/archived/trash */
export function warnIfLawsuitSegmentExceedsEncryptLimit(key: string, serialized: string): void {
    if (serialized.length <= ENCRYPT_MAX_BYTES) return;
    if (!import.meta.env.DEV) return;
    console.warn(
        `[lawsuitSegment] segment exceeds ENCRYPT_MAX_BYTES: key=${key} len=${serialized.length} limit=${ENCRYPT_MAX_BYTES} overBy=${serialized.length - ENCRYPT_MAX_BYTES}`,
    );
}

export function readLawsuitJsonArray(key: string): unknown[] | null {
    try {
        const raw = readSecureOrDrainLegacySync(key);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function isLawsuitSegmentArrayKey(key: string): boolean {
    return (
        key === LAWSUIT_FILES_ACTIVE_KEY ||
        key === LAWSUIT_FILES_ARCHIVED_KEY ||
        key === LAWSUIT_FILES_TRASH_KEY
    );
}

function writeJsonArray(
    key: string,
    payload: unknown[],
    options?: { allowVerifiedEmpty?: boolean; allowShrink?: boolean },
): boolean {
    /*
     * متانة المقطع: لا تستبدل قائمة أغنى بقائمة أفقر إلا بتصريح (أرشفة/سلة/نقل).
     */
    let nextPayload = payload;
    if (isLawsuitSegmentArrayKey(key) && !options?.allowVerifiedEmpty && !options?.allowShrink) {
        const existing = parseLawsuitActiveFiles(readSecureOrDrainLegacySync(key));
        const proposed = (Array.isArray(payload) ? payload : []) as FileData[];
        if (isPoorerLawsuitActiveList(proposed, existing)) {
            nextPayload = mergeRicherLawsuitActive(proposed, existing);
        }
    }

    if (SecureStoreService.isUnreadSync(key)) {
        /*
         * لا تستبدل مشفّراً بارداً بأي قائمة قبل فك التشفير —
         * كان مسار إنشاء الدعوى يمسح الخزنة بهذا الباب.
         */
        return false;
    }
    const serialized = JSON.stringify(nextPayload);
    warnIfLawsuitSegmentExceedsEncryptLimit(key, serialized);
    /*
     * setItemSync قد يرفض المسح الفارغ — تجاهل الرفض سابقاً كان يمرّر []
     * إلى persistenceRepository ويُفرّغ المرآة/المقاطع من باب خلفي.
     */
    const accepted = SecureStoreService.setItemSync(key, serialized, {
        allowVerifiedEmptyOverwrite: Boolean(options?.allowVerifiedEmpty),
        allowShrink: Boolean(options?.allowShrink),
    });
    if (accepted === false) {
        if (options?.allowVerifiedEmpty && nextPayload.length === 0) {
            SecureStoreService.applyVerifiedEmptyOverwrite(key, serialized);
            clearLegacyPlaintextMirror(key);
            try {
                persistenceRepository.save(key, nextPayload);
                persistenceRepository.flushPending(key);
            } catch {
                /* tests may mock persistence */
            }
            try {
                scheduleLawsuitWorkspaceCommit();
            } catch {
                /* ignore scheduler */
            }
            return true;
        }
        return false;
    }
    clearLegacyPlaintextMirror(key);
    try {
        persistenceRepository.save(key, nextPayload);
        persistenceRepository.flushPending(key);
    } catch {
        /* tests may mock persistence */
    }
    try {
        scheduleLawsuitWorkspaceCommit();
    } catch {
        /* ignore scheduler */
    }
    return true;
}

export function persistLawsuitActiveSegment(
    files: FileData[],
    options?: { allowVerifiedEmpty?: boolean; allowShrink?: boolean },
): boolean {
    return writeJsonArray(LAWSUIT_FILES_ACTIVE_KEY, files, options);
}

export function readLawsuitActiveSegment(): FileData[] {
    const fromKey = readLawsuitJsonArray(LAWSUIT_FILES_ACTIVE_KEY);
    if (fromKey !== null) return fromKey as FileData[];
    return [];
}

export function readLawsuitArchivedSegment(): FileData[] {
    const fromKey = readLawsuitJsonArray(LAWSUIT_FILES_ARCHIVED_KEY);
    if (fromKey !== null) return fromKey as FileData[];
    return [];
}

export function readLawsuitTrashSegment(): FileData[] {
    const fromKey = readLawsuitJsonArray(LAWSUIT_FILES_TRASH_KEY);
    if (fromKey !== null) return fromKey as FileData[];
    return [];
}

export function readLawsuitLifecycleIndex(): LawsuitLifecycleIndex | null {
    try {
        const raw = readSecureOrDrainLegacySync(LAWSUIT_FILES_INDEX_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const obj = parsed as LawsuitLifecycleIndex;
        if (obj.v !== 1 || !obj.entries || !obj.counts) return null;
        return obj;
    } catch {
        return null;
    }
}

export function persistLawsuitArchivedSegment(
    files: FileData[],
    options?: { allowVerifiedEmpty?: boolean; allowShrink?: boolean },
): void {
    writeJsonArray(LAWSUIT_FILES_ARCHIVED_KEY, files, options);
}

export function persistLawsuitTrashSegment(
    files: FileData[],
    options?: { allowVerifiedEmpty?: boolean; allowShrink?: boolean },
): void {
    writeJsonArray(LAWSUIT_FILES_TRASH_KEY, files, options);
}

export function persistLawsuitLifecycleIndex(index: LawsuitLifecycleIndex): void {
    const total = index.counts.active + index.counts.archived + index.counts.trash;
    if (
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY) ||
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_STORAGE_KEY)
    ) {
        return;
    }
    if (total === 0 && SecureStoreService.isUnreadSync(LAWSUIT_FILES_INDEX_KEY)) {
        return;
    }
    const serialized = JSON.stringify(index);
    SecureStoreService.setItemSync(LAWSUIT_FILES_INDEX_KEY, serialized);
    clearLegacyPlaintextMirror(LAWSUIT_FILES_INDEX_KEY);
    try {
        persistenceRepository.save(LAWSUIT_FILES_INDEX_KEY, index);
        persistenceRepository.flushPending(LAWSUIT_FILES_INDEX_KEY);
    } catch {
        /* tests may mock persistence */
    }
    scheduleLawsuitWorkspaceCommit();
}

/** مرآة monolithic لتوافق cloud sync والمسارات القديمة */
export function syncLawsuitMonolithicMirror(
    active: FileData[],
    archived: FileData[],
    trash: FileData[],
): void {
    const merged = [...active, ...archived, ...trash];
    warnIfLawsuitSegmentExceedsEncryptLimit(
        'lawyer_files',
        JSON.stringify(merged),
    );
    saveLawsuitFilesRaw(merged as unknown[]);
}

/**
 * عند المقاطع الكسولة (`null`) اقرأ من القرص قبل بناء المرآة —
 * لا تستخدم `?? []` وإلا تُمسَح archived/trash من `lawyer_files`.
 */
export function resolveLazyLawsuitSegmentForMirror(
    lazy: FileData[] | null | undefined,
    readFromDisk: () => FileData[],
): FileData[] {
    if (lazy !== null && lazy !== undefined) return lazy;
    return readFromDisk();
}

/** مرآة آمنة: تُحلّ المقاطع الكسولة ثم تُزامن المرآة monolithic */
export function mirrorLawsuitSegmentsSafe(
    active: FileData[],
    archived: FileData[] | null | undefined,
    trash: FileData[] | null | undefined,
): void {
    if (SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY)) {
        return;
    }
    /*
     * مقطع كسول غير مقروء ≠ قائمة فارغة. دمج النشطة فقط في lawyer_files
     * يحذف الأرشيف/السلة من المرآة، والحارس لا يرفض إلا التفريغ الكامل.
     */
    if (
        (archived === null || archived === undefined) &&
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_ARCHIVED_KEY)
    ) {
        return;
    }
    if (
        (trash === null || trash === undefined) &&
        SecureStoreService.isUnreadSync(LAWSUIT_FILES_TRASH_KEY)
    ) {
        return;
    }
    syncLawsuitMonolithicMirror(
        active,
        resolveLazyLawsuitSegmentForMirror(archived, readLawsuitArchivedSegment),
        resolveLazyLawsuitSegmentForMirror(trash, readLawsuitTrashSegment),
    );
}
