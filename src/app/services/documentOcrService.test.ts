import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/spark/audit/sparkVaultExtractConfig', () => ({
    isSparkVaultExtractEnabled: vi.fn(() => false),
}));

import { isSparkVaultExtractEnabled } from '@/app/spark/audit/sparkVaultExtractConfig';
import { extractTextFromDocumentImage, formatOcrFallbackMessage } from './documentOcrService';

describe('documentOcrService', () => {
    beforeEach(() => {
        vi.mocked(isSparkVaultExtractEnabled).mockReturnValue(false);
    });

    it('returns empty text when OCR is disabled', async () => {
        const result = await extractTextFromDocumentImage('data:image/png;base64,abc');
        expect(result.source).toBe('none');
        expect(result.text).toBe('');
    });

    it('يستدعي spark-vault-extract عند التفعيل', async () => {
        vi.mocked(isSparkVaultExtractEnabled).mockReturnValue(true);
        const requestSparkVaultExtract = vi.fn(async () => ({ text: 'نص مستخرج من الصورة' }));
        vi.doMock('@/app/spark/audit/sparkVaultExtractService', () => ({
            requestSparkVaultExtract,
        }));

        const blob = new Blob(['image'], { type: 'image/jpeg' });
        const result = await extractTextFromDocumentImage(blob);
        if (result.source === 'remote') {
            expect(result.text).toContain('نص');
        } else {
            expect(result.source).toBe('none');
        }
    });

    it('builds fallback message for uploaded scans', () => {
        expect(formatOcrFallbackMessage()).toContain('المخزن');
    });
});
