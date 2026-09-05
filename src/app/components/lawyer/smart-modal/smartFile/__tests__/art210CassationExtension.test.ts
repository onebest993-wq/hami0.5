import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import { patchDossierAfterCassationRemand } from '../art210CassationExtension';
import {
    LANE_STATE_CASSATION,
    LANE_STATE_LAPSED_EXECUTABLE,
    LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
} from '@/app/domain/lawsuit/partyChallengeLanes';

function dossier(integrity: 'indivisible' | 'severable', grounds: 'COMMON' | 'PERSONAL' = 'COMMON'): CaseStage[] {
    return [
        {
            id: 'fi',
            name: 'البداءة',
            stageName: 'البداءة',
            status: 'locked',
            disputeIntegrity: integrity,
            judgmentForm: 'مختلط',
            partyJudgmentDispositions: [
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'غيابي' },
            ],
            partyChallengeLanes: [
                {
                    partyId: '2',
                    disposition: 'حضوري',
                    laneState: LANE_STATE_CASSATION,
                },
                {
                    partyId: '3',
                    disposition: 'غيابي',
                    laneState: LANE_STATE_LAPSED_EXECUTABLE,
                    servedAt: '2026-08-04',
                },
            ],
        } as CaseStage,
        {
            id: 'cass',
            name: 'التمييز',
            stageName: 'التمييز',
            status: 'completed',
            appealMetadata: {
                appellantPartyIds: ['2'],
                appelleePartyIds: ['1', '3'],
                priorStageOutcome: 'LOSS',
                priorJudgmentForm: 'HADORI',
                cassationGroundsScope: grounds,
            },
        } as CaseStage,
    ];
}

describe('art210CassationExtension', () => {
    it('يحيي الشريك عند نقض مشترك في نزاع غير قابل للتجزئة', () => {
        const patched = patchDossierAfterCassationRemand({
            stages: dossier('indivisible', 'COMMON'),
            cassationIndex: 1,
            groundsScope: 'COMMON',
        });
        expect(patched[1]?.appealMetadata?.cassationGroundsScope).toBe('COMMON');
        expect(patched[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState).toBe(
            LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
        );
        expect(patched[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '2')?.laneState).toBe(
            LANE_STATE_CASSATION,
        );
    });

    it('لا يمد الأثر إن كانت الأسباب شخصية أو النزاع قابلاً للتجزئة', () => {
        const personal = patchDossierAfterCassationRemand({
            stages: dossier('indivisible', 'PERSONAL'),
            cassationIndex: 1,
            groundsScope: 'PERSONAL',
        });
        expect(personal[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState).toBe(
            LANE_STATE_LAPSED_EXECUTABLE,
        );
        const severable = patchDossierAfterCassationRemand({
            stages: dossier('severable', 'COMMON'),
            cassationIndex: 1,
            groundsScope: 'COMMON',
        });
        expect(severable[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState).toBe(
            LANE_STATE_LAPSED_EXECUTABLE,
        );
    });

    it('يقرأ وحدة النزاع من الملف إن غابت عن مرحلة البداءة', () => {
        const stages = dossier('severable', 'COMMON');
        delete (stages[0] as { disputeIntegrity?: string }).disputeIntegrity;
        const patched = patchDossierAfterCassationRemand({
            stages,
            cassationIndex: 1,
            groundsScope: 'COMMON',
            parentIntegrity: 'indivisible',
        });
        expect(patched[0]?.partyChallengeLanes?.find((lane) => lane.partyId === '3')?.laneState).toBe(
            LANE_STATE_REVIVED_BY_CASSATION_EXTENSION,
        );
    });
});
