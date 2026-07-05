import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import {
    resolveAppealStageFooterEligibility,
    shouldPreferPleadingCloseFooter,
} from '../appealStageFooter';

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

    it('prefers pleading close footer for remanded appeal stage after cassation', () => {
        expect(
            shouldPreferPleadingCloseFooter({
                id: '2',
                stageName: 'الاستئناف',
                status: 'active',
                wasReopened: true,
                isPleadingsClosed: false,
            } as CaseStage),
        ).toBe(true);
    });

    it('does not prefer pleading close footer for cassation stage itself', () => {
        expect(
            shouldPreferPleadingCloseFooter({
                id: '3',
                stageName: 'التمييز',
                status: 'active',
                wasReopened: true,
            } as CaseStage),
        ).toBe(false);
    });

    it('shows opponent cassation footer for remanded appeal after issuing a new judgment', () => {
        const stages = [
            { id: '1', stageName: 'البداءة', status: 'locked' },
            {
                id: '2',
                stageName: 'الاستئناف',
                status: 'active',
                wasReopened: true,
                isPleadingsClosed: true,
                finalDecision: 'محسومة لصالح الموكل - بانتظار التمييز',
                decisionDate: '2026-07-04',
                awaitingOpponentAppeal: true,
            },
            { id: '3', stageName: 'التمييز', status: 'locked' },
        ] as CaseStage[];

        expect(resolveAppealStageFooterEligibility(stages[1], 'بانتظار التمييز', stages)).toEqual({
            show: true,
            kind: 'register_opponent_cassation',
        });
    });

    it('does not keep pleading close footer after remanded appeal judgment is already saved', () => {
        expect(
            shouldPreferPleadingCloseFooter({
                id: '2',
                stageName: 'الاستئناف',
                status: 'active',
                wasReopened: true,
                isPleadingsClosed: true,
                finalDecision: 'محسومة لصالح الموكل - بانتظار التمييز',
                decisionDate: '2026-07-04',
            } as CaseStage),
        ).toBe(false);
    });
});
