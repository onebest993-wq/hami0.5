import { describe, expect, it, vi } from 'vitest';
import { extractTextFromDocumentImage, ocrFallbackMessage } from './documentOcrService';

vi.mock('@/app/services/ai-service', () => ({
    hasOpenRouterKey: () => false,
}));

describe('documentOcrService', () => {
    it('returns fallback when no API key', async () => {
        const result = await extractTextFromDocumentImage('data:image/png;base64,abc');
        expect(result.source).toBe('fallback');
        expect(result.text).toBe('');
    });

    it('builds fallback message for uploaded scans', () => {
        expect(ocrFallbackMessage(true)).toContain('المخزن');
    });
});
