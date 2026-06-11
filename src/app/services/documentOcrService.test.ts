import { describe, expect, it } from 'vitest';
import { extractTextFromDocumentImage, formatOcrFallbackMessage } from './documentOcrService';

describe('documentOcrService', () => {
    it('returns empty text when OCR is disabled', async () => {
        const result = await extractTextFromDocumentImage('data:image/png;base64,abc');
        expect(result.source).toBe('none');
        expect(result.text).toBe('');
    });

    it('builds fallback message for uploaded scans', () => {
        expect(formatOcrFallbackMessage()).toContain('المخزن');
    });
});
