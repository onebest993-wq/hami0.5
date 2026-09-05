import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import {
    resolveAppealStageClientOutcome,
    resolveCassationClientOutcome,
    resolveClientAppealRole,
    resolveCorrectionRejectedClientOutcome,
    resolvePriorAppealStageOutcome,
    buildCassationRemandTimelineTitle,
    toAppealClientOutcome,
} from '../appealStageJudgmentEngine';

const AFFIRM = 'تأييد الحكم البدائي ورد الاستئناف';
const QUASH = 'فسخ الحكم البدائي كلياً';
const REMAND = 'نقض الحكم وإعادة الإضبارة';
const STAGE_APPEAL = 'الاستئناف';
const STAGE_CASSATION = 'التمييز';

describe('appealStageJudgmentEngine structured pipeline', () => {
    const appelleeClient = [
        {
            id: 1,
            name: 'موكل',
            role: 'المستأنف عليه (المدعي)',
            isClient: true,
        },
        {
            id: 2,
            name: 'خصم',
            role: 'المستأنف (المدعى عليه)',
            isClient: false,
        },
    ];

    it('resolveClientAppealRole from appellantPartyIds metadata', () => {
        expect(
            resolveClientAppealRole(
                [
                    { id: 1, name: 'موكل', role: 'المدعي', isClient: true },
                    { id: 2, name: 'خصم', role: 'المدعى عليه', isClient: false },
                ],
                {
                    appealMetadata: {
                        appellantPartyIds: ['2'],
                        appelleePartyIds: ['1'],
                        priorStageOutcome: 'LOSS',
                        priorJudgmentForm: 'HADORI',
                    },
                },
            ),
        ).toBe('appellee');
        expect(
            resolveClientAppealRole(
                [
                    { id: 1, name: 'موكل', role: 'المدعي', isClient: true },
                    { id: 2, name: 'خصm', role: 'المدعى عليه', isClient: false },
                ],
                {
                    appealMetadata: {
                        appellantPartyIds: ['1'],
                        appelleePartyIds: ['2'],
                        priorStageOutcome: 'LOSS',
                        priorJudgmentForm: 'HADORI',
                    },
                },
            ),
        ).toBe('appellant');
    });

    it('legacy role fallback when metadata absent', () => {
        expect(resolveClientAppealRole(appelleeClient)).toBe('appellee');
    });

    it('affirm: appellant LOSS, appellee WIN', () => {
        expect(resolveAppealStageClientOutcome(AFFIRM, 'appellant')).toBe('LOSS');
        expect(resolveAppealStageClientOutcome(AFFIRM, 'appellee')).toBe('WIN');
    });

    it('full quash: appellant WIN, appellee LOSS', () => {
        expect(resolveAppealStageClientOutcome(QUASH, 'appellee')).toBe('LOSS');
        expect(resolveAppealStageClientOutcome(QUASH, 'appellant')).toBe('WIN');
    });

    it('partial maps to PARTIAL', () => {
        expect(
            resolveAppealStageClientOutcome('فسخ الحكم البدائي جزئياً', 'appellant'),
        ).toBe('PARTIAL');
        expect(toAppealClientOutcome('PARTIAL')).toBe('partial');
    });

    it('remand reads priorStageOutcome from appeal stage', () => {
        const stages = [
            {
                stageName: STAGE_APPEAL,
                status: 'locked',
                clientStageOutcome: 'LOSS',
            } as CaseStage,
            { stageName: STAGE_CASSATION, status: 'active' } as CaseStage,
        ];
        expect(resolvePriorAppealStageOutcome(stages, 1)).toBe('LOSS');
        expect(
            resolveCassationClientOutcome(REMAND, 'appellee', null, 'LOSS'),
        ).toBe('remand_favorable');
        expect(
            resolveCassationClientOutcome(REMAND, 'appellee', null, 'WIN'),
        ).toBe('remand_adverse');
        expect(
            resolveCassationClientOutcome('نقض الحكم والفصل في الموضوع', 'appellant', null, 'LOSS'),
        ).toBe('win');
        expect(
            resolveCassationClientOutcome('نقض الحكم والفصل في الموضوع', 'appellee', null, 'LOSS'),
        ).toBe('loss');
    });

    it('correction rejected uses clientStageOutcome on cassation stage', () => {
        const stages = [
            {
                stageName: STAGE_APPEAL,
                status: 'locked',
                clientStageOutcome: 'LOSS',
            } as CaseStage,
            {
                stageName: STAGE_CASSATION,
                status: 'completed',
                finalDecision: 'مكتسبة الدرجة القطعية',
                clientStageOutcome: 'FINALIZED',
            } as CaseStage,
            { stageName: 'تصحيح قرار', status: 'active' } as CaseStage,
        ];
        expect(resolveCorrectionRejectedClientOutcome(stages, 2, 'appellee')).toBe('loss');
    });

    it('buildCassationRemandTimelineTitle from priorStageOutcome', () => {
        const title = buildCassationRemandTimelineTitle(
            REMAND,
            'appellee',
            null,
            'LOSS',
        );
        expect(title).toContain('لصالح الموكل');
    });

    it('يعيد تصدير محرك المادة 172', async () => {
        const engine = await import('../appealStageJudgmentEngine');
        expect(typeof engine.canOfferArt172AppealStay).toBe('function');
        expect(typeof engine.isAbsentClientCoveredByCoDefendantAppeal).toBe('function');
        expect(typeof engine.blocksCivilDossierFinality).toBe('function');
        expect(engine.ART172_SUSPENSION_REASON).toBe('PENDING_CO_DEFENDANT_OBJECTION');
    });
});
