import { describe, expect, it } from 'vitest';
import {
    getUrgentCasePhaseLabel,
    hasUrgentGrievanceLogged,
    isUrgentCaseFinalized,
    isUrgentCaseInActiveScope,
    isUrgentCaseInArchiveScope,
    isUrgentCaseTrashed,
    urgentDaysUntil,
    urgentGrievanceDeadline,
    URGENT_GRIEVANCE_DAYS,
    URGENT_MS_PER_DAY,
} from '../Component_Urgent_Card.status';
import type { UrgentCase } from '../Component_Urgent_Card.types';

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

describe('urgent case status helpers', () => {
    it('urgentDaysUntil is calendar-day based', () => {
        const now = new Date(2026, 4, 1, 15, 0, 0);
        const target = new Date(2026, 4, 4, 8, 0, 0);
        expect(urgentDaysUntil(target, now)).toBe(3);
    });

    it('urgentGrievanceDeadline adds the shared grievance window', () => {
        const base = new Date('2026-05-01T00:00:00.000Z');
        const target = urgentGrievanceDeadline(base);
        expect(target.getTime() - base.getTime()).toBe(URGENT_GRIEVANCE_DAYS * URGENT_MS_PER_DAY);
    });

    it('hasUrgentGrievanceLogged covers legalState and outcomes', () => {
        expect(hasUrgentGrievanceLogged(caseOf())).toBe(false);
        expect(hasUrgentGrievanceLogged(caseOf({ legalState: 'Grievance_Filed' }))).toBe(true);
        expect(hasUrgentGrievanceLogged(caseOf({ grievanceOutcome: 'filed' }))).toBe(true);
    });

    it('scope helpers send finalized files to archive', () => {
        const live = caseOf({ status: 'safe' });
        const done = caseOf({ status: 'completed', phase: 'completed' });
        const archived = caseOf({ archived: true });
        const bin = caseOf({ deleted: true });
        expect(isUrgentCaseFinalized(done)).toBe(true);
        expect(isUrgentCaseInActiveScope(live)).toBe(true);
        expect(isUrgentCaseInActiveScope(done)).toBe(false);
        expect(isUrgentCaseInArchiveScope(done)).toBe(true);
        expect(isUrgentCaseInArchiveScope(archived)).toBe(true);
        expect(isUrgentCaseInArchiveScope(bin)).toBe(false);
        expect(isUrgentCaseTrashed(bin)).toBe(true);
    });

    it('phase label distinguishes recorded decisions from awaiting judge', () => {
        expect(getUrgentCasePhaseLabel(caseOf({ judgeDecision: null }))).toBe('بانتظار قرار القاضي');
        expect(
            getUrgentCasePhaseLabel(caseOf({ judgeDecision: 'rejected', notificationDate: undefined })),
        ).toBe('بانتظار التبليغ الأصولي');
        expect(
            getUrgentCasePhaseLabel(
                caseOf({ judgeDecision: 'partially_accepted', notificationDate: undefined }),
            ),
        ).toBe('بانتظار التبليغ الأصولي');
        expect(
            getUrgentCasePhaseLabel(caseOf({ status: 'completed', phase: 'completed' })),
        ).toBe('مكتسب الدرجة القطعية');
    });
});
