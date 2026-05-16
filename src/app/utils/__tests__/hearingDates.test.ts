import { describe, expect, it } from 'vitest';
import { getActiveDate } from '../hearingDates';

describe('getActiveDate', () => {
    it('returns initialDate when sessions are empty', () => {
        expect(getActiveDate([], '2026-01-10')).toBe('2026-01-10');
        expect(getActiveDate(null, '2026-01-10')).toBe('2026-01-10');
    });

    it('uses nextSessionDate from chronologically latest session', () => {
        const sessions = [
            { sessionDate: '2026-01-05', nextSessionDate: '2026-01-20', createdAt: '2026-01-01T10:00:00.000Z' },
            { sessionDate: '2026-01-12', nextSessionDate: '2026-02-01', createdAt: '2026-01-15T10:00:00.000Z' },
        ];
        expect(getActiveDate(sessions, '2026-01-01')).toBe('2026-02-01');
    });

    it('falls back to initialDate when latest session has no nextSessionDate', () => {
        const sessions = [
            { sessionDate: '2026-01-12', nextSessionDate: '', createdAt: '2026-01-15T10:00:00.000Z' },
        ];
        expect(getActiveDate(sessions, '2026-01-08')).toBe('2026-01-08');
    });

    it('does not assume array index 0 is latest when push order differs', () => {
        const sessions = [
            { sessionDate: '2026-03-01', nextSessionDate: '2026-03-15', createdAt: '2026-02-20T10:00:00.000Z' },
            { sessionDate: '2026-01-05', nextSessionDate: '2026-01-20', createdAt: '2026-01-01T10:00:00.000Z' },
        ];
        expect(getActiveDate(sessions, '2025-12-01')).toBe('2026-03-15');
    });
});
