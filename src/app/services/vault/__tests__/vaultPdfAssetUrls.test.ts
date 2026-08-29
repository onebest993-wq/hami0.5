import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    resolvePdfCmapUrl,
    resolvePdfJsWorkerUrl,
    resolvePdfStandardFontUrl,
} from '@/app/services/vault/vaultPdfAssetUrls';
import { buildContentSecurityPolicy } from '@/app/api/security/contentSecurityPolicy';

describe('vaultPdfAssetUrls — لا شيفرة طرف ثالث فوق مستندات الموكّلين', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('يقرأ عامل pdf.js من أصل التطبيق في الإنتاج', () => {
        vi.stubEnv('DEV', false);
        vi.stubEnv('PROD', true);
        expect(resolvePdfJsWorkerUrl()).toBe('/pdfjs-assets/pdf.worker.min.mjs');
        expect(resolvePdfCmapUrl()).toBe('/pdfjs-assets/cmaps/');
    });

    it('كل المسارات نسبية — لا مطلق ولا أصل خارجي مهما كانت الرايات', () => {
        for (const flag of ['', 'true', 'false']) {
            vi.stubEnv('VITE_PDF_MINIMAL_ASSETS', flag);
            for (const url of [resolvePdfJsWorkerUrl(), resolvePdfCmapUrl(), resolvePdfStandardFontUrl()]) {
                if (url === undefined) continue;
                expect(url.startsWith('/pdfjs-assets/')).toBe(true);
            }
        }
    });

    it('يُسقط standard_fonts عند طلب النشر المصغَّر', () => {
        vi.stubEnv('VITE_PDF_MINIMAL_ASSETS', 'true');
        expect(resolvePdfStandardFontUrl()).toBeUndefined();
    });

    it('يشحن standard_fonts افتراضياً', () => {
        vi.stubEnv('VITE_PDF_MINIMAL_ASSETS', '');
        expect(resolvePdfStandardFontUrl()).toBe('/pdfjs-assets/standard_fonts/');
    });

    it('سياسة المحتوى لا تسمح بعامل من أصل خارجي', () => {
        const csp = buildContentSecurityPolicy('production');
        expect(csp).toContain("worker-src 'self' blob:");
        expect(csp).not.toContain('jsdelivr');
    });
});
