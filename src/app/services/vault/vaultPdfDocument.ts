import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const PDF_LOAD_TIMEOUT_MS = 20_000;
const PDF_CMAP_URL = '/pdfjs-assets/cmaps/';
const PDF_STANDARD_FONT_URL = '/pdfjs-assets/standard_fonts/';

export type VaultPdfSource = string | Blob;

/**
 * تصنيف فشل تحميل PDF — يسمح للواجهة بتمييز الملف التالف/المحمي
 * (لا تنفع إعادة المحاولة) عن الفشل العابر (شبكة/worker — تنفع إعادة المحاولة).
 */
export type VaultPdfLoadErrorKind = 'password' | 'invalid' | 'timeout' | 'transient';

export class VaultPdfLoadError extends Error {
    readonly kind: VaultPdfLoadErrorKind;

    constructor(kind: VaultPdfLoadErrorKind, message: string, cause?: unknown) {
        super(message);
        this.name = 'VaultPdfLoadError';
        this.kind = kind;
        if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
    }
}

export function classifyVaultPdfLoadError(err: unknown): VaultPdfLoadErrorKind {
    if (err instanceof VaultPdfLoadError) return err.kind;
    const name = String((err as { name?: unknown } | null)?.name ?? '');
    if (name === 'PasswordException') return 'password';
    if (name === 'InvalidPDFException') return 'invalid';
    const message = String((err as { message?: unknown } | null)?.message ?? '');
    if (/invalid pdf structure|pdf empty/i.test(message)) return 'invalid';
    return 'transient';
}

let workerConfigured = false;

function ensurePdfWorker(): void {
    if (workerConfigured) return;
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    workerConfigured = true;
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
        /** تحمّل أخطاء بنيوية جزئية — يعرض ما أمكن بدل رفض الملف كاملاً */
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

async function loadOnce(source: VaultPdfSource): Promise<pdfjs.PDFDocumentProxy> {
    ensurePdfWorker();
    const base = pdfDocumentBaseOptions();

    let task: pdfjs.PDFDocumentLoadingTask;
    if (source instanceof Blob) {
        const data = await readBytesFromBlob(source);
        task = pdfjs.getDocument({ ...base, data, useWorkerFetch: false });
    } else if (isHttpUrl(source)) {
        task = pdfjs.getDocument({ ...base, url: source, withCredentials: false });
    } else {
        const data = await withTimeout(readBytesFromUrl(source), PDF_LOAD_TIMEOUT_MS);
        task = pdfjs.getDocument({ ...base, data, useWorkerFetch: false });
    }

    // عند انقضاء المهلة يجب تدمير المهمة — وإلا بقي worker معلّقاً (تسريب ذاكرة)
    return withTimeout(task.promise, PDF_LOAD_TIMEOUT_MS, () => {
        void task.destroy().catch(() => {});
    });
}

/**
 * تحميل PDF — Blob محلياً، أو رابط https مباشرة، أو data/blob URL.
 * الفشل العابر (worker/شبكة) يُعاد تلقائياً مرة واحدة قبل الرفض؛
 * الملف التالف أو المحمي بكلمة مرور يُرفض فوراً بتصنيف واضح.
 */
export async function loadVaultPdfDocument(source: VaultPdfSource): Promise<pdfjs.PDFDocumentProxy> {
    try {
        return await loadOnce(source);
    } catch (err) {
        if (classifyVaultPdfLoadError(err) !== 'transient') throw err;
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        return loadOnce(source);
    }
}
