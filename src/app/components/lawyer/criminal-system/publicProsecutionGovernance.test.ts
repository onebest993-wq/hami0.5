import { describe, expect, it } from 'vitest';
import type { CriminalCase } from './criminalStore';
import {
    PUBLIC_RIGHT_COMPLAINANT_NAME,
    applyPublicRightAfterPrivateWaiver,
    isPublicRightComplainantName,
    makePublicRightComplainant,
    resolveEffectiveComplainantsForDisplay,
} from './publicProsecutionGovernance';

function baseCase(overrides: Partial<CriminalCase> = {}): CriminalCase {
    return {
        id: 'case-1',
        caseNumber: '2026/1',
        basics: { crimeType: 'سرقة', legalArticle: '443', court: '', prosecutor: '' },
        complainants: [{ id: 'c1', fullName: 'أحمد', address: '', phone: '' }],
        defendants: [{ id: 'd1', fullName: 'علي', address: '', phone: '' }],
        stage: 'investigation',
        ourRepresentation: 'complainant',
        ...overrides,
    } as CriminalCase;
}

describe('publicProsecutionGovernance', () => {
    it('recognizes public-right complainant names', () => {
        expect(isPublicRightComplainantName(PUBLIC_RIGHT_COMPLAINANT_NAME)).toBe(true);
        expect(isPublicRightComplainantName('الادعاء العام')).toBe(true);
        expect(isPublicRightComplainantName('أحمد')).toBe(false);
    });

    it('returns only public prosecution complainant when flag is set', () => {
        const displayed = resolveEffectiveComplainantsForDisplay(
            baseCase({
                isPublicProsecutionComplainant: true,
                complainants: [makePublicRightComplainant()],
            }),
        );
        expect(displayed).toHaveLength(1);
        expect(displayed[0]?.fullName).toBe(PUBLIC_RIGHT_COMPLAINANT_NAME);
    });

    it('promotes public right after private waiver when article includes public right', () => {
        const displayed = resolveEffectiveComplainantsForDisplay(
            baseCase({
                articleIncludesPublicRight: true,
                isPrivateRightWaived: true,
                complainants: [{ id: 'c1', fullName: 'أحمد', address: '', phone: '' }],
            }),
        );
        expect(displayed.some((c) => c.fullName === PUBLIC_RIGHT_COMPLAINANT_NAME)).toBe(true);
        expect(displayed.some((c) => c.fullName === 'أحمد')).toBe(true);
    });

    it('applyPublicRightAfterPrivateWaiver prepends public complainant once', () => {
        const next = applyPublicRightAfterPrivateWaiver(
            baseCase({
                articleIncludesPublicRight: true,
                isPrivateRightWaived: true,
            }),
        );
        const publicOnes = next.complainants.filter((c) => c.fullName === PUBLIC_RIGHT_COMPLAINANT_NAME);
        expect(publicOnes).toHaveLength(1);
    });

    it('does not add public complainant when article flag is off', () => {
        const next = applyPublicRightAfterPrivateWaiver(
            baseCase({
                articleIncludesPublicRight: false,
                isPrivateRightWaived: true,
            }),
        );
        expect(next.complainants.every((c) => c.fullName !== PUBLIC_RIGHT_COMPLAINANT_NAME)).toBe(true);
    });
});
