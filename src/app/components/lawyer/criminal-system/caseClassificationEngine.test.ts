import { describe, expect, it } from 'vitest';
import {
    applyReferralClassificationOverride,
    isSummaryProcedurePath,
    resolveCaseSovereignContext,
    resolveMisdemeanorType,
} from './caseClassificationEngine';
import type { CriminalCase } from './criminalStore';

function baseCase(partial: Partial<CriminalCase> = {}): CriminalCase {
    return {
        id: 'c1',
        createdAt: '2026-01-01',
        basics: { role: 'defense', ourRepresentation: 'defendant', stage: 'محكمة الجنح', legalArticle: '413', crimeType: 'جنحة' },
        location: {
            investigationCourtName: '',
            investigationPapersAt: 'prosecution',
            policeStationName: '',
            baseRegisterNumberAndDate: '',
            investigationOfficeName: '',
            investigationDossierNumber: '',
            courtName: 'محكمة جنح',
            caseNumber: '1/2026',
            publicProsecutionNumber: '',
            trialJudgeName: '',
            nextHearingDate: '',
        },
        complainants: [],
        unknownDefendant: false,
        defendants: [],
        statements: [],
        otherEvidenceItems: [],
        timelineEvents: [],
        investigationLogs: [],
        proceduralContainers: [],
        lawyerRequests: [],
        trials: [],
        trialDepositions: [],
        physicalLocation: 'judge_desk',
        isMutualComplaint: false,
        legalArticleHistory: [],
        caseStage: 'misdemeanor',
        currentAccusationArticle: '413',
        ...partial,
    } as CriminalCase;
}

describe('caseClassificationEngine', () => {
    it('treats violations as summary procedure', () => {
        const ctx = resolveCaseSovereignContext(
            baseCase({ basics: { ...baseCase().basics, crimeType: 'مخالفة' } }),
        );
        expect(ctx.case_classification).toBe('مخالفة');
        expect(ctx.misdemeanor_type).toBe('موجزة');
        expect(ctx.isSummaryProcedure).toBe(true);
    });

    it('treats felonies as non-summary', () => {
        const ctx = resolveCaseSovereignContext(
            baseCase({ caseStage: 'felony', basics: { ...baseCase().basics, crimeType: 'جناية', stage: 'محكمة الجنايات' } }),
        );
        expect(ctx.case_classification).toBe('جناية');
        expect(ctx.misdemeanor_type).toBe('غير موجزة');
        expect(ctx.isSummaryProcedure).toBe(false);
    });

    it('infers summary misdemeanor from referral text', () => {
        const type = resolveMisdemeanorType(
            baseCase(),
            'إحالة إلى محكمة الجنح بإجراء موجز وفق المواد 201-211',
        );
        expect(type).toBe('موجزة');
        expect(isSummaryProcedurePath({ case_classification: 'جنحة', misdemeanor_type: type, isSummaryProcedure: true })).toBe(true);
    });

    it('defaults misdemeanor article 413 to summary when no contrary hint', () => {
        expect(resolveMisdemeanorType(baseCase())).toBe('موجزة');
    });

    it('applyReferralClassificationOverride pins explicit misdemeanor type', () => {
        const c = baseCase();
        const updated = applyReferralClassificationOverride(c, 'misdemeanor', 'غير موجزة');
        expect(updated.case_classification).toBe('جنحة');
        expect(updated.misdemeanor_type).toBe('غير موجزة');
    });
});
