import { SmartVaultDB, SmartVaultDoc, LawyerStorage, uuidv4 } from '@/app/services/lawyer-cloud';
import { compressImageToDataUrl } from '@/app/services/profileMediaService';
import { inferDocType, inferTags } from '@/app/services/vault/vaultDocUtils';
import {
    buildVaultIdbPath,
    getVaultBlobObjectUrl,
    isVaultIdbStoragePath,
    parseVaultIdbPath,
    putVaultBlob,
} from '@/app/services/vaultBlobStore';

export const VAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;
/** ملفات أصغر من هذا تُخزَّن inline كـ data URL في metadata */
export const LOCAL_INLINE_MAX_BYTES = 512 * 1024;

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

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('read failed'));
        };
        reader.onerror = () => reject(reader.error ?? new Error('read failed'));
        reader.readAsDataURL(file);
    });
}

async function saveLocalVaultBlob(
    userId: string,
    docId: string,
    file: File,
    previewDataUrl?: string | null,
): Promise<{ storagePath: string; signedUrl: string | null; localOnly: boolean }> {
    await putVaultBlob(userId, docId, file, file.type || 'application/octet-stream');
    return {
        storagePath: buildVaultIdbPath(userId, docId),
        signedUrl: previewDataUrl ?? null,
        localOnly: true,
    };
}

export async function uploadVaultFileWithFallback(
    userId: string,
    file: File,
    options?: { fallbackDataUrl?: string; docId?: string },
): Promise<{ storagePath: string; signedUrl: string | null; localOnly: boolean }> {
    const docId = options?.docId ?? uuidv4();

    try {
        const uploadResult = await LawyerStorage.uploadSmartFile(userId, file, 'vault');
        return {
            storagePath: uploadResult.path,
            signedUrl: uploadResult.downloadUrl || null,
            localOnly: false,
        };
    } catch {
        if (file.size > VAULT_MAX_FILE_SIZE) {
            throw new Error('file too large');
        }

        if (isVaultImageFile(file)) {
            try {
                const dataUrl = await compressImageToDataUrl(file);
                if (file.size <= LOCAL_INLINE_MAX_BYTES) {
                    return {
                        storagePath: `local:vault:${userId}:${Date.now()}`,
                        signedUrl: dataUrl,
                        localOnly: true,
                    };
                }
                return saveLocalVaultBlob(userId, docId, file, dataUrl);
            } catch {
                if (options?.fallbackDataUrl?.startsWith('data:image/')) {
                    if (file.size <= LOCAL_INLINE_MAX_BYTES) {
                        return {
                            storagePath: `local:vault:${userId}:${Date.now()}`,
                            signedUrl: options.fallbackDataUrl,
                            localOnly: true,
                        };
                    }
                    return saveLocalVaultBlob(userId, docId, file, options.fallbackDataUrl);
                }
                throw new Error('image processing failed');
            }
        }

        if (file.size <= LOCAL_INLINE_MAX_BYTES) {
            const dataUrl = await readFileAsDataUrl(file);
            return {
                storagePath: `local:vault:${userId}:${Date.now()}`,
                signedUrl: dataUrl,
                localOnly: true,
            };
        }

        return saveLocalVaultBlob(userId, docId, file, null);
    }
}

export type SaveVaultFileOptions = {
    title?: string;
    tags?: string[];
    aiSummary?: string | null;
    lawyerNote?: string | null;
    customCategory?: string | null;
    fileName?: string;
};

export async function saveFileToVault(
    userId: string,
    file: File,
    options?: SaveVaultFileOptions,
): Promise<{ doc: SmartVaultDoc; localOnly: boolean }> {
    if (!userId.trim()) throw new Error('user required');
    if (file.size > VAULT_MAX_FILE_SIZE) throw new Error('file too large');

    const docId = uuidv4();
    const uploadResult = await uploadVaultFileWithFallback(userId, file, { docId });
    const title = options?.title ?? file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    const doc: SmartVaultDoc = {
        id: docId,
        title,
        type: inferDocType(file.type || '', file.name),
        tags: options?.tags ?? inferTags(title),
        authorId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fileSize: file.size,
        fileName: options?.fileName ?? file.name,
        mimeType: file.type || (isVaultImageFile(file) ? 'image/jpeg' : isVaultPdfFile(file) ? 'application/pdf' : 'application/octet-stream'),
        storagePath: uploadResult.storagePath,
        signedUrl: uploadResult.signedUrl,
        isProcessing: false,
        aiSummary: options?.aiSummary ?? null,
        lawyerNote: options?.lawyerNote ?? null,
        customCategory: options?.customCategory ?? null,
        boundDossierId: null,
    };

    await SmartVaultDB.saveDoc(doc);
    return { doc, localOnly: uploadResult.localOnly };
}

export async function saveScannedImageToVault(
    userId: string,
    imageDataUrl: string,
    options?: { aiSummary?: string | null; lawyerNote?: string | null; title?: string; customCategory?: string | null },
): Promise<{ doc: SmartVaultDoc; localOnly: boolean }> {
    const blob = await (await fetch(imageDataUrl)).blob();
    const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const title = options?.title?.trim() || `${SCAN_TAG} ${new Date().toLocaleDateString('ar-IQ')}`;
    const baseTags = inferTags(title);
    const tags = baseTags.includes(SCAN_TAG) ? baseTags : [...baseTags, SCAN_TAG];

    if (!userId.trim()) throw new Error('user required');

    const docId = uuidv4();
    const uploadResult = await uploadVaultFileWithFallback(userId, file, { docId, fallbackDataUrl: imageDataUrl });
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
        signedUrl: uploadResult.signedUrl,
        isProcessing: false,
        aiSummary: options?.aiSummary ?? null,
        lawyerNote: options?.lawyerNote ?? null,
        customCategory: options?.customCategory ?? null,
        boundDossierId: null,
    };
    await SmartVaultDB.saveDoc(doc);
    return { doc, localOnly: uploadResult.localOnly };
}

export function readFilePreviewUrl(file: File): Promise<string | undefined> {
    if (!isVaultImageFile(file)) return Promise.resolve(undefined);
    return readFileAsDataUrl(file).catch(() => undefined);
}

export function isVaultDocImage(doc: SmartVaultDoc): boolean {
    return doc.type === 'image' || inferDocType(doc.mimeType || '', doc.fileName) === 'image';
}

export function isVaultDocPdf(doc: SmartVaultDoc): boolean {
    if (isVaultDocImage(doc)) return false;
    if (doc.type === 'pdf') return true;
    const mime = (doc.mimeType || '').toLowerCase();
    const name = (doc.fileName || doc.title || '').toLowerCase();
    return mime === 'application/pdf' || name.endsWith('.pdf');
}

/** ملف محفوظ محلياً (بدون رفع سحابي) */
export function isVaultDocLocal(doc: SmartVaultDoc): boolean {
    const path = doc.storagePath || '';
    return path.startsWith('local:vault:') || isVaultIdbStoragePath(path);
}

export type VaultDocViewerKind = 'image' | 'pdf';

export async function resolveVaultDocUrl(doc: SmartVaultDoc): Promise<string | null> {
    const path = doc.storagePath?.trim() || '';

    if (isVaultIdbStoragePath(path)) {
        const parsed = parseVaultIdbPath(path);
        if (parsed) {
            const blobUrl = await getVaultBlobObjectUrl(parsed.userId, parsed.docId);
            if (blobUrl) return blobUrl;
        }
        return doc.signedUrl?.trim() || null;
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

/** يحوّل data URL إلى blob URL لمعاينة PDF داخل التطبيق */
export async function toVaultPdfViewerUrl(url: string): Promise<string> {
    if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    const res = await fetch(url);
    const blob = await res.blob();
    const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    return URL.createObjectURL(pdfBlob);
}
