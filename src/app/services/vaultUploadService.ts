import { uuidv4 } from '@/app/services/lawyer-cloud';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { inferDocType, inferTags, resolveVaultMediaKind } from '@/app/services/vault/vaultDocUtils';
import {
    buildVaultIdbPath,
    getVaultBlob,
    getVaultBlobObjectUrl,
    isVaultIdbStoragePath,
    parseVaultIdbPath,
    peekVaultBlob,
    prefetchVaultBlobStore,
    primeVaultBlobCache,
    putVaultBlob,
    waitForVaultBlobWrites,
} from '@/app/services/vaultBlobStore';
import { mergeVaultDocsWarmCache } from '@/app/services/vault/vaultDocsWarmCache';
import { notifySmartVaultDocsUpdated } from '@/app/services/vault/vaultDocsWarmCache';
import { upsertVaultLocalIndexDocImmediate } from '@/app/services/vault/vaultLocalIndex';

export const VAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

const SCAN_TAG = 'مسح ضوئي';

export function isVaultImageFile(file: File): boolean {
    return inferDocType(file.type || '', file.name) === 'image';
}

export function isVaultPdfFile(file: File): boolean {
    const mime = (file.type || '').toLowerCase();
    const name = file.name.toLowerCase();
    return mime === 'application/pdf' || name.endsWith('.pdf');
}

export type VaultUploadKind = 'image' | 'pdf';

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
        lawyerNote: options?.lawyerNote ?? null,
        customCategory: options?.customCategory ?? null,
        boundDossierId: null,
    };

    upsertVaultLocalIndexDocImmediate(doc);
    mergeVaultDocsWarmCache(userId, [doc]);
    notifySmartVaultDocsUpdated(userId, [doc]);
    await SmartVaultDB.saveDoc(doc);
    const persistTask = scheduleVaultBlobPersist(uploadResult.persistTask, normalized.name);
    void import('@/app/services/vault/scheduleVaultTextExtraction').then(({ scheduleVaultTextExtraction }) => {
        scheduleVaultTextExtraction(doc, persistTask);
    });
    return { doc, localOnly: uploadResult.localOnly, persistTask };
}

export async function saveScannedImageToVault(
    userId: string,
    imageDataUrl: string,
    options?: { aiSummary?: string | null; lawyerNote?: string | null; title?: string; customCategory?: string | null },
): Promise<SaveVaultFileResult> {
    const blob = await (await fetch(imageDataUrl)).blob();
    const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const title = options?.title?.trim() || `${SCAN_TAG} ${new Date().toLocaleDateString('ar-IQ')}`;
    const baseTags = inferTags(title);
    const tags = baseTags.includes(SCAN_TAG) ? baseTags : [...baseTags, SCAN_TAG];

    if (!userId.trim()) throw new Error('user required');

    const docId = uuidv4();
    const uploadResult = uploadVaultFileWithFallback(userId, file, { docId, fallbackDataUrl: imageDataUrl });
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
        signedUrl: uploadResult.signedUrl ?? imageDataUrl,
        isProcessing: false,
        aiSummary: options?.aiSummary ?? null,
        lawyerNote: options?.lawyerNote ?? null,
        customCategory: options?.customCategory ?? null,
        boundDossierId: null,
    };
    upsertVaultLocalIndexDocImmediate(doc);
    mergeVaultDocsWarmCache(userId, [doc]);
    notifySmartVaultDocsUpdated(userId, [doc]);
    await SmartVaultDB.saveDoc(doc);
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

export function isVaultDocImage(doc: SmartVaultDoc): boolean {
    return resolveVaultMediaKind(doc) === 'image';
}

export function isVaultDocPdf(doc: SmartVaultDoc): boolean {
    return resolveVaultMediaKind(doc) === 'pdf';
}

export function isVaultDocAudio(doc: SmartVaultDoc): boolean {
    return resolveVaultMediaKind(doc) === 'audio';
}

/** ملف محفوظ محلياً (بدون رفع سحابي) */
export function isVaultDocLocal(doc: SmartVaultDoc): boolean {
    const path = doc.storagePath || '';
    return path.startsWith('local:vault:') || isVaultIdbStoragePath(path);
}

export type VaultDocViewerKind = 'image' | 'pdf' | 'audio' | 'file';

export { resolveVaultMediaKind as resolveVaultDocViewerKind } from '@/app/services/vault/vaultDocUtils';

export async function resolveVaultDocBlob(doc: SmartVaultDoc): Promise<Blob | null> {
    const path = doc.storagePath?.trim() || '';
    if (isVaultIdbStoragePath(path)) {
        const parsed = parseVaultIdbPath(path);
        if (!parsed) return null;
        const hot = peekVaultBlob(parsed.userId, parsed.docId);
        if (hot) return hot;
        return getVaultBlob(parsed.userId, parsed.docId);
    }

    const cached = doc.signedUrl?.trim() || '';
    if (cached.startsWith('data:') || cached.startsWith('blob:')) {
        try {
            const response = await fetch(cached);
            const blob = await response.blob();
            return blob.size > 0 ? blob : null;
        } catch {
            return null;
        }
    }

    return null;
}

export async function resolveVaultDocUrl(doc: SmartVaultDoc): Promise<string | null> {
    const path = doc.storagePath?.trim() || '';
    const cached = doc.signedUrl?.trim() || '';
    const isPdfDoc =
        doc.type === 'pdf' ||
        (doc.mimeType || '').toLowerCase() === 'application/pdf' ||
        /\.pdf$/i.test(doc.fileName || doc.title || '');

    const objectUrlFromBlob = (blob: Blob): string => {
        if (isPdfDoc && blob.type !== 'application/pdf') {
            return URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        }
        return URL.createObjectURL(blob);
    };

    if (cached && cached.startsWith('data:')) {
        return cached;
    }

    if (isVaultIdbStoragePath(path)) {
        const parsed = parseVaultIdbPath(path);
        if (parsed) {
            const memoryBlob = peekVaultBlob(parsed.userId, parsed.docId);
            if (memoryBlob) {
                try {
                    return objectUrlFromBlob(memoryBlob);
                } catch {
                    /* fall through */
                }
            }
            const blobUrl = await getVaultBlobObjectUrl(parsed.userId, parsed.docId, {
                mimeType: isPdfDoc ? 'application/pdf' : doc.mimeType,
            });
            if (blobUrl) return blobUrl;
        }
        return cached && !cached.startsWith('blob:') ? cached : null;
    }

    if (path.startsWith('local:vault:')) {
        return doc.signedUrl?.trim() || null;
    }

    if (path && !path.startsWith('local:')) {
        try {
            const remote = await SmartVaultDB.getSignedUrl(path);
            if (remote) return remote;
        } catch {
            // fall through to cached signedUrl
        }
    }
    return doc.signedUrl?.trim() || null;
}

const VAULT_VIEW_RESOLVE_TIMEOUT_MS = 14_000;
const VAULT_VIEW_IDB_RETRY_MS = 6_000;

function isVaultPdfDoc(doc: SmartVaultDoc): boolean {
    return (
        doc.type === 'pdf' ||
        (doc.mimeType || '').toLowerCase() === 'application/pdf' ||
        /\.pdf$/i.test(doc.fileName || doc.title || '')
    );
}

function createVaultBlobPreviewUrl(blob: Blob, doc: SmartVaultDoc): string {
    if (isVaultPdfDoc(doc) && blob.type !== 'application/pdf') {
        return URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    }
    return URL.createObjectURL(blob);
}

function rejectVaultViewAfter<T>(ms: number): Promise<T> {
    return new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error('vault view resolve timeout')), ms);
    });
}

async function resolveVaultDocBlobAndUrl(
    doc: SmartVaultDoc,
): Promise<{ blob: Blob | null; url: string | null }> {
    const blob = await resolveVaultDocBlob(doc);
    let url = await resolveVaultDocUrl(doc);
    if (!url && blob) {
        try {
            url = createVaultBlobPreviewUrl(blob, doc);
        } catch {
            url = null;
        }
    }
    return { blob, url };
}

export type VaultDocViewPayload = {
    doc: SmartVaultDoc;
    url: string;
    blob: Blob | null;
    kind: VaultDocViewerKind;
    revokeOnClose: boolean;
};

/** مسار واحد موثوق لفتح معاينة ملف الخزنة — يعالج IDB والـ blob والروابط السحابية */
export async function resolveVaultDocForViewing(
    doc: SmartVaultDoc,
): Promise<VaultDocViewPayload | null> {
    prefetchVaultBlobStore();

    let { blob, url } = await Promise.race([
        resolveVaultDocBlobAndUrl(doc),
        rejectVaultViewAfter<{ blob: Blob | null; url: string | null }>(VAULT_VIEW_RESOLVE_TIMEOUT_MS),
    ]).catch(() => ({ blob: null as Blob | null, url: null as string | null }));

    if (!url && isVaultIdbStoragePath(doc.storagePath || '')) {
        await Promise.race([
            waitForVaultBlobWrites(),
            new Promise<void>((resolve) => window.setTimeout(resolve, VAULT_VIEW_IDB_RETRY_MS)),
        ]);
        const retry = await Promise.race([
            resolveVaultDocBlobAndUrl(doc),
            rejectVaultViewAfter<{ blob: Blob | null; url: string | null }>(VAULT_VIEW_RESOLVE_TIMEOUT_MS),
        ]).catch(() => ({ blob, url }));
        blob = retry.blob ?? blob;
        url = retry.url ?? url;
    }

    if (!url) {
        const cached = doc.signedUrl?.trim() || '';
        if (cached.startsWith('https://') || cached.startsWith('http://')) {
            url = cached;
        }
    }

    const path = doc.storagePath?.trim() || '';
    if (!url && path && !isVaultIdbStoragePath(path) && !path.startsWith('local:')) {
        try {
            const remote = await SmartVaultDB.getSignedUrl(path);
            if (remote) url = remote;
        } catch {
            /* fall through */
        }
    }

    if (!url) return null;

    const kind = resolveVaultMediaKind(doc);
    const cached = doc.signedUrl?.trim() || '';
    const revokeOnClose = url.startsWith('blob:') && url !== cached;

    return { doc, url, blob, kind, revokeOnClose };
}

/** يحوّل data URL أو blob إلى رابط مناسب لمعاينة PDF داخل التطبيق */
const PDF_VIEWER_PREP_TIMEOUT_MS = 12_000;

export async function toVaultPdfViewerUrl(url: string): Promise<string> {
    const prepare = async (): Promise<string> => {
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        if (url.startsWith('blob:')) {
            const res = await fetch(url);
            const blob = await res.blob();
            if (blob.type === 'application/pdf') return url;
            return URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        }
        const res = await fetch(url);
        const blob = await res.blob();
        const pdfBlob =
            blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
        return URL.createObjectURL(pdfBlob);
    };

    return Promise.race([
        prepare(),
        new Promise<string>((_, reject) => {
            window.setTimeout(() => reject(new Error('pdf viewer prep timeout')), PDF_VIEWER_PREP_TIMEOUT_MS);
        }),
    ]);
}

export function reportVaultPersistFailure(err: unknown, fileLabel: string): string {
    if (err instanceof Error && err.message === 'vault persist failed') {
        return 'تعذر حفظ الملف على الجهاز — قد تكون مساحة التخزين ممتلئة';
    }
    if (err instanceof Error && err.message === 'vault blob write timeout') {
        return `استغرق حفظ ${fileLabel} وقتاً طويلاً — جرّب ملفاً أصغر أو أعد المحاولة`;
    }
    if (err instanceof Error && err.message === 'vault save timeout') {
        return `استغرق رفع ${fileLabel} وقتاً طويلاً — أعد المحاولة`;
    }
    if (err instanceof Error && err.message === 'file too large') {
        return 'يتجاوز الحد الأقصى 50MB';
    }
    return `فشل حفظ ${fileLabel}`;
}

/** تحميل مستند Vault إلى الجهاز — thin shim للم viewer */
export async function downloadVaultDocToDevice(
    doc: SmartVaultDoc,
    opts?: { fileUrl?: string | null; fileBlob?: Blob | null },
): Promise<void> {
    const blob =
        opts?.fileBlob ??
        (opts?.fileUrl ? await fetch(opts.fileUrl).then((r) => r.blob()).catch(() => null) : null) ??
        (await resolveVaultDocBlob(doc));
    if (!blob) throw new Error('vault download unavailable');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = doc.fileName || doc.title || 'vault-doc';
    anchor.click();
    URL.revokeObjectURL(url);
}
