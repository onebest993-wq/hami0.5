import { describe, expect, it } from 'vitest';
import {
    appendStageJourneyNode,
    buildInitialStageJourney,
    coerceJuvenileTrialJourneyNodeLabel,
    CRIMINAL_JOURNEY_ROUTE_COUNT,
    eventBelongsToJourneyBranch,
    eventBelongsToJourneyNode,
    findTransitionOption,
    forkStageJourneyFromCurrent,
    formatJourneyPathDisplayLabel,
    getCurrentJourneyNode,
    getJourneyBranchTracks,
    hasActiveJourneyFork,
    getStageTransitionOptions,
    journeyNodeLabel,
    proceduralActionFromConclusion,
    reactivateSameCourtRemandJourney,
    repairSameCourtRemandJourneyNodes,
    enforceSingleCurrentJourneyNode,
    resolveJourneyTransitionMeta,
    sanitizeJourneyNodeLabelsForJuvenileScope,
} from './stageJourney';

describe('stageJourney', () => {
    it('buildInitialStageJourney seeds investigation as current', () => {
        const initial = buildInitialStageJourney();
        expect(initial).toEqual([
            { id: '1', stage: 'investigation', label: 'مرحلة التحقيق', status: 'current' },
        ]);
    });

    it('appendStageJourneyNode marks prior current as past with endedAt and transitionKind', () => {
        const initial = buildInitialStageJourney();
        const next = appendStageJourneyNode(initial, {
            stage: 'misdemeanor',
            label: 'محكمة جنح: 10/جنح/2026',
            transitionText: 'قرار إحالة (محكمة الجنح)',
            transitionKind: 'forward_referral',
            startedAt: '2026-02-01',
            id: '2',
        });
        expect(next.length).toBe(2);
        expect(next[0]?.status).toBe('past');
        expect(next[0]?.endedAt).toBe('2026-02-01');
        expect(next[1]?.status).toBe('current');
        expect(next[1]?.transitionKind).toBe('forward_referral');
    });

    it('appendStageJourneyNode does not leak previous branch metadata to linear transitions', () => {
        const forked = forkStageJourneyFromCurrent(buildInitialStageJourney(), {
            startedAt: '2026-05-01',
            transitionText: 'تجزئة',
            branches: [
                { branchId: 'b1', branchLabel: 'مسار 1', stage: 'investigation', label: 'تحقيق 1' },
                { branchId: 'b2', branchLabel: 'مسار 2', stage: 'misdemeanor', label: 'جنح 2' },
            ],
        });
        const continued = appendStageJourneyNode(forked, {
            stage: 'investigation',
            label: 'مرحلة التحقيق (بعد الإرجاع)',
            transitionText: 'إرجاع للتحقيق',
            transitionKind: 'backward_reversal',
            startedAt: '2026-06-01',
        });
        const current = continued.find((n) => n.status === 'current');
        expect(current?.branchId).toBeUndefined();
        expect(current?.branchLabel).toBeUndefined();
    });

    it('defines nine criminal journey routes via transition meta', () => {
        expect(CRIMINAL_JOURNEY_ROUTE_COUNT).toBe(9);
        const invRefer = findTransitionOption('investigation', 'refer_misdemeanor')!;
        expect(resolveJourneyTransitionMeta('refer_misdemeanor', invRefer).transitionKind).toBe('forward_referral');
        const ret = findTransitionOption('misdemeanor', 'return_investigation_deficiency')!;
        expect(resolveJourneyTransitionMeta('return_investigation_deficiency', ret).transitionKind).toBe(
            'backward_reversal',
        );
        const swap = findTransitionOption('misdemeanor', 'misdemeanor_to_felony_jurisdiction')!;
        expect(resolveJourneyTransitionMeta('misdemeanor_to_felony_jurisdiction', swap).transitionKind).toBe(
            'jurisdiction_swap',
        );
        const up = findTransitionOption('felony', 'trial_cassation_appeal')!;
        expect(resolveJourneyTransitionMeta('trial_cassation_appeal', up).transitionKind).toBe('cassation_ascend');
        const down = findTransitionOption('cassation', 'cassation_quash_investigation')!;
        expect(resolveJourneyTransitionMeta('cassation_quash_investigation', down).transitionKind).toBe(
            'cassation_descend',
        );
    });

    it('exposes stage-specific transition menus', () => {
        expect(getStageTransitionOptions('investigation').map((o) => o.actionId)).toEqual([
            'refer_misdemeanor',
            'refer_felony',
        ]);
        expect(getStageTransitionOptions('misdemeanor').length).toBe(3);
    });

    it('maps stage-closer route decisions to procedural actions', () => {
        expect(
            proceduralActionFromConclusion('return_investigation_deficiency', 'misdemeanor'),
        ).toBe('return_investigation_deficiency');
        expect(proceduralActionFromConclusion('cassation_quash_remand', 'cassation', 'جناية')).toBe(
            'cassation_quash_trial_felony',
        );
    });

    it('filters timeline items by journey node window', () => {
        const nodes = [
            {
                id: '1',
                stage: 'investigation' as const,
                label: 'تحقيق',
                status: 'past' as const,
                startedAt: '2026-01-01',
            },
            {
                id: '2',
                stage: 'misdemeanor' as const,
                label: 'جنح',
                status: 'current' as const,
                transitionText: 'إحالة',
                startedAt: '2026-03-01',
            },
        ];
        expect(eventBelongsToJourneyNode('2026-02-15', undefined, nodes[0]!, nodes)).toBe(true);
        expect(eventBelongsToJourneyNode('2026-02-15', undefined, nodes[1]!, nodes)).toBe(false);
        expect(eventBelongsToJourneyNode('2026-04-01', '2', nodes[1]!, nodes)).toBe(true);
    });

    it('forkStageJourneyFromCurrent creates parallel current branches', () => {
        const initial = buildInitialStageJourney();
        const forked = forkStageJourneyFromCurrent(initial, {
            startedAt: '2026-05-01',
            transitionText: 'تجزئة الإضبارة',
            branches: [
                {
                    branchId: 'split-investigation',
                    branchLabel: 'تحقيق',
                    stage: 'investigation',
                    label: 'تحقيق هارب',
                    defendantIds: ['d-fugitive'],
                },
                {
                    branchId: 'split-trial',
                    branchLabel: 'جنح',
                    stage: 'misdemeanor',
                    label: 'جنح محالون',
                    defendantIds: ['d-other'],
                },
            ],
        });
        expect(hasActiveJourneyFork(forked)).toBe(true);
        expect(getJourneyBranchTracks(forked).length).toBe(2);
        const trialBranch = getJourneyBranchTracks(forked).find((b) => b.branchId === 'split-trial')!;
        expect(
            eventBelongsToJourneyBranch(
                { defendantIds: ['d-other'], proceduralNodeId: trialBranch.currentNode.id },
                trialBranch,
                forked,
            ),
        ).toBe(true);
        expect(
            eventBelongsToJourneyBranch({ defendantIds: ['d-fugitive'] }, trialBranch, forked),
        ).toBe(false);
    });

    it('reactivateSameCourtRemandJourney reopens prior trial node without appending', () => {
        const journey = [
            { id: '1', stage: 'investigation' as const, label: 'مرحلة التحقيق', status: 'past' as const },
            { id: '2', stage: 'misdemeanor' as const, label: 'محكمة الجنح', status: 'past' as const, endedAt: '2026-05-01' },
            { id: '3', stage: 'cassation' as const, label: 'تمييز جنح: ST/1', status: 'current' as const },
        ];
        const next = reactivateSameCourtRemandJourney(journey, 'misdemeanor', '2026-06-15');
        expect(next).toHaveLength(3);
        expect(next.find((n) => n.id === '2')?.status).toBe('current');
        expect(next.find((n) => n.id === '2')?.endedAt).toBeUndefined();
        expect(next.find((n) => n.id === '3')?.status).toBe('past');
        expect(next.filter((n) => n.status === 'current')).toHaveLength(1);
    });

    it('repairSameCourtRemandJourneyNodes removes duplicate remand append and restores original trial node', () => {
        const journey = [
            { id: '1', stage: 'investigation' as const, label: 'مرحلة التحقيق', status: 'past' as const },
            {
                id: '2',
                stage: 'misdemeanor' as const,
                label: 'محكمة الجنح',
                status: 'past' as const,
                transitionKind: 'forward_referral' as const,
            },
            { id: '3', stage: 'cassation' as const, label: 'تمييز جنح: ST/1', status: 'past' as const },
            {
                id: '4',
                stage: 'misdemeanor' as const,
                label: 'محكمة جنح: عغغع',
                status: 'current' as const,
                transitionKind: 'cassation_descend' as const,
                transitionText: 'نقض وإعادة — جولة ثانية',
            },
        ];
        const next = repairSameCourtRemandJourneyNodes(journey);
        expect(next).toHaveLength(3);
        expect(next.some((n) => n.id === '4')).toBe(false);
        expect(next.find((n) => n.id === '2')?.status).toBe('current');
        expect(next.find((n) => n.id === '2')?.label).toBe('محكمة الجنح');
    });

    it('stripErroneousSameCourtRemandAppendNodes removes numbered duplicate even without transitionKind', () => {
        const journey = [
            { id: '2', stage: 'misdemeanor' as const, label: 'محكمة الجنح', status: 'past' as const },
            { id: '4', stage: 'misdemeanor' as const, label: 'محكمة جنح: عفقع', status: 'current' as const },
        ];
        const next = repairSameCourtRemandJourneyNodes(journey);
        expect(next.map((n) => n.id)).toEqual(['2']);
        expect(next[0]?.status).toBe('current');
    });

    it('repairSameCourtRemandJourneyNodes does not reopen trial while cassation is active', () => {
        const journey = [
            { id: '1', stage: 'investigation' as const, label: 'مرحلة التحقيق', status: 'past' as const },
            { id: '2', stage: 'misdemeanor' as const, label: 'محكمة الجنح', status: 'past' as const },
            { id: '3', stage: 'cassation' as const, label: 'تمييز جنح: ST/1', status: 'current' as const },
        ];
        expect(repairSameCourtRemandJourneyNodes(journey)).toEqual(journey);
    });

    it('repairSameCourtRemandJourneyNodes restores trial court when investigation wrongly reactivated after remand', () => {
        const journey = [
            { id: '1', stage: 'investigation' as const, label: 'مرحلة التحقيق', status: 'current' as const },
            {
                id: '2',
                stage: 'misdemeanor' as const,
                label: 'محكمة الجنح',
                status: 'past' as const,
                endedAt: '2026-05-01',
            },
            {
                id: '3',
                stage: 'cassation' as const,
                label: 'تمييز جنح: ST/1',
                status: 'past' as const,
                endedAt: '2026-06-15',
            },
        ];
        const next = repairSameCourtRemandJourneyNodes(journey);
        expect(next.find((n) => n.id === '1')?.status).toBe('past');
        expect(next.find((n) => n.id === '2')?.status).toBe('current');
        expect(next.filter((n) => n.status === 'current')).toHaveLength(1);
    });

    it('enforceSingleCurrentJourneyNode demotes stale investigation current when trial is live', () => {
        const journey = [
            { id: '1', stage: 'investigation' as const, label: 'مرحلة التحقيق', status: 'current' as const },
            {
                id: '2',
                stage: 'misdemeanor' as const,
                label: 'محكمة الجنح',
                status: 'current' as const,
                startedAt: '2026-05-01',
            },
        ];
        const next = enforceSingleCurrentJourneyNode(journey);
        expect(next.find((n) => n.id === '1')?.status).toBe('past');
        expect(next.find((n) => n.id === '2')?.status).toBe('current');
        expect(getCurrentJourneyNode(next)?.id).toBe('2');
    });

    it('getCurrentJourneyNode prefers trial court over investigation when both marked current', () => {
        const journey = [
            { id: '1', stage: 'investigation' as const, label: 'مرحلة التحقيق', status: 'current' as const },
            { id: '2', stage: 'misdemeanor' as const, label: 'محكمة الجنح', status: 'current' as const },
        ];
        expect(getCurrentJourneyNode(journey)?.id).toBe('2');
    });

    it('journeyNodeLabel uses محكمة الأحداث for juvenile display without court numbers', () => {
        expect(journeyNodeLabel('juvenile', '645')).toBe('محكمة الأحداث');
        expect(journeyNodeLabel('misdemeanor', '645', { juvenileTrialDisplay: true })).toBe(
            'محكمة الأحداث',
        );
        expect(journeyNodeLabel('felony', '12/2026', { juvenileTrialDisplay: true })).toBe(
            'محكمة الأحداث',
        );
        expect(journeyNodeLabel('misdemeanor', '645')).toBe('محكمة الجنح');
    });

    it('formatJourneyPathDisplayLabel strips court numbers from stored labels', () => {
        expect(
            formatJourneyPathDisplayLabel({
                stage: 'misdemeanor',
                label: 'محكمة جنح: 645',
            }),
        ).toBe('محكمة الجنح');
        expect(
            formatJourneyPathDisplayLabel({
                stage: 'misdemeanor',
                label: 'محكمة الأحداث: 645',
            }),
        ).toBe('محكمة الأحداث');
    });

    it('sanitizeJourneyNodeLabelsForJuvenileScope rewrites stored adult trial labels', () => {
        const nodes = [
            { id: '1', stage: 'investigation' as const, label: 'مرحلة التحقيق', status: 'past' as const },
            {
                id: '2',
                stage: 'misdemeanor' as const,
                label: 'محكمة جنح: 645',
                status: 'current' as const,
            },
        ];
        const next = sanitizeJourneyNodeLabelsForJuvenileScope(nodes, () => true, '645');
        expect(next[1]?.label).toBe('محكمة الأحداث');
        expect(coerceJuvenileTrialJourneyNodeLabel(nodes[1]!, '645', true)).toBe('محكمة الأحداث');
    });
});
