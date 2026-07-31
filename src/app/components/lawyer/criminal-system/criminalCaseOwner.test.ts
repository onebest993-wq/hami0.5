import { describe, expect, it } from 'vitest';
import {
    canMutateCriminalCaseForLawyer,
    claimOrphanCriminalCaseOwnership,
    claimUnownedCriminalCases,
    filterCriminalCasesForLawyer,
    isCriminalCaseVisibleToLawyer,
    isOrphanCriminalCase,
} from './criminalCaseOwner';
import type { CriminalCase } from './criminalCaseModel';

function stubCase(partial: Partial<CriminalCase> & { id: string }): CriminalCase {
    return {
        id: partial.id,
        createdAt: '2026-01-01T00:00:00.000Z',
        ownerLawyerId: partial.ownerLawyerId,
        basics: {
            role: 'وكيل المشتكي',
            ourRepresentation: 'complainant_side',
            stage: 'مرحلة التحقيق',
            legalArticle: '413',
            crimeType: 'جنحة',
        },
        location: {
            investigationCourtName: '',
            investigationPapersAt: '',
            policeStationName: '',
            baseRegisterNumberAndDate: '',
            investigationOfficeName: '',
            investigationDossierNumber: '',
            courtName: '',
            caseNumber: '',
            publicProsecutionNumber: '',
            trialJudgeName: '',
            nextHearingDate: '',
        },
        complainants: [],
        defendants: [],
        statements: [],
        timelineEvents: [],
        investigationLogs: [],
        lawyerRequests: [],
        legalArticleHistory: [],
        ...partial,
    } as CriminalCase;
}

describe('criminalCaseOwner', () => {
    it('shows legacy unowned cases to any signed-in lawyer', () => {
        expect(isCriminalCaseVisibleToLawyer({ ownerLawyerId: undefined }, 'lawyer-a')).toBe(true);
        expect(isCriminalCaseVisibleToLawyer({ ownerLawyerId: '' }, 'lawyer-a')).toBe(true);
    });

    it('hides cases owned by another lawyer', () => {
        expect(isCriminalCaseVisibleToLawyer({ ownerLawyerId: 'lawyer-b' }, 'lawyer-a')).toBe(false);
        expect(isCriminalCaseVisibleToLawyer({ ownerLawyerId: 'lawyer-a' }, 'lawyer-a')).toBe(true);
    });

    it('mutation gate matches ownership', () => {
        expect(canMutateCriminalCaseForLawyer({ ownerLawyerId: 'lawyer-b' }, 'lawyer-a')).toBe(false);
        expect(canMutateCriminalCaseForLawyer({ ownerLawyerId: 'lawyer-a' }, 'lawyer-a')).toBe(true);
        expect(canMutateCriminalCaseForLawyer({ ownerLawyerId: '' }, 'lawyer-a')).toBe(false);
    });

    it('filters the archive list by session lawyer', () => {
        const cases = [
            stubCase({ id: '1', ownerLawyerId: 'a' }),
            stubCase({ id: '2', ownerLawyerId: 'b' }),
            stubCase({ id: '3' }),
        ];
        expect(filterCriminalCasesForLawyer(cases, 'a').map((c) => c.id)).toEqual(['1', '3']);
    });

    it('does not silently claim all orphan cases for the first session lawyer', () => {
        const casesById = {
            owned: stubCase({ id: 'owned', ownerLawyerId: 'a' }),
            orphan: stubCase({ id: 'orphan' }),
        };
        const { next, claimedIds } = claimUnownedCriminalCases(casesById, 'a');
        expect(claimedIds).toEqual([]);
        expect(next.orphan.ownerLawyerId).toBeUndefined();
        expect(next.owned.ownerLawyerId).toBe('a');
    });

    it('detects orphan legacy cases', () => {
        expect(isOrphanCriminalCase({ ownerLawyerId: '' })).toBe(true);
        expect(isOrphanCriminalCase({ ownerLawyerId: 'lawyer-a' })).toBe(false);
    });

    it('claims orphan ownership only when session lawyer is known', () => {
        const orphan = stubCase({ id: 'orphan' });
        const claimed = claimOrphanCriminalCaseOwnership(orphan, 'lawyer-a');
        expect(claimed?.ownerLawyerId).toBe('lawyer-a');
        expect(claimOrphanCriminalCaseOwnership(orphan, '')).toBeNull();
        const owned = stubCase({ id: 'owned', ownerLawyerId: 'lawyer-b' });
        expect(claimOrphanCriminalCaseOwnership(owned, 'lawyer-a')).toBeNull();
    });
});
