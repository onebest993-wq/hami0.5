import { describe, expect, it } from 'vitest';
import type { Decision } from '../types';
import { buildCassationCourtDecisionNext } from '../utils/cassationCourtDecisionCommit';

function baseParent(): Decision {
    return {
        id: 'req-forced-bring',
        title: 'طلب إحضار جبري',
        requestKind: 'personal_coercive',
        personalCoerciveSubtype: 'forced_bring_in',
        executorOutcome: 'approved',
        appealRequestOrigin: 'creditor_side',
        status: 'accepted',
        activeAppealCopyId: 'appeal_copy_1',
        appealStatus: 'tamyeez_filed',
        appealMethod: 'tamyeez',
        appealActor: 'lawyer',
    } as Decision;
}

function appealCopy(parentId: string): Decision {
    return {
        id: 'appeal_copy_1',
        appealSourceDecisionId: parentId,
        title: 'طلب إحضار جبري',
        requestKind: 'personal_coercive',
        personalCoerciveSubtype: 'forced_bring_in',
        executorOutcome: 'approved',
        appealRequestOrigin: 'creditor_side',
        appealStatus: 'tamyeez_filed',
        appealMethod: 'tamyeez',
        appealActor: 'lawyer',
        tamyeezDecisionNumber: 'rretersdfsd',
        appealBaseBranch: 'after_approval',
    } as Decision;
}

describe('buildCassationCourtDecisionNext', () => {
    it('merges appeal copy into parent and removes copy on تصديق القرار', () => {
        const parent = baseParent();
        const copy = appealCopy(parent.id);
        const decisions = [parent, copy];

        const { next, mergedRowId, labelAr } = buildCassationCourtDecisionNext(
            decisions,
            copy,
            'rad_laheeza',
            'creditor_agent'
        );

        expect(labelAr).toBe('تصديق القرار');
        expect(mergedRowId).toBe(parent.id);
        expect(next.map((d) => d.id)).toEqual([parent.id]);
        const merged = next[0];
        expect(merged.appealStatus).toBe('final');
        expect(merged.appealResult).toBe('تصديق القرار');
        expect(merged.activeAppealCopyId).toBeNull();
        expect(merged.tamyeezDecisionNumber).toBe('rretersdfsd');
        /** تمييز المحامي على طلب دائن: تصديق = عدم منح الطعن لصالح الدائن */
        expect(merged.executorOutcome).toBe('rejected');
    });

    it('flips or resumes creditor request on نقض القرار per lawyer-cassation resume rules', () => {
        const parent = baseParent();
        const copy = appealCopy(parent.id);
        const decisions = [parent, copy];

        const { next } = buildCassationCourtDecisionNext(
            decisions,
            copy,
            'naqd',
            'creditor_agent'
        );

        const merged = next[0];
        expect(merged.appealResult).toBe('نقض القرار');
        expect(merged.appealStatus).toBe('final');
        expect(next.map((d) => d.id)).toEqual([parent.id]);
        expect(['approved', 'rejected']).toContain(merged.executorOutcome);
    });
});
