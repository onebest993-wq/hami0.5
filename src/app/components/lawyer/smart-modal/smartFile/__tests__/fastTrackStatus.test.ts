import { describe, expect, it } from 'vitest';
import {
    FAST_TRACK_STATUS_STORED,
    isFastTrackDecidedStatus,
    resolveFastTrackStatusKey,
    storedFastTrackStatus,
} from '../fastTrackStatus';

describe('fastTrackStatus', () => {
    it('resolves stored status strings', () => {
        expect(resolveFastTrackStatusKey(FAST_TRACK_STATUS_STORED.pending)).toBe('pending');
        expect(resolveFastTrackStatusKey(FAST_TRACK_STATUS_STORED.accepted)).toBe('accepted');
        expect(resolveFastTrackStatusKey(FAST_TRACK_STATUS_STORED.rejected)).toBe('rejected');
        expect(resolveFastTrackStatusKey(FAST_TRACK_STATUS_STORED.approved)).toBe('approved');
        expect(resolveFastTrackStatusKey('⚖️ قيد نظر التظلم')).toBe('grievance');
    });

    it('maps keys back to stored values', () => {
        expect(storedFastTrackStatus('approved')).toBe('✅ موافقة المحكمة');
    });

    it('detects decided statuses for task automation', () => {
        expect(isFastTrackDecidedStatus(FAST_TRACK_STATUS_STORED.accepted)).toBe(true);
        expect(isFastTrackDecidedStatus(FAST_TRACK_STATUS_STORED.approved)).toBe(true);
        expect(isFastTrackDecidedStatus(FAST_TRACK_STATUS_STORED.pending)).toBe(false);
    });
});
