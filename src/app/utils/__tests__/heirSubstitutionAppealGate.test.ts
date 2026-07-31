import { describe, expect, it } from 'vitest';
import { isHeirSubstitutionFollowupBlockedByAppeal } from '@/app/utils/heirSubstitutionAppealGate';

describe('isHeirSubstitutionFollowupBlockedByAppeal', () => {
    it('allows followup when no appeal track', () => {
        expect(isHeirSubstitutionFollowupBlockedByAppeal({ appealStatus: 'pending' })).toBe(false);
        expect(isHeirSubstitutionFollowupBlockedByAppeal({})).toBe(false);
    });

    it('blocks while grievance or cassation is open', () => {
        expect(
            isHeirSubstitutionFollowupBlockedByAppeal({ appealStatus: 'tadhallum_filed' }),
        ).toBe(true);
        expect(
            isHeirSubstitutionFollowupBlockedByAppeal({ appealStatus: 'tamyeez_filed' }),
        ).toBe(true);
        expect(
            isHeirSubstitutionFollowupBlockedByAppeal({ appealPhase: 'grievance' }),
        ).toBe(true);
        expect(
            isHeirSubstitutionFollowupBlockedByAppeal({
                awaitingCassationEntryBy: 'lawyer',
            }),
        ).toBe(true);
    });

    it('blocks when revoked by appeal', () => {
        expect(
            isHeirSubstitutionFollowupBlockedByAppeal({
                appealWorkflowState: 'REVOKED_BY_APPEAL',
            }),
        ).toBe(true);
    });
});
