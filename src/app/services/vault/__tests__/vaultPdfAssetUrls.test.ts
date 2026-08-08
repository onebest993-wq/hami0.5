import { describe, expect, it, vi } from 'vitest';
import {
    PDFJS_DIST_VERSION,
    resolvePdfCmapUrl,
    resolvePdfJsWorkerUrl,
    resolvePdfStandardFontUrl,
    shouldBundlePdfAssets,
    shouldUsePdfCdn,
} from '@/app/services/vault/vaultPdfAssetUrls';

describe('vaultPdfAssetUrls', () => {
    it('uses CDN paths in production by default', () => {
        vi.stubEnv('DEV', 'false');
        vi.stubEnv('PROD', 'true');
        vi.stubEnv('VITE_PDF_BUNDLE_ASSETS', '');
        vi.stubEnv('VITE_PDF_CDN', '');
        expect(shouldUsePdfCdn()).toBe(true);
        expect(shouldBundlePdfAssets()).toBe(false);
        expect(resolvePdfJsWorkerUrl()).toContain(PDFJS_DIST_VERSION);
        expect(resolvePdfJsWorkerUrl()).toContain('cdn.jsdelivr.net');
        expect(resolvePdfCmapUrl()).toContain('/cmaps/');
    });

    it('uses local pdfjs-assets when bundle flag is set', () => {
        vi.stubEnv('PROD', 'true');
        vi.stubEnv('VITE_PDF_BUNDLE_ASSETS', 'true');
        expect(shouldUsePdfCdn()).toBe(false);
        expect(resolvePdfJsWorkerUrl()).toBe('/pdfjs-assets/pdf.worker.min.mjs');
        expect(resolvePdfCmapUrl()).toBe('/pdfjs-assets/cmaps/');
        expect(resolvePdfStandardFontUrl()).toBe('/pdfjs-assets/standard_fonts/');
    });

    it('honors VITE_PDF_CDN=false on production', () => {
        vi.stubEnv('PROD', 'true');
        vi.stubEnv('VITE_PDF_BUNDLE_ASSETS', '');
        vi.stubEnv('VITE_PDF_CDN', 'false');
        expect(shouldUsePdfCdn()).toBe(false);
        expect(resolvePdfJsWorkerUrl()).toBe('/pdfjs-assets/pdf.worker.min.mjs');
    });
});
