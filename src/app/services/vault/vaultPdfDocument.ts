import {
    classifyVaultPdfLoadError,
    VaultPdfLoadError,
    type VaultPdfLoadErrorKind,
    type VaultPdfSource,
} from '@/app/services/vault/vaultPdfDocumentTypes';
import { resolvePdfCmapUrl, resolvePdfStandardFontUrl } from '@/app/services/vault/vaultPdfAssetUrls';
import { getVaultPdfJs } from '@/app/services/vault/vaultPdfRuntime';

export type { VaultPdfLoadErrorKind, VaultPdfSource };
export { VaultPdfLoadError, classifyVaultPdfLoadError };

const PDF_LOAD_TIMEOUT_MS = 20_000;

function isHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

function pdfDocumentBaseOptions() {
    const standardFontDataUrl = resolvePdfStandardFontUrl();
    return {
        cMapUrl: resolvePdfCmapUrl(),
        cMapPacked: true,
        ...(standardFontDataUrl ? { standardFontDataUrl } : {}),
        isEvalSupported: false,
        useSystemFonts: true,
        stopAtErrors: false,
    };
}

async function readBytesFromBlob(blob: Blob): Promise<Uint8Array> {
    const normalized =
        blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    const buffer = await normalized.arrayBuffer();
    if (!buffer.byteLength) throw new VaultPdfLoadError('invalid', 'pdf empty');
    return new Uint8Array(buffer);
}

async function readBytesFromUrl(url: string): Promise<Uint8Array> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) throw new VaultPdfLoadError('invalid', 'pdf empty');
    return new Uint8Array(buffer);
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = window.setTimeout(() => {
            onTimeout?.();
            reject(new VaultPdfLoadError('timeout', 'pdf load timeout'));
        }, ms);
        promise.then(
            (value) => {
                window.clearTimeout(timer);
                resolve(value);
            },
            (err) => {
                window.clearTimeout(timer);
                reject(err);
            },
        );
    });
}

async function loadOnce(source: VaultPdfSource) {
    const pdfjs = await getVaultPdfJs();
    const base = pdfDocumentBaseOptions();

    let task: import('pdfjs-dist').PDFDocumentLoadingTask;
    if (source instanceof Blob) {
        const data = await readBytesFromBlob(source);
        task = pdfjs.getDocument({ ...base, data, useWorkerFetch: false });
    } else if (isHttpUrl(source)) {
        task = pdfjs.getDocument({ ...base, url: source, withCredentials: false });
    } else {
        const data = await withTimeout(readBytesFromUrl(source), PDF_LOAD_TIMEOUT_MS);
        task = pdfjs.getDocument({ ...base, data, useWorkerFetch: false });
    }

    return withTimeout(task.promise, PDF_LOAD_TIMEOUT_MS, () => {
        void task.destroy().catch(() => {});
    });
}

/**
 * تحميل PDF — Blob محلياً، أو رابط https مباشرة، أو data/blob URL.
 * pdfjs-dist + worker يُحمَّلان عند أول فتح فقط (lazy).
 */
export async function loadVaultPdfDocument(source: VaultPdfSource) {
    try {
        return await loadOnce(source);
    } catch (err) {
        if (classifyVaultPdfLoadError(err) !== 'transient') throw err;
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        return loadOnce(source);
    }
}
