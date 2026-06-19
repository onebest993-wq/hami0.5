import { describe, expect, it } from 'vitest';
import { normalizeFastTrackRecord, readFastTrackRequestType } from '../fastTrackNormalize';

describe('fastTrackNormalize', () => {
    it('maps modal fields to canonical storage fields', () => {
        const normalized = normalizeFastTrackRecord({
            type: 'منع سفر',
            reason: 'المدعى عليه',
            requestDate: '2026-06-01',
            status: '⏳ قيد الانتظار (7 أيام)',
        });

        expect(normalized.requestType).toBe('منع سفر');
        expect(normalized.subject).toBe('المدعى عليه');
        expect(normalized.submissionDate).toBe('2026-06-01');
        expect(readFastTrackRequestType(normalized)).toBe('منع سفر');
    });

    it('prefers canonical fields when present', () => {
        const normalized = normalizeFastTrackRecord({
            requestType: 'حراسة قضائية',
            subject: 'عقار',
            submissionDate: '2026-06-02',
        });

        expect(normalized.type).toBe('حراسة قضائية');
        expect(normalized.reason).toBe('عقار');
    });
});
