/**
 * نقطة حفظ مشفّرة لآخر مزامنة عمل ناجحة (دعاوى / تنفيذ / ملاحظات).
 * ليست سجل إصدارات متعدد — آخر 3 نقاط على الخادم. بدون واجهة جديدة.
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

const CHECKPOINT_PATH = '/api/work-checkpoints';
/*
 * سقف الخادم 1.8M محرف على النص المشفّر، وbase64 يتضخّم ×4/3 على البايتات.
 * القياس بالبايتات إلزامي: المحرف العربي بايتان في UTF-8، فحسابه كمحرف واحد
 * كان يمرّر حِزماً ترفضها الـ BFF بـ 400 فتفشل النقطة صامتةً.
 */
const MAX_PLAINTEXT_BYTES = 1_300_000;
const DEBOUNCE_MS = 4_000;

export type WorkCloudCheckpointPayload = {
    v: 1;
    savedAt: string;
    lawsuits: unknown[];
    execution: unknown[];
    notes: unknown[];
};

export type RestoreWorkCheckpointResult = {
    applied: boolean;
    lawsuits: number;
    execution: number;
    notes: number;
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
    if (signature) {
        const intact = await CryptoService.verifyDataSignature(encryptedData, signature);
        if (!intact) return null;
    }
    const json = await CryptoService.decryptData(encryptedData);
    try {
        return JSON.parse(json) as unknown;
    } catch {
        return null;
    }
}

export async function collectWorkCloudCheckpointPayload(): Promise<WorkCloudCheckpointPayload | null> {
    let lawsuits: unknown[] = [];
    try {
        const { collectLawsuitLocalRowsForSync } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        lawsuits = collectLawsuitLocalRowsForSync();
    } catch {
        lawsuits = asArray(await persistenceRepository.loadAsync(STORAGE_KEYS.LAWYER_FILES));
    }

    const executionKey = resolveExecutionFilesStorageKey(resolveLiveAuthUserIdForStorage());
    const execution = asArray(await persistenceRepository.loadAsync(executionKey));
    const notes = asArray(await persistenceRepository.loadAsync(STORAGE_KEYS.LAWYER_NOTES));

    if (lawsuits.length === 0 && execution.length === 0 && notes.length === 0) {
        return null;
    }
    return {
        v: 1,
        savedAt: new Date().toISOString(),
        lawsuits,
        execution,
        notes,
    };
}

export function parseWorkCloudCheckpointPayload(raw: unknown): WorkCloudCheckpointPayload | null {
    if (!isRecord(raw) || raw.v !== 1) return null;
    return {
        v: 1,
        savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
        lawsuits: asArray(raw.lawsuits),
        execution: asArray(raw.execution),
        notes: asArray(raw.notes),
    };
}

export async function pushWorkCloudCheckpointNow(): Promise<boolean> {
    if (!isLawyerWorkCloudLive()) return false;
    if (
        !isLiveCloudSyncBucketEnabled('files') &&
        !isLiveCloudSyncBucketEnabled('execution') &&
        !isLiveCloudSyncBucketEnabled('notes')
    ) {
        return false;
    }
    cancelScheduledWorkCloudCheckpoint();
    const payload = await collectWorkCloudCheckpointPayload();
    if (!payload) return false;
    if (utf8ByteLength(JSON.stringify(payload)) > MAX_PLAINTEXT_BYTES) return false;
    try {
        const sealed = await encryptJsonPayload(payload);
        const res = await SecureAPIClient.fetchSecure<{ ok?: boolean }>(CHECKPOINT_PATH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sealed),
        });
        return res?.ok === true;
    } catch {
        return false;
    }
}

export function scheduleWorkCloudCheckpoint(): void {
    if (typeof window === 'undefined') return;
    if (typeof process !== 'undefined' && process.env.VITEST) return;
    if (!isLawyerWorkCloudLive()) return;
    cancelScheduledWorkCloudCheckpoint();
    checkpointTimer = setTimeout(() => {
        checkpointTimer = null;
        void pushWorkCloudCheckpointNow();
    }, DEBOUNCE_MS);
}

async function applyWorkCloudCheckpointPayload(
    payload: WorkCloudCheckpointPayload,
): Promise<RestoreWorkCheckpointResult> {
    const lawsuits = payload.lawsuits;
    const execution = payload.execution;
    const notes = payload.notes;
    const restoredKeys: string[] = [];
    if (lawsuits.length > 0) {
        const { applyLawsuitMonolithicMergeToSegments } = await import(
            '@/app/domain/lawsuit/lawsuitSegmentStorage'
        );
        applyLawsuitMonolithicMergeToSegments(lawsuits as FileData[]);
        persistenceRepository.save(STORAGE_KEYS.LAWYER_FILES, lawsuits);
        restoredKeys.push(STORAGE_KEYS.LAWYER_FILES);
    }
    if (execution.length > 0) {
        const executionKey = resolveExecutionFilesStorageKey(resolveLiveAuthUserIdForStorage());
        saveExecutionFilesRawImmediate(execution);
        persistenceRepository.save(executionKey, execution);
        restoredKeys.push(executionKey);
    }
    if (notes.length > 0) {
        persistenceRepository.save(STORAGE_KEYS.LAWYER_NOTES, notes);
        restoredKeys.push(STORAGE_KEYS.LAWYER_NOTES);
    }
    if (typeof window !== 'undefined' && restoredKeys.length > 0) {
        window.dispatchEvent(
            new CustomEvent('hami:data-imported', {
                detail: { keys: restoredKeys },
            }),
        );
    }
    return {
        applied: lawsuits.length > 0 || execution.length > 0 || notes.length > 0,
        lawsuits: lawsuits.length,
        execution: execution.length,
        notes: notes.length,
    };
}

export async function restoreLastWorkCloudCheckpoint(options?: {
    onlyIfLocalEmpty?: boolean;
}): Promise<RestoreWorkCheckpointResult> {
    const empty: RestoreWorkCheckpointResult = { applied: false, lawsuits: 0, execution: 0, notes: 0 };
    if (!isLawyerWorkCloudLive()) return empty;
    if (options?.onlyIfLocalEmpty) {
        const current = await collectWorkCloudCheckpointPayload();
        if (current) return empty;
    }
    try {
        const res = await SecureAPIClient.fetchSecure<{
            ok?: boolean;
            checkpoint?: {
                encrypted_data?: string;
                data_signature?: string;
            } | null;
        }>(CHECKPOINT_PATH, { method: 'GET' });
        const cipher = res?.checkpoint?.encrypted_data;
        if (!res?.ok || typeof cipher !== 'string' || !cipher.trim()) return empty;
        const plain = await decryptJsonPayload(cipher, res.checkpoint?.data_signature);
        const payload = parseWorkCloudCheckpointPayload(plain);
        if (!payload) return empty;
        return applyWorkCloudCheckpointPayload(payload);
    } catch {
        return empty;
    }
}
