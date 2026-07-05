import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const PDF_LOAD_TIMEOUT_MS = 20_000;
const PDF_CMAP_URL = '/pdfjs-assets/cmaps/';
const PDF_STANDARD_FONT_URL = '/pdfjs-assets/standard_fonts/';

export type VaultPdfSource = string | Blob;

let workerConfigured = false;

function ensurePdfWorker(): void {
    if (workerConfigured) return;
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    workerConfigured = true;
}

function rejectAfter<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error(message)), ms);
    });
}

function isHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
}

function pdfDocumentBaseOptions() {
    return {
        cMapUrl: PDF_CMAP_URL,
        cMapPacked: true,
        standardFontDataUrl: PDF_STANDARD_FONT_URL,
        isEvalSupported: false,
        useSystemFonts: true,
    };
}

async function readBytesFromBlob(blob: Blob): Promise<Uint8Array> {
    const normalized =
        blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
    const buffer = await normalized.arrayBuffer();
    if (!buffer.byteLength) throw new Error('pdf empty');
    return new Uint8Array(buffer);
}

async function readBytesFromUrl(url: string): Promise<Uint8Array> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    if (!buffer.byteLength) throw new Error('pdf empty');
    return new Uint8Array(buffer);
}

/** تحميل PDF — Blob محلياً، أو رابط https مباشرة، أو data/blob URL */
export async function loadVaultPdfDocument(source: VaultPdfSource): Promise<pdfjs.PDFDocumentProxy> {
    ensurePdfWorker();
    const base = pdfDocumentBaseOptions();

    let task: pdfjs.PDFDocumentLoadingTask;
    if (source instanceof Blob) {
        const data = await readBytesFromBlob(source);
        task = pdfjs.getDocument({ ...base, data, useWorkerFetch: false });
    } else if (isHttpUrl(source)) {
        task = pdfjs.getDocument({ ...base, url: source, withCredentials: false });
    } else {
        const data = await Promise.race([
            readBytesFromUrl(source),
            rejectAfter<Uint8Array>(PDF_LOAD_TIMEOUT_MS, 'pdf bytes timeout'),
        ]);
        task = pdfjs.getDocument({ ...base, data, useWorkerFetch: false });
    }

    return Promise.race([
        task.promise,
        rejectAfter<pdfjs.PDFDocumentProxy>(PDF_LOAD_TIMEOUT_MS, 'pdf parse timeout'),
    ]);
}
