/** إصدار pdfjs-dist المثبّت — يُطابق package.json */
export const PDFJS_DIST_VERSION = '4.10.38';

const PDFJS_CDN_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_DIST_VERSION}`;

function envTrue(value: string | undefined): boolean {
    return String(value ?? '').trim().toLowerCase() === 'true';
}

/** حزمة محلية كاملة (Capacitor / نشر بدون CDN) */
export function shouldBundlePdfAssets(): boolean {
    return envTrue(import.meta.env.VITE_PDF_BUNDLE_ASSETS);
}

/** جلب worker/cmaps من CDN — افتراضي في الإنتاج ما لم يُفعَّل BUNDLE */
export function shouldUsePdfCdn(): boolean {
    if (shouldBundlePdfAssets()) return false;
    const flag = String(import.meta.env.VITE_PDF_CDN ?? '').trim().toLowerCase();
    if (flag === 'true') return true;
    if (flag === 'false') return false;
    return import.meta.env.PROD;
}

export function resolvePdfJsWorkerUrl(): string {
    if (shouldUsePdfCdn()) {
        return `${PDFJS_CDN_BASE}/build/pdf.worker.min.mjs`;
    }
    return '/pdfjs-assets/pdf.worker.min.mjs';
}

export function resolvePdfCmapUrl(): string {
    if (shouldUsePdfCdn()) {
        return `${PDFJS_CDN_BASE}/cmaps/`;
    }
    return '/pdfjs-assets/cmaps/';
}

export function resolvePdfStandardFontUrl(): string | undefined {
    if (import.meta.env.VITE_PDF_MINIMAL_ASSETS === 'true') return undefined;
    if (shouldUsePdfCdn()) {
        return `${PDFJS_CDN_BASE}/standard_fonts/`;
    }
    return '/pdfjs-assets/standard_fonts/';
}
