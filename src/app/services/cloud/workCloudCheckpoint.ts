/**
 * نقطة حفظ مشفّرة لآخر مزامنة عمل ناجحة (دعاوى / تنفيذ / ملاحظات / تقويم).
 * التقويم داخل الحزمة المشفّرة فقط — ليس مفتاح KV. بدون واجهة جديدة.
 */
import { CryptoService } from '@/app/services/CryptoService';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';
import { isLiveCloudSyncBucketEnabled } from '@/app/services/settings/cloudSyncBucket';
import {
    saveExecutionFilesRawImmediate,
    resolveExecutionFilesStorageKey,
} from '@/app/utils/executionFilesStorage';
import { resolveLiveAuthUserIdForStorage } from '@/app/utils/liveAuthUserId';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import { parseCalendarCheckpointSlice } from '@/app/services/cloud/workCloudCheckpointCalendar';
import { CALENDAR_EVENTS_STORAGE_KEY } from '@/app/services/calendar/calendarStorageKeys';
import {
    carryForwardOmittedSlices,
    composeRestorePayload,
    hasOmittedDossierSlices,
    payloadHasDossiers,
    stripCalendarFromCheckpoint,
    type OmittedDossierSlices,
} from '@/app/services/cloud/workCloudCheckpointHistory';

const CHECKPOINT_PATH = '/api/work-checkpoints';
/*
 * سقف الخادم 1.8M محرف على النص المشفّر، وbase64 يتضخّم ×4/3 على البايتات.
 * القياس بالبايتات إلزامي: المحرف العربي بايتان في UTF-8، فحسابه كمحرف واحد
 * كان يمرّر حِزماً ترفضها الـ BFF بـ 400 فتفشل النقطة صامتةً.
 */
const MAX_PLAINTEXT_BYTES = 1_300_000;
const MAX_CIPHER_CHARS = 1_800_000;
const DEBOUNCE_MS = 4_000;

export type WorkCloudCheckpointPayload = {
    v: 1;
    savedAt: string;
    lawsuits: unknown[];
    execution: unknown[];
    notes: unknown[];
    calendar: unknown[];
    calendarTombstones: Record<string, unknown>;
    /** true إن أُسقط التقويم لفيض الحجم — الاستعادة تأخذ التقويم من صف أقدم. */
    calendarOmittedForBudget: boolean;
    /** false لنقطة بناء قديم بلا حقل تقويم — ليست تفريغاً متعمّداً. */
    calendarSlicePresent: boolean;
};

export type RestoreWorkCheckpointResult = {
    applied: boolean;
    lawsuits: number;
    execution: number;
    notes: number;
    calendar: number;
    failed: boolean;
};

/** skipped = لا شيء للرفع. failed = أردنا الرفع ولم يكتمل. retryable = فشل نقل لا حجم. */
export type WorkCloudCheckpointPushResult = {
    pushed: boolean;
    skipped: boolean;
    failed: boolean;
    retryable: boolean;
};

const CHECKPOINT_PUSHED: WorkCloudCheckpointPushResult = {
    pushed: true,
    skipped: false,
    failed: false,
    retryable: false,
};
const CHECKPOINT_SKIPPED: WorkCloudCheckpointPushResult = {
    pushed: false,
    skipped: true,
    failed: false,
    retryable: false,
};
const CHECKPOINT_FAILED: WorkCloudCheckpointPushResult = {
    pushed: false,
    skipped: false,
    failed: true,
    retryable: true,
};
const CHECKPOINT_REJECTED: WorkCloudCheckpointPushResult = {
    pushed: false,
    skipped: false,
    failed: true,
    retryable: false,
};

function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function utf8ByteLength(value: string): number {
    try {
        return new TextEncoder().encode(value).length;
    } catch {
        /* تقدير محافظ: أسوأ حالة 3 بايتات للمحرف قبل الأزواج البديلة */
        return value.length * 3;
    }
}

let checkpointTimer: ReturnType<typeof setTimeout> | null = null;

/** إلغاء النقطة المؤجّلة — يمنع رفعاً مزدوجاً لنفس اللقطة بعد دفع فوري */
export function cancelScheduledWorkCloudCheckpoint(): void {
    if (checkpointTimer) clearTimeout(checkpointTimer);
    checkpointTimer = null;
}

async function encryptJsonPayload(payload: unknown): Promise<{ encrypted_data: string; data_signature: string }> {
    await CryptoService.initialize();
    const json = JSON.stringify(payload ?? null);
    const encrypted_data = await CryptoService.encryptData(json);
    const data_signature = await CryptoService.generateDataSignature(encrypted_data);
    return { encrypted_data, data_signature };
}

async function decryptJsonPayload(encryptedData: string, dataSignature?: string | null): Promise<unknown> {
    await CryptoService.initialize();
    const signature = String(dataSignature ?? '').trim();
    if (!signature) return null;
    const intact = await CryptoService.verifyDataSignature(encryptedData, signature);
    if (!intact) return null;
    const json = await CryptoService.decryptData(encryptedData);
    try {
        return JSON.parse(json) as unknown;
    } catch {
        return null;
    }
}

async function loadLocalLawsuits(): Promise<unknown[]> {
    try {
        const { collectLawsuitLocalRowsForSync } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        return collectLawsuitLocalRowsForSync();
    } catch {
        return asArray(await persistenceRepository.loadAsync(STORAGE_KEYS.LAWYER_FILES));
    }
}

async function loadLocalExecution(): Promise<unknown[]> {
    const executionKey = resolveExecutionFilesStorageKey(resolveLiveAuthUserIdForStorage());
    return asArray(await persistenceRepository.loadAsync(executionKey));
}

async function loadLocalNotes(): Promise<unknown[]> {
    return asArray(await persistenceRepository.loadAsync(STORAGE_KEYS.LAWYER_NOTES));
}

/** وجود إضابير على الجهاز — بلا تصفية سلال. التقويم لا يُحتسب. */
export async function hasLocalWorkDossiers(): Promise<boolean> {
    const [lawsuits, execution, notes] = await Promise.all([
        loadLocalLawsuits(),
        loadLocalExecution(),
        loadLocalNotes(),
    ]);
    return lawsuits.length > 0 || execution.length > 0 || notes.length > 0;
}

type CollectedCheckpoint = {
    payload: WorkCloudCheckpointPayload;
    omitted: OmittedDossierSlices;
};

async function collectCheckpointWithOmissions(): Promise<CollectedCheckpoint | null> {
    const includeFiles = isLiveCloudSyncBucketEnabled('files');
    const includeExecution = isLiveCloudSyncBucketEnabled('execution');
    const includeNotes = isLiveCloudSyncBucketEnabled('notes');

    const [lawsuits, execution, notes] = await Promise.all([
        includeFiles ? loadLocalLawsuits() : Promise.resolve([] as unknown[]),
        includeExecution ? loadLocalExecution() : Promise.resolve([] as unknown[]),
        includeNotes ? loadLocalNotes() : Promise.resolve([] as unknown[]),
    ]);

    let calendarSlice = { events: [] as unknown[], tombstones: {} as Record<string, unknown> };
    try {
        const { collectCalendarCheckpointSlice } = await import(
            '@/app/services/cloud/workCloudCheckpointCalendar'
        );
        calendarSlice = await collectCalendarCheckpointSlice();
    } catch {
        /* التقويم لا يمنع نقطة الإضابير */
    }

    if (
        lawsuits.length === 0 &&
        execution.length === 0 &&
        notes.length === 0 &&
        calendarSlice.events.length === 0 &&
        Object.keys(calendarSlice.tombstones).length === 0
    ) {
        return null;
    }
    return {
        payload: {
            v: 1,
            savedAt: new Date().toISOString(),
            lawsuits,
            execution,
            notes,
            calendar: calendarSlice.events,
            calendarTombstones: calendarSlice.tombstones,
            calendarOmittedForBudget: false,
            calendarSlicePresent: true,
        },
        omitted: {
            lawsuits: !includeFiles,
            execution: !includeExecution,
            notes: !includeNotes,
        },
    };
}

export function parseWorkCloudCheckpointPayload(raw: unknown): WorkCloudCheckpointPayload | null {
    if (!isRecord(raw) || raw.v !== 1) return null;
    const calendarSlice = parseCalendarCheckpointSlice(raw);
    return {
        v: 1,
        savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
        lawsuits: asArray(raw.lawsuits),
        execution: asArray(raw.execution),
        notes: asArray(raw.notes),
        calendar: calendarSlice.events,
        calendarTombstones: calendarSlice.tombstones,
        calendarOmittedForBudget: raw.calendarOmittedForBudget === true,
        calendarSlicePresent: 'calendar' in raw || 'calendarTombstones' in raw,
    };
}

type CheckpointBlob = {
    encrypted_data?: string;
    data_signature?: string;
};

function isCheckpointBlob(value: unknown): value is CheckpointBlob {
    if (!isRecord(value)) return false;
    return typeof value.encrypted_data === 'string' && value.encrypted_data.trim().length > 0;
}

type CheckpointHistoryRead =
    | { status: 'ok'; payloads: WorkCloudCheckpointPayload[] }
    | { status: 'absent' }
    | { status: 'unreadable' }
    | { status: 'unreachable' };

async function decryptCheckpointBlob(blob: CheckpointBlob): Promise<WorkCloudCheckpointPayload | null> {
    const cipher = blob.encrypted_data;
    if (typeof cipher !== 'string' || !cipher.trim()) return null;
    const plain = await decryptJsonPayload(cipher, blob.data_signature);
    if (plain == null) return null;
    return parseWorkCloudCheckpointPayload(plain);
}

async function readWorkCloudCheckpointHistory(
    scope: 'latest' | 'history' = 'history',
): Promise<CheckpointHistoryRead> {
    try {
        const res = await SecureAPIClient.fetchSecure<{
            ok?: boolean;
            checkpoint?: CheckpointBlob | null;
            checkpoints?: unknown;
        }>(CHECKPOINT_PATH, { method: 'GET' });
        if (!res?.ok) return { status: 'unreachable' };
        const listed = Array.isArray(res.checkpoints) ? res.checkpoints.filter(isCheckpointBlob) : [];
        const blobs =
            listed.length > 0
                ? listed
                : isCheckpointBlob(res.checkpoint)
                  ? [res.checkpoint]
                  : [];
        if (blobs.length === 0) return { status: 'absent' };
        const toDecrypt = scope === 'latest' ? blobs.slice(0, 1) : blobs;
        const payloads: WorkCloudCheckpointPayload[] = [];
        for (const blob of toDecrypt) {
            const payload = await decryptCheckpointBlob(blob);
            if (payload) payloads.push(payload);
        }
        if (payloads.length === 0) return { status: 'unreadable' };
        return { status: 'ok', payloads };
    } catch {
        return { status: 'unreachable' };
    }
}

function checkpointPlaintextBytes(payload: WorkCloudCheckpointPayload): number {
    return utf8ByteLength(JSON.stringify(payload));
}

async function encryptWithinCipherBudget(
    toSend: WorkCloudCheckpointPayload,
): Promise<{ encrypted_data: string; data_signature: string; keep_anchor: boolean } | null> {
    let sealed = await encryptJsonPayload(toSend);
    if (sealed.encrypted_data.length <= MAX_CIPHER_CHARS) {
        return { ...sealed, keep_anchor: toSend.calendarOmittedForBudget !== true };
    }
    const stripped = stripCalendarFromCheckpoint(toSend);
    if (!payloadHasDossiers(stripped)) return null;
    sealed = await encryptJsonPayload(stripped);
    if (sealed.encrypted_data.length > MAX_CIPHER_CHARS) return null;
    return { ...sealed, keep_anchor: false };
}

export async function pushWorkCloudCheckpointNow(): Promise<WorkCloudCheckpointPushResult> {
    if (!isLawyerWorkCloudLive()) return CHECKPOINT_SKIPPED;
    cancelScheduledWorkCloudCheckpoint();
    const collected = await collectCheckpointWithOmissions();
    if (!collected) return CHECKPOINT_SKIPPED;
    let toSend = collected.payload;
    if (hasOmittedDossierSlices(collected.omitted)) {
        const previous = await readWorkCloudCheckpointHistory('latest');
        if (previous.status === 'unreachable') return CHECKPOINT_FAILED;
        if (previous.status === 'ok') {
            const latest = previous.payloads[0];
            if (latest) toSend = carryForwardOmittedSlices(toSend, latest, collected.omitted);
        }
    }
    if (checkpointPlaintextBytes(toSend) > MAX_PLAINTEXT_BYTES) {
        toSend = stripCalendarFromCheckpoint(toSend);
        if (checkpointPlaintextBytes(toSend) > MAX_PLAINTEXT_BYTES) return CHECKPOINT_REJECTED;
        if (!payloadHasDossiers(toSend)) return CHECKPOINT_REJECTED;
    }
    try {
        const sealed = await encryptWithinCipherBudget(toSend);
        if (!sealed) return CHECKPOINT_REJECTED;
        const res = await SecureAPIClient.fetchSecure<{ ok?: boolean }>(CHECKPOINT_PATH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                encrypted_data: sealed.encrypted_data,
                data_signature: sealed.data_signature,
                keep_anchor: sealed.keep_anchor,
            }),
        });
        return res?.ok === true ? CHECKPOINT_PUSHED : CHECKPOINT_FAILED;
    } catch {
        return CHECKPOINT_FAILED;
    }
}

/** دفع مؤجّل: محاولة ثانية صامتة إن فشلت الشبكة — بلا إعادة على فشل حجم حتمي. */
export async function pushWorkCloudCheckpointNowRetryingOnce(): Promise<WorkCloudCheckpointPushResult> {
    const first = await pushWorkCloudCheckpointNow();
    if (!first.failed || !first.retryable) return first;
    return pushWorkCloudCheckpointNow();
}

export function scheduleWorkCloudCheckpoint(): void {
    if (typeof window === 'undefined') return;
    if (typeof process !== 'undefined' && process.env.VITEST) return;
    if (!isLawyerWorkCloudLive()) return;
    cancelScheduledWorkCloudCheckpoint();
    checkpointTimer = setTimeout(() => {
        checkpointTimer = null;
        void pushWorkCloudCheckpointNowRetryingOnce();
    }, DEBOUNCE_MS);
}

async function applyWorkCloudCheckpointPayload(
    payload: WorkCloudCheckpointPayload,
): Promise<RestoreWorkCheckpointResult> {
    const lawsuits = payload.lawsuits;
    const execution = payload.execution;
    const notes = payload.notes;
    const calendar = payload.calendar;
    const restoredKeys: string[] = [];
    let lawsuitsApplied = 0;
    let executionApplied = 0;
    let notesApplied = 0;
    let calendarCount = 0;
    let calendarSliceApplied = false;

    if (lawsuits.length > 0) {
        try {
            const { applyLawsuitMonolithicMergeToSegments } = await import(
                '@/app/domain/lawsuit/lawsuitSegmentStorage'
            );
            const {
                ensureLawsuitDossierTombstonesReadable,
                excludeTombstonedLawsuitFiles,
            } = await import('@/app/utils/lawsuitDossierTombstones');
            await ensureLawsuitDossierTombstonesReadable();
            const stripped = excludeTombstonedLawsuitFiles(lawsuits as FileData[]);
            if (stripped.length > 0) {
                applyLawsuitMonolithicMergeToSegments(stripped);
                persistenceRepository.save(STORAGE_KEYS.LAWYER_FILES, stripped);
                restoredKeys.push(STORAGE_KEYS.LAWYER_FILES);
                lawsuitsApplied = stripped.length;
            }
        } catch {
            /* شريحة أخرى قد تنجح */
        }
    }
    if (execution.length > 0) {
        try {
            const executionKey = resolveExecutionFilesStorageKey(resolveLiveAuthUserIdForStorage());
            saveExecutionFilesRawImmediate(execution);
            persistenceRepository.save(executionKey, execution);
            restoredKeys.push(executionKey);
            executionApplied = execution.length;
        } catch {
            /* شريحة أخرى قد تنجح */
        }
    }
    if (notes.length > 0) {
        try {
            persistenceRepository.save(STORAGE_KEYS.LAWYER_NOTES, notes);
            restoredKeys.push(STORAGE_KEYS.LAWYER_NOTES);
            notesApplied = notes.length;
        } catch {
            /* شريحة أخرى قد تنجح */
        }
    }
    if (calendar.length > 0 || Object.keys(payload.calendarTombstones).length > 0) {
        try {
            const { applyCalendarCheckpointSlice } = await import(
                '@/app/services/cloud/workCloudCheckpointCalendar'
            );
            calendarCount = await applyCalendarCheckpointSlice({
                events: calendar,
                tombstones: payload.calendarTombstones,
            });
            restoredKeys.push(CALENDAR_EVENTS_STORAGE_KEY);
            calendarSliceApplied = true;
        } catch {
            /* التقويم لا يُلغي استعادة الإضابير التي كُتبت أعلاه */
        }
    }
    if (typeof window !== 'undefined' && restoredKeys.length > 0) {
        window.dispatchEvent(
            new CustomEvent('hami:data-imported', {
                detail: { keys: restoredKeys },
            }),
        );
    }
    return {
        applied:
            lawsuitsApplied > 0 ||
            executionApplied > 0 ||
            notesApplied > 0 ||
            calendarCount > 0 ||
            calendarSliceApplied,
        lawsuits: lawsuitsApplied,
        execution: executionApplied,
        notes: notesApplied,
        calendar: calendarCount,
        failed: false,
    };
}

function emptyRestore(failed = false): RestoreWorkCheckpointResult {
    return {
        applied: false,
        lawsuits: 0,
        execution: 0,
        notes: 0,
        calendar: 0,
        failed,
    };
}

export async function restoreLastWorkCloudCheckpoint(options?: {
    onlyIfLocalEmpty?: boolean;
}): Promise<RestoreWorkCheckpointResult> {
    if (!isLawyerWorkCloudLive()) return emptyRestore();
    if (options?.onlyIfLocalEmpty && (await hasLocalWorkDossiers())) return emptyRestore();
    const read = await readWorkCloudCheckpointHistory();
    if (read.status === 'absent') return emptyRestore();
    if (read.status !== 'ok') return emptyRestore(true);
    const payload = composeRestorePayload(read.payloads);
    if (!payload) return emptyRestore(true);
    try {
        return await applyWorkCloudCheckpointPayload(payload);
    } catch {
        return emptyRestore(true);
    }
}
