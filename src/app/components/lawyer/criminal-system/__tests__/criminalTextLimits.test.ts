import { describe, expect, it } from 'vitest';
import { clampCriminalText, CRIMINAL_TEXT_LIMITS } from '@/app/components/lawyer/criminal-system/criminalTextLimits';

describe('criminalTextLimits', () => {
    it('clamps oversized text and keeps short text', () => {
        expect(clampCriminalText('abc', 10)).toBe('abc');
        expect(clampCriminalText('x'.repeat(50), 10)).toBe('x'.repeat(10));
        expect(clampCriminalText(null, CRIMINAL_TEXT_LIMITS.shortLabel)).toBe('');
    });
});
