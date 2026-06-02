import { describe, expect, it } from 'vitest';
import {
    normalizeDecisionTargetIds,
    resolvePersonalStageTargets,
    scopeStageConclusionTargets,
} from './criminalCaseGovernance';
import type { CriminalCase, StageConclusion } from './criminalStore';

function miniCase(): CriminalCase {
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
            courtName: '',
            caseNumber: '',
        },
        complainants: [],
        unknownDefendant: false,
        defendants: [
            { id: 'a', fullName: 'أ', status: '', address: '' },
            { id: 'b', fullName: 'ب', status: '', address: '' },
        ],
        statements: [],
        timelineEvents: [],
        investigationLogs: [],
        lawyerRequests: [],
        physicalLocation: 'custom',
        isMutualComplaint: false,
        legalArticleHistory: [],
    } as CriminalCase;
}

describe('criminalCaseGovernance', () => {
    it('prefers targetDefendantIds over defendantIds', () => {
        const c: StageConclusion = {
            id: '1',
            stageType: 'misdemeanor',
            decisionType: 'acquittal',
            date: '2026-01-01',
            details: '',
            defendantStatusAtDecision: 'bailed',
            defendantIds: ['b'],
            targetDefendantIds: ['a'],
        };
        expect(normalizeDecisionTargetIds(c)).toEqual(['a']);
    });

    it('scopeStageConclusionTargets mirrors ids to both fields', () => {
        const scoped = scopeStageConclusionTargets({
            id: '1',
            stageType: 'misdemeanor',
            decisionType: 'conviction',
            date: '2026-01-01',
            details: '',
            defendantStatusAtDecision: 'detained',
            targetDefendantIds: ['a'],
        });
        expect(scoped.defendantIds).toEqual(['a']);
        expect(scoped.targetDefendantIds).toEqual(['a']);
    });

    it('resolvePersonalStageTargets returns empty when unscoped non-global decision', () => {
        const ids = resolvePersonalStageTargets(miniCase(), {
            id: '1',
            stageType: 'misdemeanor',
            decisionType: 'acquittal',
            date: '2026-01-01',
            details: '',
            defendantStatusAtDecision: 'bailed',
        });
        expect(ids).toEqual([]);
    });
});
