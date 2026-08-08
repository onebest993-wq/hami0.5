import { describe, expect, it } from 'vitest';
import {
    CASSATION_APPEAL_DAYS,
    computeCassationDeadline,
    computeFirstInstanceAppealDeadline,
    FIRST_INSTANCE_APPEAL_DAYS,
    isAppealDeadlineExpired,
} from '../appealDeadlineEngine';

describe('appealDeadlineEngine', () => {
    it('computes first-instance appeal deadline 15 days after the day after judgment', () => {
        expect(FIRST_INSTANCE_APPEAL_DAYS).toBe(15);
        expect(computeFirstInstanceAppealDeadline('2026-08-04')).toBe('2026-08-20');
    });

    it('computes cassation deadline 30 days from judgment issuance', () => {
        expect(CASSATION_APPEAL_DAYS).toBe(30);
        expect(computeCassationDeadline('2026-08-04')).toBe('2026-09-03');
    });

    it('detects expired appeal deadlines', () => {
        expect(isAppealDeadlineExpired('2099-01-01', new Date('2098-01-01'))).toBe(false);
        expect(isAppealDeadlineExpired('2020-01-01', new Date('2098-01-01'))).toBe(true);
    });
});
