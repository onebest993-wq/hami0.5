import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import { resolveAppealStageFooterEligibility } from '../appealStageFooter';

describe('appealStageFooter', () => {
    it('shows register opponent cassation when appeal won and waiting', () => {
        const stages = [
            { id: '1', stageName: 'البداءة', status: 'locked' },
            {
                id: '2',
                stageName: 'الاستئناف',
                status: 'active',
                isPleadingsClosed: true,
                finalDecision: 'محسومة لصالح الموكل - بانتظار تمييز الخصم',
                awaitingOpponentAppeal: true,
            },
        ] as CaseStage[];

        const result = resolveAppealStageFooterEligibility(stages[1], 'بانتظار التمييز', stages);
        expect(result).toEqual({ show: true, kind: 'register_opponent_cassation' });
    });

    it('shows file cassation when client lost on appeal', () => {
        const stages = [
            {
                id: '2',
                stageName: 'الاستئناف',
                status: 'active',
                isPleadingsClosed: true,
                finalDecision: 'محسومة ضد الموكل - بانتظار الطعن',
                decisionDate: '2026-06-18',
            },
        ] as CaseStage[];

        const result = resolveAppealStageFooterEligibility(stages[0], 'نشطة', stages);
        expect(result).toEqual({ show: true, kind: 'file_cassation' });
    });

    it('hides when cassation stage is already active', () => {
        const stages = [
            {
                id: '2',
                stageName: 'الاستئناف',
                status: 'active',
                isPleadingsClosed: true,
                finalDecision: 'محسومة ضد الموكل',
            },
            { id: '3', stageName: 'التمييز', status: 'active' },
        ] as CaseStage[];

        expect(resolveAppealStageFooterEligibility(stages[0], 'نشطة', stages).show).toBe(false);
    });
});
