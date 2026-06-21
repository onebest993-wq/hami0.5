import { describe, expect, it } from 'vitest';
import {
    CASE_SHARE_SESSION_MINUTES,
    clampCaseShareSessionMinutes,
    formatCaseShareSession,
    isCaseShareSessionActive,
    isCaseShareSessionExpired,
} from '../caseShareSession';

describe('caseShareSession', () => {
    it('offers 15-minute steps up to 3 hours', () => {
        expect(CASE_SHARE_SESSION_MINUTES[0]).toBe(15);
        expect(CASE_SHARE_SESSION_MINUTES[CASE_SHARE_SESSION_MINUTES.length - 1]).toBe(180);
    });

    it('formats Arabic labels', () => {
        expect(formatCaseShareSession(15)).toBe('ربع ساعة');
        expect(formatCaseShareSession(180)).toBe('3 ساعات');
    });

    it('clamps invalid values', () => {
        expect(clampCaseShareSessionMinutes(999)).toBe(180);
        expect(clampCaseShareSessionMinutes(20)).toBe(15);
    });

    it('expires session after duration elapses', () => {
        const started = new Date(Date.now() - 61 * 60_000).toISOString();
        const share = {
            status: 'accepted' as const,
            sessionStartedAt: started,
            sessionDurationMinutes: 60,
        };
        expect(isCaseShareSessionExpired(share)).toBe(true);
        expect(isCaseShareSessionActive(share)).toBe(false);
    });

    it('keeps active session within duration', () => {
        const share = {
            status: 'accepted' as const,
            sessionStartedAt: new Date().toISOString(),
            sessionDurationMinutes: 60,
        };
        expect(isCaseShareSessionExpired(share)).toBe(false);
        expect(isCaseShareSessionActive(share)).toBe(true);
    });
});
