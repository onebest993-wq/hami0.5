import { describe, expect, it } from 'vitest';
import { rejectCriminalCaseMutation } from './criminalCaseMutationGuard';

describe('criminalCaseMutationGuard', () => {
    it('rejects mutation when owner differs from session lawyer', () => {
        expect(
            rejectCriminalCaseMutation({ ownerLawyerId: 'lawyer-b' }, 'lawyer-a'),
        ).toBeTruthy();
    });

    it('rejects mutation on legacy orphan when session lawyer is known', () => {
        expect(rejectCriminalCaseMutation({ ownerLawyerId: '' }, 'lawyer-a')).toBeTruthy();
    });

    it('allows mutation for owned case', () => {
        expect(
            rejectCriminalCaseMutation({ ownerLawyerId: 'lawyer-a' }, 'lawyer-a'),
        ).toBeNull();
    });
});
