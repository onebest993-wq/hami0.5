import { describe, expect, it } from 'vitest';
import type { JourneyNode } from '@/app/types/criminal';
import {
    filterByCasePhase,
    isInvestigationClosedProceduralRoot,
    partitionStatementsByPhase,
    resolveJudicialDecisionCasePhase,
    resolveLawyerRequestCasePhase,
    resolveProceduralRootCasePhase,
    resolveRecordCasePhase,
    resolveRecordJourneyStageLabel,
    resolveRecordJourneyStage,
    buildDecisionsScopeFilterOptions,
    countDecisionsScopeDisplayTotal,
    filterByDecisionsScope,
    filterTrialSessionsByDecisionsScope,
    isFirstInvestigationStageOnly,
    resolveTrialPhasePivotMs,
    shouldShowDecisionsScopeFilterBar,
} from './casePhaseFilterEngine';
import type { LawyerRequest } from './criminalStore';
import type { JudicialDecision } from './judicialDecisionsEngine';
import type { ProceduralContainer } from './proceduralContainersEngine';

const journey: JourneyNode[] = [
    { id: '1', stage: 'investigation', label: 'تحقيق', status: 'past', startedAt: '2026-01-01', endedAt: '2026-03-01' },
    { id: '2', stage: 'misdemeanor', label: 'جنح', status: 'current', startedAt: '2026-03-15' },
];

describe('casePhaseFilterEngine', () => {
    it('resolves trial pivot from journey', () => {
        expect(resolveTrialPhasePivotMs(journey)).toBe(Date.parse('2026-03-15'));
    });

    it('classifies by procedural node id', () => {
        expect(resolveRecordCasePhase({ date: '2026-04-01', proceduralNodeId: '1' }, journey)).toBe('investigation');
        expect(resolveRecordCasePhase({ date: '2026-01-01', proceduralNodeId: '2' }, journey)).toBe('trial');
    });

    it('classifies by date when node id missing', () => {
        expect(resolveRecordCasePhase({ date: '2026-02-01' }, journey)).toBe('investigation');
        expect(resolveRecordCasePhase({ date: '2026-04-01' }, journey)).toBe('trial');
    });

    it('shows current-only scope chip on first investigation when rows exist', () => {
        const firstInv: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'تحقيق', status: 'current', startedAt: '2026-01-01' },
        ];
        expect(isFirstInvestigationStageOnly('investigation', firstInv)).toBe(true);
        expect(shouldShowDecisionsScopeFilterBar('investigation', firstInv)).toBe(false);
        expect(buildDecisionsScopeFilterOptions([], [], firstInv, 'investigation')).toEqual([]);

        const decisions = [
            {
                id: 'd1',
                issuedAt: '2026-02-01',
                title: 'ت',
                summary: '',
                decisionType: 'preparatory' as const,
                proceduralNodeId: '1',
            },
        ];
        const opts = buildDecisionsScopeFilterOptions(decisions as any, [], firstInv, 'investigation');
        expect(opts).toEqual([{ value: 'current', label: 'الحالية', count: 1 }]);

        const afterCourt: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'تحقيق', status: 'past', startedAt: '2026-01-01' },
            { id: '2', stage: 'misdemeanor', label: 'جنح', status: 'past', startedAt: '2026-03-01' },
            { id: '3', stage: 'investigation', label: 'تحقيق-2', status: 'current', startedAt: '2026-05-01' },
        ];
        expect(isFirstInvestigationStageOnly('investigation', afterCourt)).toBe(false);
        expect(shouldShowDecisionsScopeFilterBar('investigation', afterCourt)).toBe(true);
    });

    it('builds unified decisions scope chips regardless of split tab', () => {
        const loopJourney: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'تحقيق', status: 'past', startedAt: '2026-01-01' },
            { id: '2', stage: 'misdemeanor', label: 'جنح', status: 'past', startedAt: '2026-03-01' },
            { id: '3', stage: 'felony', label: 'جنايات', status: 'current', startedAt: '2026-06-01' },
        ];
        const decisions = [
            { id: 'd1', issuedAt: '2026-02-01', title: 'ت', summary: '', decisionType: 'procedural' as const },
            { id: 'd2', issuedAt: '2026-04-01', title: 'ت', summary: '', decisionType: 'procedural' as const },
            { id: 'd3', issuedAt: '2026-07-01', title: 'ت', summary: '', decisionType: 'procedural' as const },
        ];
        const opts = buildDecisionsScopeFilterOptions(decisions as any, [], loopJourney, 'felony', [], [], 'all');
        expect(opts.map((o) => o.value)).toEqual(['current', 'previous']);
        expect(resolveRecordJourneyStage({ issuedAt: '2026-04-01' }, loopJourney)).toBe('misdemeanor');
    });

    it('all scope returns every stage record including investigation', () => {
        const journeyMisd: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'تحقيق', status: 'past', startedAt: '2026-01-01' },
            { id: '2', stage: 'misdemeanor', label: 'جنح', status: 'current', startedAt: '2026-03-01' },
        ];
        const items = [
            { id: 'inv', issuedAt: '2026-02-01', proceduralNodeId: '1' },
            { id: 'misd', issuedAt: '2026-04-01', proceduralNodeId: '2' },
        ];
        const allItems = filterByDecisionsScope(items, 'all', 'misdemeanor', journeyMisd, (x) => ({
            issuedAt: x.issuedAt,
            proceduralNodeId: x.proceduralNodeId,
        }));
        expect(allItems.map((x) => x.id)).toEqual(['inv', 'misd']);
    });

    it('scope display total dedupes executed requests already in merged ledger', () => {
        const decisions = [
            {
                id: 'jd_rq1',
                issuedAt: '2026-02-01',
                title: 'توقيف',
                summary: '',
                decisionType: 'preparatory' as const,
                sourceRequestId: 'rq1',
            },
        ];
        const requests = [
            { id: 'rq1', type: 'توقيف', requestDate: '2026-02-01', status: 'executed' as const, lawyerNote: '' },
            { id: 'rq2', type: 'طلب', requestDate: '2026-04-01', status: 'pending' as const, lawyerNote: '' },
        ];
        expect(countDecisionsScopeDisplayTotal(decisions as any, requests as any)).toBe(2);
    });

    it('current scope in misdemeanor excludes investigation-bound records', () => {
        const journeyMisd: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'تحقيق', status: 'past', startedAt: '2026-01-01' },
            { id: '2', stage: 'misdemeanor', label: 'جنح', status: 'current', startedAt: '2026-03-01' },
        ];
        const items = [
            { id: 'a', issuedAt: '2026-02-01', proceduralNodeId: '1' },
            { id: 'b', issuedAt: '2026-04-01', proceduralNodeId: '2' },
        ];
        const currentOnly = filterByDecisionsScope(items, 'current', 'misdemeanor', journeyMisd, (x) => ({
            issuedAt: x.issuedAt,
            proceduralNodeId: x.proceduralNodeId,
        }));
        expect(currentOnly.map((x) => x.id)).toEqual(['b']);
        const misdOpts = buildDecisionsScopeFilterOptions(items as any, [], journeyMisd, 'misdemeanor', [], [], 'all');
        const currentOpt = misdOpts.find((o) => o.value === 'current');
        const previousOpt = misdOpts.find((o) => o.value === 'previous');
        expect(currentOpt?.count).toBe(1);
        expect(previousOpt?.count).toBe(1);
        expect(misdOpts.map((o) => o.value)).toEqual(['current', 'previous']);
    });

    it('scope counts stay unified across split tabs', () => {
        const journeyMisd: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'تحقيق', status: 'past', startedAt: '2026-01-01' },
            { id: '2', stage: 'misdemeanor', label: 'جنح', status: 'current', startedAt: '2026-03-01' },
        ];
        const sessions = [
            {
                id: 's1',
                date: '2026-02-01',
                sessionNumber: '1',
                presenceStatus: 'present' as const,
                status: 'pending' as const,
            },
            {
                id: 's2',
                date: '2026-04-01',
                sessionNumber: '2',
                presenceStatus: 'present' as const,
                status: 'pending' as const,
            },
        ];
        const currentSessions = filterTrialSessionsByDecisionsScope(
            sessions as any,
            'current',
            'misdemeanor',
            journeyMisd,
        );
        expect(currentSessions.map((s) => s.id)).toEqual(['s2']);
        const previousSessions = filterTrialSessionsByDecisionsScope(
            sessions as any,
            'previous',
            'misdemeanor',
            journeyMisd,
        );
        expect(previousSessions.map((s) => s.id)).toEqual(['s1']);
        const allOpts = buildDecisionsScopeFilterOptions([], [], journeyMisd, 'misdemeanor', sessions as any, [], 'all');
        const trialOpts = buildDecisionsScopeFilterOptions([], [], journeyMisd, 'misdemeanor', sessions as any, [], 'trial_sessions');
        expect(allOpts).toEqual(trialOpts);
        expect(allOpts.find((o) => o.value === 'current')?.count).toBe(1);
        expect(allOpts.find((o) => o.value === 'previous')?.count).toBe(1);
    });

    it('cassation scope offers all and current phase chips only', () => {
        const cassJourney: JourneyNode[] = [
            { id: '1', stage: 'misdemeanor', label: 'جنح', status: 'past', startedAt: '2026-03-01' },
            { id: '2', stage: 'cassation', label: 'تمييز', status: 'current', startedAt: '2026-08-01' },
        ];
        const opts = buildDecisionsScopeFilterOptions([], [], cassJourney, 'cassation', [], [], 'all');
        expect(opts.map((o) => o.value)).toEqual(['current', 'previous']);
        expect(opts.find((o) => o.value === 'current')?.label).toBe('الحالية');
    });

    it('previous scope classifies by bound procedural node after court transition', () => {
        const journeyMisd: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'تحقيق', status: 'past', startedAt: '2026-01-01' },
            { id: '2', stage: 'misdemeanor', label: 'جنح', status: 'current', startedAt: '2026-03-01' },
        ];
        const items = [
            { id: 'inv', issuedAt: '2026-02-01', proceduralNodeId: '1' },
            { id: 'misd', issuedAt: '2026-04-01', proceduralNodeId: '2' },
        ];
        const previousOnly = filterByDecisionsScope(items, 'previous', 'misdemeanor', journeyMisd, (x) => ({
            issuedAt: x.issuedAt,
            proceduralNodeId: x.proceduralNodeId,
        }));
        expect(previousOnly.map((x) => x.id)).toEqual(['inv']);
    });

    it('current scope keeps records on their issuance node even if date differs', () => {
        const journeyMisd: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'تحقيق', status: 'past', startedAt: '2026-01-01' },
            { id: '2', stage: 'misdemeanor', label: 'جنح', status: 'current', startedAt: '2026-03-01' },
        ];
        const items = [
            { id: 'misd', issuedAt: '2026-04-01', proceduralNodeId: '2' },
            { id: 'inv', issuedAt: '2026-02-01', proceduralNodeId: '1' },
        ];
        const currentOnly = filterByDecisionsScope(items, 'current', 'misdemeanor', journeyMisd, (x) => ({
            issuedAt: x.issuedAt,
            proceduralNodeId: x.proceduralNodeId,
        }));
        expect(currentOnly.map((x) => x.id)).toEqual(['misd']);
    });

    it('current scope keeps same-stage records bound to prior court node after remand', () => {
        const journeyMisd: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'تحقيق', status: 'past', startedAt: '2026-01-01' },
            {
                id: '2',
                stage: 'misdemeanor',
                label: 'محكمة الجنح',
                status: 'current',
                startedAt: '2026-03-01',
            },
        ];
        const items = [
            { id: 'old', issuedAt: '2026-04-01', proceduralNodeId: '2' },
            { id: 'inv', issuedAt: '2026-02-01', proceduralNodeId: '1' },
        ];
        const currentOnly = filterByDecisionsScope(items, 'current', 'misdemeanor', journeyMisd, (x) => ({
            issuedAt: x.issuedAt,
            proceduralNodeId: x.proceduralNodeId,
        }));
        expect(currentOnly.map((x) => x.id)).toEqual(['old']);
    });

    it('labels journey stage for cards (multi-investigation ordinal + court)', () => {
        const loopJourney: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'تحقيق-1', status: 'past', startedAt: '2026-01-01', endedAt: '2026-03-01' },
            { id: '2', stage: 'misdemeanor', label: 'جنح-1', status: 'past', startedAt: '2026-03-01', endedAt: '2026-05-01' },
            { id: '3', stage: 'investigation', label: 'تحقيق-2', status: 'past', startedAt: '2026-05-01', endedAt: '2026-06-01' },
            { id: '4', stage: 'felony', label: 'جنايات-2', status: 'current', startedAt: '2026-06-01' },
        ];
        expect(resolveRecordJourneyStageLabel({ proceduralNodeId: '1' }, loopJourney)).toBe('مرحلة التحقيق');
        expect(resolveRecordJourneyStageLabel({ proceduralNodeId: '3' }, loopJourney)).toBe('مرحلة تحقيق 2');
        expect(resolveRecordJourneyStageLabel({ date: '2026-03-10' }, loopJourney)).toBe('جنح-1');
        expect(resolveRecordJourneyStageLabel({ date: '2026-06-10' }, loopJourney)).toBe('جنايات-2');
    });

    it('keeps phases independent across return-to-investigation then re-referral timeline', () => {
        const loopJourney: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'تحقيق-1', status: 'past', startedAt: '2026-01-01', endedAt: '2026-03-01' },
            { id: '2', stage: 'misdemeanor', label: 'جنح-1', status: 'past', startedAt: '2026-03-01', endedAt: '2026-05-01' },
            { id: '3', stage: 'investigation', label: 'تحقيق-2', status: 'past', startedAt: '2026-05-01', endedAt: '2026-06-01' },
            { id: '4', stage: 'felony', label: 'جنايات-2', status: 'current', startedAt: '2026-06-01' },
        ];
        // نفس تاريخ الإرجاع للتحقيق: يجب أن يُسجّل تحقيق.
        expect(resolveRecordCasePhase({ date: '2026-05-10' }, loopJourney)).toBe('investigation');
        // بعد الإحالة الثانية: محاكمة.
        expect(resolveRecordCasePhase({ date: '2026-06-10' }, loopJourney)).toBe('trial');
        // قرار قديم من الإحالة الأولى يبقى محاكمة.
        expect(resolveRecordCasePhase({ date: '2026-03-10' }, loopJourney)).toBe('trial');
    });

    it('filters requests by phase', () => {
        const items = [
            { id: 'a', requestDate: '2026-02-01', proceduralNodeId: '1' },
            { id: 'b', requestDate: '2026-04-01', proceduralNodeId: '2' },
        ];
        const inv = filterByCasePhase(items, 'investigation', (r) =>
            resolveLawyerRequestCasePhase(r as any, journey),
        );
        expect(inv.map((x) => x.id)).toEqual(['a']);
    });

    it('partitions statements with trial section first', () => {
        const { trial, investigation } = partitionStatementsByPhase(
            [
                { id: 's1', date: '2026-02-01', giverType: 'defendant', giverName: 'أ', content: '', proceduralNodeId: '1' },
                { id: 's2', date: '2026-04-01', giverType: 'defendant', giverName: 'ب', content: '', proceduralNodeId: '2' },
            ],
            journey,
        );
        expect(investigation.map((s) => s.id)).toEqual(['s1']);
        expect(trial.map((s) => s.id)).toEqual(['s2']);
    });

    it('flags completed investigation roots before trial pivot', () => {
        const root: ProceduralContainer = {
            id: 'r1',
            title: 'تحقيق',
            color: '#fff',
            icon: '📁',
            parentId: null,
            pathStatus: 'completed',
            pathEndedAt: '2026-02-20',
            subItems: [],
        };
        expect(isInvestigationClosedProceduralRoot(root, journey)).toBe(true);
    });

    it('resolves procedural root phase from end date and filters roots', () => {
        const invRoot: ProceduralContainer = {
            id: 'r1',
            title: 'تحقيق',
            color: '#fff',
            icon: '📁',
            parentId: null,
            pathStatus: 'completed',
            pathEndedAt: '2026-02-20',
            subItems: [],
        };
        const trialRoot: ProceduralContainer = {
            id: 'r2',
            title: 'محاكمة',
            color: '#fff',
            icon: '⚖️',
            parentId: null,
            pathStatus: 'active',
            subItems: [
                {
                    type: 'action',
                    id: 'a1',
                    title: 'جلسة',
                    date: '2026-04-01',
                    status: 'in_progress',
                },
            ],
        };
        expect(resolveProceduralRootCasePhase(invRoot, journey)).toBe('investigation');
        expect(resolveProceduralRootCasePhase(trialRoot, journey)).toBe('trial');

        const trialOnly = filterByCasePhase([invRoot, trialRoot], 'trial', (r) =>
            resolveProceduralRootCasePhase(r, journey),
        );
        expect(trialOnly.map((r) => r.id)).toEqual(['r2']);
    });

    it('classifies procedural roots correctly across return-to-investigation loops', () => {
        const loopJourney: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'تحقيق-1', status: 'past', startedAt: '2026-01-01', endedAt: '2026-03-01' },
            { id: '2', stage: 'misdemeanor', label: 'جنح-1', status: 'past', startedAt: '2026-03-01', endedAt: '2026-05-01' },
            { id: '3', stage: 'investigation', label: 'تحقيق-2', status: 'current', startedAt: '2026-05-01' },
        ];
        const inv2Root: ProceduralContainer = {
            id: 'ri2',
            title: 'تحقيق-2',
            color: '#fff',
            icon: '📁',
            parentId: null,
            pathStatus: 'completed',
            pathEndedAt: '2026-05-20',
            subItems: [],
        };
        expect(resolveProceduralRootCasePhase(inv2Root, loopJourney)).toBe('investigation');
        expect(isInvestigationClosedProceduralRoot(inv2Root, loopJourney)).toBe(true);
    });

    it('keeps tabs phase-safe across referral1 -> return investigation2 -> referral2', () => {
        const loopJourney: JourneyNode[] = [
            { id: 'j1', stage: 'investigation', label: 'تحقيق-1', status: 'past', startedAt: '2026-01-01', endedAt: '2026-03-01' },
            { id: 'j2', stage: 'misdemeanor', label: 'جنح-1', status: 'past', startedAt: '2026-03-01', endedAt: '2026-05-01' },
            { id: 'j3', stage: 'investigation', label: 'تحقيق-2', status: 'past', startedAt: '2026-05-01', endedAt: '2026-06-01' },
            { id: 'j4', stage: 'felony', label: 'جنايات-2', status: 'current', startedAt: '2026-06-01' },
        ];

        const statements = [
            { id: 'st_inv_1', date: '2026-02-10', giverType: 'defendant', giverName: 'أ', content: 'إفادة تحقيق أول' },
            { id: 'st_trial_1', date: '2026-04-10', giverType: 'defendant', giverName: 'ب', content: 'إفادة بعد إحالة أولى' },
            { id: 'st_inv_2', date: '2026-05-10', giverType: 'defendant', giverName: 'ج', content: 'إفادة بعد الرجوع للتحقيق' },
            { id: 'st_trial_2', date: '2026-06-10', giverType: 'defendant', giverName: 'د', content: 'إفادة بعد الإحالة الثانية' },
        ] as const;
        const requests: LawyerRequest[] = [
            { id: 'rq_inv_1', type: 'طلب تحقيق', requestDate: '2026-02-15', status: 'pending' as const },
            { id: 'rq_trial_1', type: 'طلب محاكمة', requestDate: '2026-04-15', status: 'executed' as const },
            { id: 'rq_inv_2', type: 'طلب تحقيق ثان', requestDate: '2026-05-15', status: 'pending' as const },
            { id: 'rq_trial_2', type: 'طلب محاكمة ثان', requestDate: '2026-06-15', status: 'executed' as const },
        ];
        const decisions: JudicialDecision[] = [
            { id: 'jd_inv_1', issuedAt: '2026-02-20', title: 'قرار تحقيق 1', summary: '', decisionType: 'preparatory' },
            { id: 'jd_trial_1', issuedAt: '2026-04-20', title: 'قرار محاكمة 1', summary: '', decisionType: 'dispositive' },
            { id: 'jd_inv_2', issuedAt: '2026-05-20', title: 'قرار تحقيق 2', summary: '', decisionType: 'preparatory' },
            { id: 'jd_trial_2', issuedAt: '2026-06-20', title: 'قرار محاكمة 2', summary: '', decisionType: 'dispositive' },
        ];

        const splitStatements = partitionStatementsByPhase(
            statements.map((s) => ({ ...s })),
            loopJourney,
        );
        const invRequests = filterByCasePhase(requests, 'investigation', (r) =>
            resolveLawyerRequestCasePhase(r, loopJourney),
        );
        const trialRequests = filterByCasePhase(requests, 'trial', (r) =>
            resolveLawyerRequestCasePhase(r, loopJourney),
        );
        const invDecisions = filterByCasePhase(decisions, 'investigation', (d) =>
            resolveJudicialDecisionCasePhase(d, loopJourney),
        );
        const trialDecisions = filterByCasePhase(decisions, 'trial', (d) =>
            resolveJudicialDecisionCasePhase(d, loopJourney),
        );

        expect(splitStatements.investigation.map((s) => s.id)).toEqual(['st_inv_1', 'st_inv_2']);
        expect(splitStatements.trial.map((s) => s.id)).toEqual(['st_trial_1', 'st_trial_2']);
        expect(invRequests.map((r) => r.id)).toEqual(['rq_inv_1', 'rq_inv_2']);
        expect(trialRequests.map((r) => r.id)).toEqual(['rq_trial_1', 'rq_trial_2']);
        expect(invDecisions.map((d) => d.id)).toEqual(['jd_inv_1', 'jd_inv_2']);
        expect(trialDecisions.map((d) => d.id)).toEqual(['jd_trial_1', 'jd_trial_2']);
    });
});
