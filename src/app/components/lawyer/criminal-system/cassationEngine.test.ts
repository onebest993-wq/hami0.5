import { describe, expect, it } from 'vitest';
import type { CriminalCase } from './criminalStore';
import {
    applyCassationFiling,
    applyCassationOutcome,
    cassationUsesVerticalAscend,
    isUnderInterventionReview,
    recordCassationResult,
    resolveQuashBeneficiaryIds,
    stageConclusionToCassationPayload,
} from './cassationEngine';

function baseCase(): CriminalCase {
    return {
        id: 'c1',
        createdAt: '2026-01-01',
        basics: {
            role: 'وكيل المتهم',
            ourRepresentation: 'defendant_side',
            stage: 'محكمة الجنح',
            legalArticle: '405',
            crimeType: 'جنحة',
        },
        location: {
            investigationCourtName: '',
            investigationPapersAt: '',
            policeStationName: '',
            baseRegisterNumberAndDate: '',
            investigationOfficeName: '',
            investigationDossierNumber: '',
            courtName: 'جنح',
            caseNumber: '1/2026',
        },
        complainants: [],
        unknownDefendant: false,
        defendants: [
            { id: 'd1', fullName: 'أ', status: 'مكفول', address: '' },
            { id: 'd2', fullName: 'ب', status: 'مكفول', address: '' },
        ],
        statements: [],
        timelineEvents: [],
        investigationLogs: [],
        lawyerRequests: [],
        physicalLocation: 'judge_desk',
        isMutualComplaint: false,
        legalArticleHistory: [],
        caseStage: 'misdemeanor',
        stageJourney: [{ id: '1', stage: 'investigation', label: 'تحقيق', status: 'past' }],
    } as CriminalCase;
}

describe('cassationEngine', () => {
    it('resolves beneficiaries: shared 269b vs personal target', () => {
        const defs = baseCase().defendants ?? [];
        const all = resolveQuashBeneficiaryIds(defs, ['d1'], true);
        expect(all).toEqual(['d1', 'd2']);
        const personal = resolveQuashBeneficiaryIds(defs, ['d1'], false, ['d1']);
        expect(personal).toEqual(['d1']);
    });

    it('flags intervention review and blocks material adds semantically', () => {
        const filed = applyCassationFiling(baseCase(), {
            cassationType: 'prosecution_intervention_264b',
            filedAt: '2026-05-21',
            details: 'تدخل',
            cassationNumber: 'INT/1',
            interventionBasis: 'prosecutor_general_review',
            appellantDefendantIds: ['d1'],
        });
        expect(isUnderInterventionReview(filed)).toBe(true);
        expect(filed.cassationProceeding?.status).toBe('under_intervention_review');
        expect(filed.basics.stage).toBe('محكمة الجنح');
    });

    it('vertical ascend for felony federal cassation', () => {
        const c = { ...baseCase(), basics: { ...baseCase().basics, crimeType: 'جناية' as const }, caseStage: 'felony' as const };
        expect(cassationUsesVerticalAscend('federal_cassation_felony')).toBe(true);
        const filed = applyCassationFiling(c, {
            cassationType: 'federal_cassation_felony',
            filedAt: '2026-05-21',
            details: 'طعن',
            cassationNumber: 'F/1',
            panelName: 'تمييز',
            appellantDefendantIds: ['d1'],
        });
        expect(filed.caseStage).toBe('cassation');
        expect(filed.stageJourney?.some((n) => n.stage === 'cassation')).toBe(true);
    });

    it('investigation judge appeal keeps investigation stage', () => {
        const c = { ...baseCase(), basics: { ...baseCase().basics, stage: 'مرحلة التحقيق' }, caseStage: 'investigation' as const };
        const filed = applyCassationFiling(c, {
            cassationType: 'investigation_judge_appeal',
            filedAt: '2026-05-21',
            details: 'طعن تحقيق',
            cassationNumber: 'INV/1',
            panelName: 'جنايات',
            appellantDefendantIds: ['d1'],
        });
        expect(filed.caseStage).toBe('investigation');
        expect(filed.basics.stage).toBe('مرحلة التحقيق');
    });

    it('investigation judge appeal preserves juvenile investigation stored stage', () => {
        const c = {
            ...baseCase(),
            basics: { ...baseCase().basics, stage: 'تحقيق الأحداث' as const },
            caseStage: 'investigation' as const,
        };
        const filed = applyCassationFiling(c, {
            cassationType: 'investigation_judge_appeal',
            filedAt: '2026-05-21',
            details: 'طعن تحقيق أحداث',
            cassationNumber: 'INV/J',
            panelName: 'تمييز',
            appellantDefendantIds: ['d1'],
        });
        expect(filed.basics.stage).toBe('تحقيق الأحداث');
    });

    it('applies quash remand with shared objective grounds to all defendants', () => {
        let c = applyCassationFiling(baseCase(), {
            cassationType: 'criminal_cassation_misdemeanor',
            filedAt: '2026-05-21',
            details: 'طعن',
            cassationNumber: 'C/1',
            panelName: 'هيئة',
            appellantDefendantIds: ['d1'],
        });
        c = applyCassationOutcome(c, {
            id: 'x',
            stageType: 'cassation',
            decisionType: 'cassation_quash_remand',
            date: '2026-06-01',
            details: 'نقض',
            defendantStatusAtDecision: 'bailed',
            sharedObjectiveGrounds269b: true,
        });
        expect(c.defendants?.every((d) => d.personalStage === 'referred_to_trial')).toBe(true);
        expect(c.isInvestigationLocked).toBe(false);
    });

    it('quash acquit release only targets appellant when personal grounds', () => {
        let c = applyCassationFiling(baseCase(), {
            cassationType: 'criminal_cassation_misdemeanor',
            filedAt: '2026-05-21',
            details: 'طعن',
            cassationNumber: 'C/2',
            panelName: 'هيئة',
            appellantDefendantIds: ['d1'],
        });
        c = applyCassationOutcome(c, {
            id: 'y',
            stageType: 'cassation',
            decisionType: 'cassation_quash_acquit_release',
            date: '2026-06-02',
            details: 'إفراج',
            defendantStatusAtDecision: 'bailed',
            sharedObjectiveGrounds269b: false,
            targetDefendantIds: ['d1'],
        });
        expect(c.defendants?.find((d) => d.id === 'd1')?.personalStage).toBe('acquitted');
        expect(c.defendants?.find((d) => d.id === 'd2')?.personalStage).not.toBe('acquitted');
    });

    it('recordCassationResult affirmation closes and locks', () => {
        let c = applyCassationFiling(baseCase(), {
            cassationType: 'criminal_cassation_misdemeanor',
            filedAt: '2026-05-21',
            details: 'طعن',
            cassationNumber: 'C/3',
            panelName: 'هيئة',
            appellantDefendantIds: ['d1'],
        });
        const affirmed = recordCassationResult(c, {
            result: 'affirmation',
            date: '2026-07-01',
            details: 'تصديق',
            isObjectiveGrounds: false,
        });
        c = affirmed.caseRecord;
        expect(c.cassationProceeding?.outcome).toBe('confirm');
        expect(c.isFrozen).toBe(true);
        expect(c.isArchived).toBe(true);
    });

    it('recordCassationResult quash_dismissal locks only beneficiaries as acquitted', () => {
        let c = applyCassationFiling(baseCase(), {
            cassationType: 'criminal_cassation_misdemeanor',
            filedAt: '2026-05-21',
            details: 'طعن',
            cassationNumber: 'C/4',
            panelName: 'هيئة',
            appellantDefendantIds: ['d1'],
        });
        const dismissed = recordCassationResult(c, {
            result: 'quash_dismissal',
            date: '2026-07-02',
            details: 'إفراج نهائي',
            isObjectiveGrounds: false,
            targetDefendantIds: ['d1'],
        });
        c = dismissed.caseRecord;
        expect(c.defendants?.find((d) => d.id === 'd1')?.personalStage).toBe('acquitted');
        expect(c.defendants?.find((d) => d.id === 'd1')?.isPartyRecordLocked).toBe(true);
        expect(c.defendants?.find((d) => d.id === 'd2')?.personalStage).not.toBe('acquitted');
    });

    it('blocks personal quash_dismissal when beneficiaryIds are empty', () => {
        let c = applyCassationFiling(baseCase(), {
            cassationType: 'criminal_cassation_misdemeanor',
            filedAt: '2026-05-21',
            details: 'طعن',
            cassationNumber: 'C/5',
            panelName: 'هيئة',
            appellantDefendantIds: ['d1'],
        });
        const before = c.defendants?.map((d) => d.personalStage);
        const blocked = recordCassationResult(c, {
            result: 'quash_dismissal',
            date: '2026-07-03',
            details: 'محاولة إفراج الجميع',
            isObjectiveGrounds: false,
            targetDefendantIds: [],
        });
        expect(blocked.error).toBeTruthy();
        expect(blocked.caseRecord.defendants?.map((d) => d.personalStage)).toEqual(before);
        expect(blocked.caseRecord.defendants?.every((d) => d.personalStage !== 'acquitted')).toBe(true);
    });

    it('stageConclusionToCassationPayload maps menu cassation_confirm to affirmation engine path', () => {
        let c = applyCassationFiling(baseCase(), {
            cassationType: 'criminal_cassation_misdemeanor',
            filedAt: '2026-05-21',
            details: 'طعن',
            cassationNumber: 'C/6',
            panelName: 'هيئة',
            appellantDefendantIds: ['d1'],
        });
        const payload = stageConclusionToCassationPayload(c, {
            id: 'x',
            stageType: 'cassation',
            decisionType: 'cassation_confirm',
            date: '2026-08-02',
            details: 'تصديق من القائمة',
            defendantStatusAtDecision: 'bailed',
        });
        expect(payload?.result).toBe('affirmation');
        const out = recordCassationResult(c, payload!);
        expect(out.caseRecord.cassationProceeding?.outcome).toBe('confirm');
        expect(out.caseRecord.isFrozen).toBe(true);
    });

    it('creates virtual proceeding when recording from judicial path without active proceeding', () => {
        const c = baseCase();
        const out = recordCassationResult(c, {
            result: 'affirmation',
            date: '2026-08-01',
            details: 'من السجل القضائي',
            isObjectiveGrounds: false,
            virtualAppellantDefendantIds: ['d1'],
        });
        expect(out.error).toBeUndefined();
        expect(out.caseRecord.cassationProceeding?.cassationNumber).toBe('سجل قضائي');
        expect(out.caseRecord.cassationProceeding?.outcome).toBe('confirm');
    });

    it('blocks personal affirmation without explicit virtual appellant', () => {
        const c = baseCase();
        const out = recordCassationResult(c, {
            result: 'affirmation',
            date: '2026-08-01',
            details: 'تصديق شخصي',
            isObjectiveGrounds: false,
        });
        expect(out.error).toMatch(/متهم واحد على الأقل/);
        expect(out.caseRecord.cassationProceeding).toBeUndefined();
    });

    it('blocks personal quash_modify when beneficiaries empty and does not change case article', () => {
        const c = baseCase();
        const beforeArticle = c.basics.legalArticle;
        const blocked = recordCassationResult(c, {
            result: 'quash_modify',
            date: '2026-08-02',
            details: 'تعديل',
            isObjectiveGrounds: false,
            targetDefendantIds: [],
            virtualAppellantDefendantIds: ['d1'],
            modifiedArticle: '999',
            modifiedCharge: 'جنحة',
        });
        expect(blocked.error).toMatch(/269\/ب/);
        expect(blocked.caseRecord.basics.legalArticle).toBe(beforeArticle);
    });

    it('quash_modify personal applies convicted stage only to beneficiaries', () => {
        const c = baseCase();
        const out = recordCassationResult(c, {
            result: 'quash_modify',
            date: '2026-08-03',
            details: 'تخفيف',
            isObjectiveGrounds: false,
            targetDefendantIds: ['d1'],
            virtualAppellantDefendantIds: ['d1'],
            modifiedArticle: '413',
            modifiedCharge: 'إيذاء بسيط',
        });
        expect(out.error).toBeUndefined();
        expect(out.caseRecord.basics.legalArticle).toBe('405');
        expect(out.caseRecord.defendants?.find((d) => d.id === 'd1')?.personalStage).toBe('convicted');
        expect(out.caseRecord.defendants?.find((d) => d.id === 'd2')?.personalStage).not.toBe('convicted');
    });

    it('quash_modify shared 269b updates case-level legal article', () => {
        const c = baseCase();
        const out = recordCassationResult(c, {
            result: 'quash_modify',
            date: '2026-08-04',
            details: 'تعديل مشترك',
            isObjectiveGrounds: true,
            modifiedArticle: '413',
            modifiedCharge: 'إيذاء',
        });
        expect(out.error).toBeUndefined();
        expect(out.caseRecord.basics.legalArticle).toBe('413');
    });

    it('timelineOverlay customizes judicial-path timeline title without duplicate events', () => {
        const c = baseCase();
        const out = recordCassationResult(c, {
            result: 'quash_dismissal',
            date: '2026-08-06',
            details: 'شارة',
            isObjectiveGrounds: true,
            targetDefendantIds: ['d1'],
            virtualAppellantDefendantIds: ['d1'],
            timelineOverlay: {
                title: '✨ استدراك تمييزي',
                category: 'نتيجة تمييزية على قرار',
            },
        });
        const titles = (out.caseRecord.timelineEvents ?? []).map((e) => e.title);
        const appealTitles = titles.filter((t) => t.includes('استدراك'));
        expect(appealTitles).toHaveLength(1);
        expect(appealTitles[0]).toBe('✨ استدراك تمييزي');
    });

    it('stageConclusion maps cassation_quash_trial_misdemeanor with 269b flag', () => {
        const payload = stageConclusionToCassationPayload(baseCase(), {
            id: 'z',
            stageType: 'cassation',
            decisionType: 'cassation_quash_trial_misdemeanor',
            date: '2026-08-05',
            details: 'إعادة جنح',
            defendantStatusAtDecision: 'bailed',
            sharedObjectiveGrounds269b: true,
            targetDefendantIds: ['d1'],
        });
        expect(payload?.result).toBe('quash_remand');
        expect(payload?.remandTargetStage).toBe('misdemeanor');
        expect(payload?.isObjectiveGrounds).toBe(true);
    });
});
