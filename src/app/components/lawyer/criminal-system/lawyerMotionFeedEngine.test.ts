import { describe, expect, it } from 'vitest';
import type { JudicialDecision } from '@/app/types/criminal';
import type { LawyerRequest } from './criminalStore';
import { buildLawyerMotionUnifiedFeed, sortLawyerRequestsNewestFirst } from './lawyerMotionFeedEngine';

describe('lawyerMotionFeedEngine', () => {
    it('merges pending requests and decisions without duplication, newest first', () => {
        const pending: LawyerRequest = {
            id: 'r-pending',
            requestDate: '2026-05-29',
            type: 'طلب جديد',
            lawyerNote: 'note',
            status: 'pending',
        };
        const finalizedRequest: LawyerRequest = {
            id: 'r-done',
            requestDate: '2026-05-20',
            type: 'طلب قديم',
            lawyerNote: 'done',
            status: 'approved',
            judgeMargin: 'موافق',
            decisionDate: '2026-05-21',
            isLocked: true,
        };
        const decision: JudicialDecision = {
            id: 'jd_r-done',
            issuedAt: '2026-05-21',
            title: 'طلب قديم',
            summary: 'موافق',
            decisionType: 'preparatory',
            appeals: [],
            isLocked: true,
            sourceRequestId: 'r-done',
            requestOutcomeStatus: 'approved',
        };

        const feed = buildLawyerMotionUnifiedFeed([pending], [decision]);
        expect(feed).toHaveLength(2);
        expect(feed[0]?.kind).toBe('pending_request');
        expect(feed[1]?.kind).toBe('decision');
    });

    it('sorts lawyer requests newest first', () => {
        const sorted = sortLawyerRequestsNewestFirst([
            { id: 'a', requestDate: '2026-05-01', type: 'x', lawyerNote: '', status: 'pending' },
            { id: 'b', requestDate: '2026-05-28', type: 'y', lawyerNote: '', status: 'pending' },
        ]);
        expect(sorted.map((r) => r.id)).toEqual(['b', 'a']);
    });
});
