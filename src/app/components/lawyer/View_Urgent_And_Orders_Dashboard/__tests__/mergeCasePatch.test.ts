import { describe, expect, it } from 'vitest';
import { mergeUrgentCasePatch } from '../mergeCasePatch';
import type { UrgentCase } from '../../Component_Urgent_Card';

function caseOf(overrides: Partial<UrgentCase> = {}): UrgentCase {
    return {
        id: 'u1',
        type: 'state_order',
        actionType: 'أمر ولائي',
        applicantName: 'أحمد',
        court: 'بداءة',
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'safe',
        phase: 'grievance_window',
        ...overrides,
    } as UrgentCase;
}

describe('mergeUrgentCasePatch', () => {
    it('keeps partially_accepted instead of dropping it to null', () => {
        const next = mergeUrgentCasePatch(caseOf({ judgeDecision: null }), {
            judgeDecision: 'partially_accepted',
            judgeDecisionDate: '2026-05-01',
        });
        expect(next.judgeDecision).toBe('partially_accepted');
    });

    it('keeps rejected as a recorded decision', () => {
        const next = mergeUrgentCasePatch(caseOf({ judgeDecision: null }), {
            judgeDecision: 'rejected',
            judgeDecisionDate: '2026-05-01',
        });
        expect(next.judgeDecision).toBe('rejected');
    });

    it('clears judgeDecision when the dossier patch sets null', () => {
        const next = mergeUrgentCasePatch(caseOf({ judgeDecision: 'accepted' }), {
            judgeDecision: null,
            finalityReason: 'terminated_request',
        });
        expect(next.judgeDecision).toBeNull();
    });

    it('does not overwrite judgeDecision when the patch omits it', () => {
        const next = mergeUrgentCasePatch(caseOf({ judgeDecision: 'accepted' }), {
            court: 'محكمة أخرى',
        });
        expect(next.judgeDecision).toBe('accepted');
        expect(next.court).toBe('محكمة أخرى');
    });
});
