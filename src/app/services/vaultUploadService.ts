import { uuidv4 } from '@/app/services/lawyer-cloud';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { inferDocType, inferTags } from '@/app/services/vault/vaultDocUtils';
import { isAllowedVaultImageMeta, sanitizeVaultPlainNote, sanitizeVaultPreviewUrl } from '@/app/services/vault/vaultPreviewUrlSafety';
import {
    isVaultImageFile,
    isVaultPdfFile,
    VAULT_MAX_FILE_SIZE,
} from '@/app/services/vault/vaultFileGuards';
import {
    buildVaultIdbPath,
    primeVaultBlobCache,
    putVaultBlob,
} from '@/app/services/vaultBlobStore';
import { mergeVaultDocsWarmCache, notifySmartVaultDocsUpdated } from '@/app/services/vault/vaultDocsWarmCache';
import { upsertVaultLocalIndexDocImmediate } from '@/app/services/vault/vaultLocalIndex';

export {
    VAULT_MAX_FILE_SIZE,
    isVaultImageFile,
    isVaultPdfFile,
    reportVaultPersistFailure,
    type VaultUploadKind,
} from '@/app/services/vault/vaultFileGuards';
export {
    downloadVaultDocToDevice,
    isVaultDocImage,
    isVaultDocLocal,
    isVaultDocPdf,
    resolveVaultDocBlob,
    resolveVaultDocForViewing,
    resolveVaultDocUrl,
    toVaultPdfViewerUrl,
    vaultDocStorageOwned,
    type VaultDocViewPayload,
    type VaultDocViewerKind,
} from '@/app/services/vault/vaultDocResolve';
export { resolveVaultMediaKind as resolveVaultDocViewerKind } from '@/app/services/vault/vaultDocUtils';

const SCAN_TAG = 'مسح ضوئي';

async function assertVaultPdfMagic(file: File): Promise<void> {
    const buf = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const head = Array.from(buf, (b) => String.fromCharCode(b)).join('');
    if (!head.includes('%PDF')) {
        throw new Error('نوع الملف غير مدعوم');
    }
}

export type VaultUploadResult = {
    storagePath: string;
    signedUrl: string | null;
    localOnly: boolean;
    persistTask: Promise<void>;
};

export type SaveVaultFileResult = {
    doc: SmartVaultDoc;
    localOnly: boolean;
    persistTask: Promise<void>;
};

function createVaultFilePreviewUrl(file: File): string | null {
    try {
        return URL.createObjectURL(file);
    } catch {
        return null;
    }
}

function normalizeVaultUploadFile(file: File): File {
    if (isVaultPdfFile(file) && file.type !== 'application/pdf') {
        return new File([file], file.name, { type: 'application/pdf' });
    }
    return file;
}


function scheduleVaultBlobPersist(
    persistTask: Promise<void>,
    fileLabel: string,
): Promise<void> {
    void persistTask.catch((err) => {
        console.error('[Vault] background blob persist failed', err, fileLabel);
    });
    return persistTask;
}

function stashLocalVaultBlob(
    userId: string,
    docId: string,
    file: File,
    previewUrl?: string | null,
): VaultUploadResult {
    const normalized = normalizeVaultUploadFile(file);
    const mimeType =
        normalized.type ||
        (isVaultImageFile(normalized)
            ? 'image/jpeg'
            : isVaultPdfFile(normalized)
              ? 'application/pdf'
              : 'application/octet-stream');
    primeVaultBlobCache(userId, docId, normalized);
    const persistTask = putVaultBlob(userId, docId, normalized, mimeType);
    return {
        storagePath: buildVaultIdbPath(userId, docId),
        signedUrl: previewUrl ?? createVaultFilePreviewUrl(normalized),
        localOnly: true,
        persistTask,
    };
}

/** حفظ محلي في IndexedDB — لا مسار سحابي احتياطي رغم الاسم التاريخي */
export function uploadVaultFileWithFallback(
    userId: string,
    file: File,
    options?: { fallbackDataUrl?: string; docId?: string },
): VaultUploadResult {
    const docId = options?.docId ?? uuidv4();

    if (file.size > VAULT_MAX_FILE_SIZE) {
        throw new Error('file too large');
    }

    const scanPreview = options?.fallbackDataUrl?.startsWith('data:image/')
        ? options.fallbackDataUrl
        : null;

    return stashLocalVaultBlob(userId, docId, file, scanPreview);
}

export type SaveVaultFileOptions = {
    title?: string;
    tags?: string[];
    aiSummary?: string | null;
    lawyerNote?: string | null;
    customCategory?: string | null;
    fileName?: string;
    roomId?: string | null;
};

export async function saveFileToVault(
    userId: string,
    file: File,
    options?: SaveVaultFileOptions,
): Promise<SaveVaultFileResult> {
    if (!userId.trim()) throw new Error('user required');
    if (file.size > VAULT_MAX_FILE_SIZE) throw new Error('file too large');
    if (!isVaultImageFile(file) && !isVaultPdfFile(file)) {
        throw new Error('نوع الملف غير مدعوم');
    }
    if (isVaultPdfFile(file)) {
        await assertVaultPdfMagic(file);
    }
    const normalized = normalizeVaultUploadFile(file);
    const docId = uuidv4();
    const uploadResult = uploadVaultFileWithFallback(userId, normalized, { docId });
    const title = options?.title ?? normalized.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    const doc: SmartVaultDoc = {
        id: docId,
        title,
        type: inferDocType(normalized.type || '', normalized.name),
        tags: options?.tags ?? inferTags(title),
        authorId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fileSize: normalized.size,
        fileName: options?.fileName ?? normalized.name,
        mimeType:
            normalized.type ||
            (isVaultImageFile(normalized)
                ? 'image/jpeg'
                : isVaultPdfFile(normalized)
                  ? 'application/pdf'
                  : 'application/octet-stream'),
        storagePath: uploadResult.storagePath,
        signedUrl: uploadResult.signedUrl,
        isProcessing: false,
        aiSummary: options?.aiSummary ?? null,
        lawyerNote: sanitizeVaultPlainNote(options?.lawyerNote),
        customCategory: options?.customCategory ?? null,
        boundDossierId: null,
    };

    upsertVaultLocalIndexDocImmediate(doc);
    mergeVaultDocsWarmCache(userId, [doc]);
    notifySmartVaultDocsUpdated(userId, [doc]);
    await SmartVaultDB.saveDoc(doc, userId);
    const persistTask = scheduleVaultBlobPersist(uploadResult.persistTask, normalized.name);
    void import('@/app/services/vault/scheduleVaultTextExtraction').then(({ scheduleVaultTextExtraction }) => {
        scheduleVaultTextExtraction(doc, persistTask);
    });
    return { doc, localOnly: uploadResult.localOnly, persistTask };
}

export async function blobFromScanImageSource(
    image: string | Blob,
): Promise<{ blob: Blob; fallbackDataUrl?: string }> {
    if (typeof Blob !== 'undefined' && image instanceof Blob) {
        if (image.size > VAULT_MAX_FILE_SIZE) throw new Error('file too large');
        if (!isAllowedVaultImageMeta(image.type || 'image/jpeg', 'scan.jpg')) {
            throw new Error('invalid scan source');
        }
        return { blob: image };
    }
    const source = String(image);
    if (source.startsWith('data:')) {
        if (!sanitizeVaultPreviewUrl(source)) throw new Error('invalid data url');
        const comma = source.indexOf(',');
        if (comma < 0) throw new Error('invalid data url');
        const header = source.slice(0, comma);
        const payload = source.slice(comma + 1);
        const mime = /data:([^;]+)/.exec(header)?.[1] || 'image/jpeg';
        if (!isAllowedVaultImageMeta(mime, 'scan.jpg')) throw new Error('invalid data url');
        const binary = atob(payload);
        if (binary.length > VAULT_MAX_FILE_SIZE) throw new Error('file too large');
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        return { blob: new Blob([bytes], { type: mime }), fallbackDataUrl: source };
    }
    throw new Error('invalid scan source');
}

export async function saveScannedImageToVault(
    userId: string,
    image: string | Blob,
    options?: { aiSummary?: string | null; lawyerNote?: string | null; title?: string; customCategory?: string | null },
): Promise<SaveVaultFileResult> {
    const { blob, fallbackDataUrl } = await blobFromScanImageSource(image);
    const file = new File([blob], `scan_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
    const title = options?.title?.trim() || `${SCAN_TAG} ${new Date().toLocaleDateString('ar-IQ')}`;
    const baseTags = inferTags(title);
    const tags = baseTags.includes(SCAN_TAG) ? baseTags : [...baseTags, SCAN_TAG];

    if (!userId.trim()) throw new Error('user required');
    if (file.size > VAULT_MAX_FILE_SIZE) throw new Error('file too large');
    if (!isVaultImageFile(file)) throw new Error('نوع الملف غير مدعوم');

    const docId = uuidv4();
    const uploadResult = uploadVaultFileWithFallback(userId, file, { docId, fallbackDataUrl });
    const doc: SmartVaultDoc = {
        id: docId,
        title,
        type: 'image',
        tags,
        authorId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fileSize: file.size,
        fileName: file.name,
        mimeType: 'image/jpeg',
        storagePath: uploadResult.storagePath,
        signedUrl: uploadResult.signedUrl ?? fallbackDataUrl ?? null,
        isProcessing: false,
        aiSummary: options?.aiSummary ?? null,
        lawyerNote: sanitizeVaultPlainNote(options?.lawyerNote),
        customCategory: options?.customCategory ?? null,
        boundDossierId: null,
    };
    upsertVaultLocalIndexDocImmediate(doc);
    mergeVaultDocsWarmCache(userId, [doc]);
    notifySmartVaultDocsUpdated(userId, [doc]);
    await SmartVaultDB.saveDoc(doc, userId);
    const persistTask = scheduleVaultBlobPersist(uploadResult.persistTask, file.name);
    void import('@/app/services/vault/scheduleVaultTextExtraction').then(({ scheduleVaultTextExtraction }) => {
        scheduleVaultTextExtraction(doc, persistTask);
    });
    return { doc, localOnly: uploadResult.localOnly, persistTask };
}

export function readFilePreviewUrl(file: File): string | undefined {
    if (!isVaultImageFile(file)) return undefined;
    return createVaultFilePreviewUrl(file) ?? undefined;
}
