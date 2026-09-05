import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { resolveVaultMediaKind } from '@/app/services/vault/vaultDocUtils';
import { assertVaultStoragePathOwner } from '@/app/services/vault/vaultOwnership';
import { sanitizeVaultPreviewUrl } from '@/app/services/vault/vaultPreviewUrlSafety';
import {
    getVaultBlob,
    getVaultBlobObjectUrl,
    isVaultIdbStoragePath,
    parseVaultIdbPath,
    peekVaultBlob,
    prefetchVaultBlobStore,
    waitForVaultBlobWrites,
} from '@/app/services/vaultBlobStore';

export type VaultDocViewerKind = 'image' | 'pdf' | 'audio' | 'file';

export function vaultDocStorageOwned(doc: SmartVaultDoc): boolean {
    const path = doc.storagePath?.trim() || '';
    const author = (doc.authorId || '').trim();
    if (!path) return true;
    if (!author) return false;
    try {
        assertVaultStoragePathOwner(path, author);
    } catch {
        return false;
    }
    if (isVaultIdbStoragePath(path)) {
        const parsed = parseVaultIdbPath(path);
        if (parsed && parsed.userId !== author) return false;
    }
    return true;
}

export function isVaultDocImage(doc: SmartVaultDoc): boolean {
    return resolveVaultMediaKind(doc) === 'image';
}

export function isVaultDocPdf(doc: SmartVaultDoc): boolean {
    return resolveVaultMediaKind(doc) === 'pdf';
}

export function isVaultDocLocal(doc: SmartVaultDoc): boolean {
    const path = doc.storagePath || '';
    return path.startsWith('local:vault:') || isVaultIdbStoragePath(path);
}

export async function resolveVaultDocBlob(doc: SmartVaultDoc): Promise<Blob | null> {
    if (!vaultDocStorageOwned(doc)) return null;
    const path = doc.storagePath?.trim() || '';
    if (isVaultIdbStoragePath(path)) {
        const parsed = parseVaultIdbPath(path);
        if (!parsed) return null;
        const hot = peekVaultBlob(parsed.userId, parsed.docId);
        if (hot) return hot;
        return getVaultBlob(parsed.userId, parsed.docId);
    }

    const cached = sanitizeVaultPreviewUrl(doc.signedUrl);
    if (cached && (cached.startsWith('data:') || cached.startsWith('blob:'))) {
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
    if (!vaultDocStorageOwned(doc)) return null;
    const path = doc.storagePath?.trim() || '';
    const author = (doc.authorId || '').trim();

    const cached = sanitizeVaultPreviewUrl(doc.signedUrl);
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
            if (author && parsed.userId !== author) return null;
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
        return cached;
    }

    if (path && !path.startsWith('local:')) {
        try {
            const remote = sanitizeVaultPreviewUrl(await SmartVaultDB.getSignedUrl(path));
            if (remote) return remote;
        } catch {
            /* fall through */
        }
    }
    return cached;
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

export async function resolveVaultDocForViewing(
    doc: SmartVaultDoc,
): Promise<VaultDocViewPayload | null> {
    if (!vaultDocStorageOwned(doc)) return null;
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
        url = sanitizeVaultPreviewUrl(doc.signedUrl);
    }

    const path = doc.storagePath?.trim() || '';
    if (!url && path && !isVaultIdbStoragePath(path) && !path.startsWith('local:')) {
        try {
            url = sanitizeVaultPreviewUrl(await SmartVaultDB.getSignedUrl(path));
        } catch {
            /* fall through */
        }
    }

    url = sanitizeVaultPreviewUrl(url);
    if (!url) return null;

    const kind = resolveVaultMediaKind(doc);
    const cached = doc.signedUrl?.trim() || '';
    const revokeOnClose = url.startsWith('blob:') && url !== cached;

    return { doc, url, blob, kind, revokeOnClose };
}

const PDF_VIEWER_PREP_TIMEOUT_MS = 12_000;

export async function toVaultPdfViewerUrl(url: string): Promise<string> {
    if (!sanitizeVaultPreviewUrl(url)) {
        throw new Error('unsafe vault preview url');
    }
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

export async function downloadVaultDocToDevice(
    doc: SmartVaultDoc,
    opts?: { fileUrl?: string | null; fileBlob?: Blob | null },
): Promise<void> {
    const safeFileUrl = sanitizeVaultPreviewUrl(opts?.fileUrl);
    const blob =
        opts?.fileBlob ??
        (safeFileUrl ? await fetch(safeFileUrl).then((r) => r.blob()).catch(() => null) : null) ??
        (await resolveVaultDocBlob(doc));
    if (!blob) throw new Error('vault download unavailable');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = doc.fileName || doc.title || 'vault-doc';
    anchor.click();
    URL.revokeObjectURL(url);
}
