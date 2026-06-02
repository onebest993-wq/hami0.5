import { describe, expect, it } from 'vitest';
import {
    buildVerdictCardFromConclusion,
    upsertVerdictCardFromConclusion,
    verdictOutcomeLabel,
} from './verdictCardsEngine';
import type { CriminalCase, StageConclusion } from './criminalStore';

const baseCase = (): CriminalCase =>
    ({
        id: 'c1',
        stageJourney: [{ id: '1', stage: 'misdemeanor', label: 'محكمة جنح', status: 'current' }],
        caseStage: 'misdemeanor',
    }) as CriminalCase;

describe('verdictCardsEngine', () => {
    it('builds colored-outcome card with 30-day appeal deadline', () => {
        const conclusion: StageConclusion = {
            id: 'v1',
            stageType: 'misdemeanor',
            decisionType: 'acquittal',
            date: '2026-06-01',
            details: 'براءة لعدم كفاية الأدلة',
            defendantStatusAtDecision: 'bailed',
        };
        const card = buildVerdictCardFromConclusion(baseCase(), conclusion);
        expect(card?.outcome).toBe('acquittal');
        expect(verdictOutcomeLabel('acquittal')).toContain('براءة');
        expect(card?.appealDeadline).toBe('2026-07-01');
        expect(card?.proceduralNodeId).toBe('1');
    });

    it('upserts without duplicating same conclusion', () => {
        const conclusion: StageConclusion = {
            id: 'v2',
            stageType: 'misdemeanor',
            decisionType: 'conviction',
            date: '2026-06-02',
            details: '',
            defendantStatusAtDecision: 'detained',
        };
        const once = upsertVerdictCardFromConclusion(baseCase(), conclusion);
        const twice = upsertVerdictCardFromConclusion(once, conclusion);
        expect((twice.verdictCards ?? []).length).toBe(1);
    });
});
