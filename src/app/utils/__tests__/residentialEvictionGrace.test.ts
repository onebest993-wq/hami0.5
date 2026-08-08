import { describe, expect, it } from 'vitest';
import {
    buildResidentialGraceEarlyEndApprovalMerge,
    hasActiveResidentialEvictionGrace,
} from '@/app/utils/residentialEvictionGrace';

describe('hasActiveResidentialEvictionGrace', () => {
    it('returns false without registered start and end dates', () => {
        expect(
            hasActiveResidentialEvictionGrace({
                premisesUse: 'residential',
                gracePeriodStart: null,
                vacateDeadline: '2099-12-31',
            })
        ).toBe(false);
    });

    it('returns false when manually ended', () => {
        expect(
            hasActiveResidentialEvictionGrace({
                premisesUse: 'residential',
                gracePeriodStart: '2026-01-01',
                vacateDeadline: '2099-12-31',
                manuallyEndedAt: '2026-02-01T00:00:00.000Z',
            })
        ).toBe(false);
    });

    it('returns false when vacate deadline passed', () => {
        expect(
            hasActiveResidentialEvictionGrace({
                premisesUse: 'residential',
                gracePeriodStart: '2020-01-01',
                vacateDeadline: '2020-01-02',
            })
        ).toBe(false);
    });

    it('returns true for active residential grace', () => {
        expect(
            hasActiveResidentialEvictionGrace({
                premisesUse: 'residential',
                gracePeriodStart: '2026-01-01',
                vacateDeadline: '2099-12-31',
            })
        ).toBe(true);
    });
});

describe('buildResidentialGraceEarlyEndApprovalMerge', () => {
    it('clears grace fields and grace tasks', () => {
        const merge = buildResidentialGraceEarlyEndApprovalMerge({
            caseTasksPending: [
                { id: 'eviction-residential-grace-1', title: 'x', body: '', dueDate: '2026-01-01' },
                { id: 'other', title: 'y', body: '', dueDate: '2026-01-02' },
            ],
        } as any);
        expect(merge.eviction_vacate_deadline).toBeNull();
        expect(merge.eviction_residential_grace_period_start).toBeNull();
        expect(merge.caseTasksPending).toEqual([
            { id: 'other', title: 'y', body: '', dueDate: '2026-01-02' },
        ]);
    });
});
