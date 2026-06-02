import { describe, expect, it } from 'vitest';
import type { JourneyNode } from '@/app/types/criminal';
import type { CriminalCase, StageConclusion } from './criminalStore';
import { resolvePendingJourneyOrder } from './journeyOrderApplyEngine';

function baseCase(partial: Partial<CriminalCase> = {}): CriminalCase {
    return {
        id: 'c1',
        basics: { stage: 'مرحلة التحقيق', crimeType: 'جنحة', legalArticle: '1' },
        location: {
            investigationCourtName: 'تحقيق',
            courtName: 'محكمة جنح الكرادة',
            caseNumber: '2026/100',
            publicProsecutionNumber: '',
            papersAt: '',
            depositionEntityName: '',
        },
        defendants: [],
        complainants: [],
        statements: [],
        timelineEvents: [],
        investigationLogs: [],
        proceduralContainers: [],
        legalArticleHistory: [],
        stageJourney: [
            { id: '1', stage: 'investigation', label: 'مرحلة التحقيق', status: 'current' },
        ],
        ...partial,
    } as CriminalCase;
}

describe('journeyOrderApplyEngine', () => {
    it('detects referral finalDecision while journey still at investigation', () => {
        const conclusion: StageConclusion = {
            id: 'fd1',
            stageType: 'misdemeanor',
            decisionType: 'referral',
            date: '2026-05-01',
            details: 'إحالة',
            defendantStatusAtDecision: 'bailed',
        };
        const pending = resolvePendingJourneyOrder(
            baseCase({
                finalDecision: conclusion,
                courtCaseNumber: '2026/100',
            }),
        );
        expect(pending?.actionId).toBe('refer_misdemeanor');
        expect(pending?.sourceFinalDecision?.id).toBe('fd1');
    });

    it('detects trial record stage without journey advance', () => {
        const pending = resolvePendingJourneyOrder(
            baseCase({
                caseStage: 'misdemeanor',
                basics: { stage: 'محكمة الجنح', crimeType: 'جنحة', legalArticle: '1' },
                courtCaseNumber: '2026/55',
            }),
        );
        expect(pending?.actionId).toBe('refer_misdemeanor');
    });

    it('returns null when journey already at trial', () => {
        const journey: JourneyNode[] = [
            {
                id: '1',
                stage: 'investigation',
                label: 'تحقيق',
                status: 'past',
                transitionText: 'قرار إحالة (محكمة الجنح)',
            },
            {
                id: '2',
                stage: 'misdemeanor',
                label: 'محكمة جنح: 2026/100',
                status: 'current',
            },
        ];
        expect(resolvePendingJourneyOrder(baseCase({ stageJourney: journey, caseStage: 'misdemeanor' }))).toBeNull();
    });

    it('detects jurisdiction swap route not yet on journey', () => {
        const journey: JourneyNode[] = [
            { id: '1', stage: 'misdemeanor', label: 'محكمة جنح', status: 'current' },
        ];
        const conclusion: StageConclusion = {
            id: 'fd2',
            stageType: 'felony',
            decisionType: 'misdemeanor_to_felony_jurisdiction',
            date: '2026-06-01',
            details: 'عدم اختصاص',
            defendantStatusAtDecision: 'bailed',
        };
        const pending = resolvePendingJourneyOrder(
            baseCase({
                stageJourney: journey,
                caseStage: 'misdemeanor',
                courtCaseNumber: '2026/200',
                finalDecision: conclusion,
            }),
        );
        expect(pending?.actionId).toBe('misdemeanor_to_felony_jurisdiction');
    });
});
