import { describe, expect, it } from 'vitest';
import { restoreLifecycleNavigation } from '../restoreLifecycleNavigation';

describe('restoreLifecycleNavigation', () => {
    it('returns null for defender entry phases (handled elsewhere)', () => {
        expect(restoreLifecycleNavigation({ defenderEntryPhase: 2 })).toBeNull();
        expect(restoreLifecycleNavigation({ defenderEntryPhase: 3 })).toBeNull();
    });

    it('restores grievance state after rejected judge decision', () => {
        const nav = restoreLifecycleNavigation({
            judgeDecision: 'rejected',
            legalState: 'Awaiting_Grievance',
        });
        expect(nav).toEqual({ fileStatus: 'rejected', activeLifecycleStep: null });
    });

    it('restores cassation after completed grievance', () => {
        const nav = restoreLifecycleNavigation({
            judgeDecision: 'rejected',
            grievanceOutcome: 'filed',
            grievanceDecision: 'confirmed',
            cassationOutcome: 'filed',
        });
        expect(nav?.fileStatus).toBe('cassation');
        expect(nav?.isSecretMode).toBe(false);
    });

    it('syncs rejection notification from notificationDate path', () => {
        const nav = restoreLifecycleNavigation({
            judgeDecision: 'accepted',
            legalState: 'Awaiting_Grievance',
            requiresGuarantee: false,
        });
        expect(nav?.fileStatus).toBe('executed');
    });
});
