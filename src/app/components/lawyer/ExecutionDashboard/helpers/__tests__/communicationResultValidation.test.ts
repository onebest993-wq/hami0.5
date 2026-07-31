import { describe, expect, it } from 'vitest';
import { validateCommunicationResultDraft } from '../communicationResultValidation';

describe('validateCommunicationResultDraft', () => {
    it('requires result text', () => {
        expect(validateCommunicationResultDraft({ result: '  ' }).ok).toBe(false);
    });

    it('accepts a valid draft', () => {
        expect(
            validateCommunicationResultDraft({
                purpose: 'مديرية التنفيذ',
                letterNum: '12',
                letterDate: '2026-07-01',
                result: 'ورد الجواب',
            }).ok,
        ).toBe(true);
    });

    it('rejects oversized result', () => {
        expect(validateCommunicationResultDraft({ result: 'ن'.repeat(2001) }).ok).toBe(false);
    });

    it('rejects invalid letter date', () => {
        expect(
            validateCommunicationResultDraft({
                result: 'ورد',
                letterDate: '01-07-2026',
            }).ok,
        ).toBe(false);
    });
});
