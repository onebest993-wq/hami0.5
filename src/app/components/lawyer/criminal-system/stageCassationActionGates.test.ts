import { describe, expect, it } from 'vitest';
import type { JudicialDecision } from '@/app/types/criminal';
import { resolveDecisionAppealActions } from './decisionAppealPeriodEngine';
import {
    applyStageCassationActionGates,
    applyStageGatesToVerdictCardActions,
    isInterventionCassationLockActive,
    isVerdictInterventionLockActive,
    resolveStageCassationButtonFlags,
} from './stageCassationActionGates';
import { resolveStageFinalDecisionActions } from './stageFinalDecisionEngine';
import type { VerdictCard } from './verdictCardsEngine';

const baseDecision = (patch: Partial<JudicialDecision> = {}): JudicialDecision => ({
    id: 'd1',
    title: 'حكم',
    summary: '',
    issuedAt: '2026-01-01',
    decisionType: 'dispositive',
    isAppealable: true,
    isLocked: false,
    appeals: [],
    ...patch,
});

describe('stageCassationActionGates', () => {
    it('investigation: cassation + intervention only — no correction ever', () => {
        const upheld = baseDecision({
            title: 'حكم بإدانة',
            disposition: 'favors_complainant',
            isAppealed: true,
            appealResult: 'procedural_affirmation',
            cassationPapersReceivedAt: '2026-05-01',
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'defendant',
                    appellantIds: ['x'],
                    cassationStatus: 'concluded',
                    result: 'procedural_affirmation',
                    concludedAt: '2026-05-01',
                },
            ],
        });
        const actions = resolveDecisionAppealActions(upheld, {
            caseStage: 'investigation',
            referenceDate: new Date('2026-05-15'),
            userRole: 'defendant_lawyer',
        });
        expect(actions).not.toContain('cassation_correction');
        expect(actions).not.toContain('declare_judgment_final');

        const flags = resolveStageCassationButtonFlags(
            ['cassation_appeal', 'intervention_cassation', 'cassation_correction'],
            baseDecision(),
            { caseStage: 'investigation' },
        );
        expect(flags.showCassationAppeal).toBe(true);
        expect(flags.showInterventionCassation).toBe(true);
        expect(flags.showCassationCorrection).toBe(false);
    });

    it('felony: cassation + correction only — no intervention ever', () => {
        const d = baseDecision({ issuedAt: '2026-05-01', isAppealed: false });
        const actions = resolveDecisionAppealActions(d, {
            caseStage: 'felony',
            referenceDate: new Date('2026-03-01'),
        });
        expect(actions).not.toContain('intervention_cassation');
        expect(actions).not.toContain('declare_judgment_final');

        const gated = applyStageCassationActionGates(
            ['cassation_appeal', 'intervention_cassation', 'cassation_correction'],
            d,
            { caseStage: 'felony' },
        );
        expect(gated).toContain('cassation_appeal');
        expect(gated).toContain('cassation_correction');
        expect(gated).not.toContain('intervention_cassation');
    });

    it('misdemeanor: hides cassation for defendant lawyer on acquittal or release', () => {
        const acquittal = baseDecision({
            title: 'براءة المتهم',
            disposition: 'favors_defendant',
            issuedAt: '2026-05-01',
            isAppealed: false,
        });
        const actions = resolveDecisionAppealActions(acquittal, {
            caseStage: 'misdemeanor',
            referenceDate: new Date('2026-05-10'),
            userRole: 'lawyer_of_defendant',
        });
        expect(actions).not.toContain('cassation_appeal');

        const release = baseDecision({
            title: 'إفراج المتهم',
            summary: 'إفراج',
            issuedAt: '2026-05-01',
            isAppealed: false,
        });
        expect(
            resolveDecisionAppealActions(release, {
                caseStage: 'misdemeanor',
                referenceDate: new Date('2026-05-10'),
                userRole: 'defendant_lawyer',
            }),
        ).not.toContain('cassation_appeal');
    });

    it('golden lock: intervention active hides cassation and correction on investigation/misdemeanor', () => {
        const locked = baseDecision({
            interventionCassationPending: true,
            issuedAt: '2026-05-01',
            isAppealed: false,
        });
        expect(isInterventionCassationLockActive(locked)).toBe(true);

        const invGated = applyStageCassationActionGates(
            ['cassation_appeal', 'intervention_cassation', 'cassation_correction'],
            locked,
            { caseStage: 'investigation' },
        );
        expect(invGated).toEqual([]);

        const misGated = applyStageCassationActionGates(
            ['cassation_appeal', 'intervention_cassation', 'cassation_correction'],
            locked,
            { caseStage: 'misdemeanor' },
        );
        expect(misGated).toEqual([]);
    });

    it('per-path hide: after ordinary cassation filed pending, hide cassation and intervention', () => {
        const filed = baseDecision({
            issuedAt: '2026-05-01',
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'defendant',
                    appellantIds: ['x'],
                    cassationStatus: 'pending',
                    appealPath: 'ordinary',
                    filedAt: '2026-05-02',
                },
            ],
        });
        const actions = resolveDecisionAppealActions(filed, {
            caseStage: 'investigation',
            referenceDate: new Date('2026-05-10'),
        });
        expect(actions).not.toContain('cassation_appeal');
        expect(actions).not.toContain('intervention_cassation');
        expect(actions).toContain('record_appeal_result');
    });

    it('felony: after ordinary concluded, correction still available', () => {
        const upheld = baseDecision({
            title: 'حكم بإدانة',
            disposition: 'favors_complainant',
            isAppealed: true,
            appealResult: 'procedural_affirmation',
            cassationPapersReceivedAt: '2026-05-01',
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'defendant',
                    appellantIds: ['x'],
                    cassationStatus: 'concluded',
                    result: 'procedural_affirmation',
                    appealPath: 'ordinary',
                    filedAt: '2026-04-01',
                    concludedAt: '2026-05-01',
                },
            ],
        });
        const actions = resolveDecisionAppealActions(upheld, {
            caseStage: 'felony',
            referenceDate: new Date('2026-05-15'),
            userRole: 'defendant_lawyer',
        });
        expect(actions).not.toContain('cassation_appeal');
        expect(actions).not.toContain('intervention_cassation');
        expect(actions).toContain('cassation_correction');
    });

    it('verdict card: investigation hides correction; intervention lock hides cassation', () => {
        const card: VerdictCard = {
            id: 'v1',
            outcome: 'conviction',
            issuedAt: '2026-06-01',
            appealDeadline: '2026-07-01',
            presenceType: 'وجاهي',
            finalDecisionKind: 'conviction_penalty',
            ordinaryAppeal: {
                result: 'procedural_affirmation',
                resultRecordedAt: '2026-06-15',
            },
        };
        const invActions = resolveStageFinalDecisionActions(card, {
            readOnly: false,
            referenceDate: new Date('2026-06-20'),
            userRole: 'defendant_lawyer',
            caseStage: 'investigation',
        });
        expect(invActions.showCassationCorrection).toBe(false);

        const lockedCard: VerdictCard = {
            ...card,
            interventionAppeal: {
                status: 'filed',
                interventionRequestNumber: '264/1',
                filedAt: '2026-06-10',
            },
        };
        expect(isVerdictInterventionLockActive(lockedCard)).toBe(true);
        const gated = applyStageGatesToVerdictCardActions({
            caseStage: 'misdemeanor',
            showCassationAppeal: true,
            showComplainantCassation: false,
            showCassationCorrection: true,
            showRecordCassationResult: false,
            interventionLock: true,
        });
        expect(gated.showCassationAppeal).toBe(false);
        expect(gated.showCassationCorrection).toBe(false);
    });

    it('after concluded ordinary cassation: intervention still available in investigation', () => {
        const upheld = baseDecision({
            title: 'حكم بإدانة',
            disposition: 'favors_complainant',
            isAppealed: true,
            appealResult: 'procedural_affirmation',
            cassationPapersReceivedAt: '2026-05-01',
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'defendant',
                    appellantIds: ['x'],
                    cassationStatus: 'concluded',
                    result: 'procedural_affirmation',
                    appealPath: 'ordinary',
                    filedAt: '2026-04-01',
                    concludedAt: '2026-05-01',
                },
            ],
        });
        const actions = resolveDecisionAppealActions(upheld, {
            caseStage: 'investigation',
            referenceDate: new Date('2026-05-15'),
            userRole: 'defendant_lawyer',
        });
        expect(actions).toContain('intervention_cassation');
        expect(actions).not.toContain('cassation_appeal');
        expect(actions).not.toContain('cassation_correction');
    });

    it('correction pending: hide intervention until result is recorded', () => {
        const upheld = baseDecision({
            title: 'حكم بإدانة',
            disposition: 'favors_complainant',
            isAppealed: true,
            appealResult: 'procedural_affirmation',
            cassationPapersReceivedAt: '2026-05-01',
            cassationCorrectionPending: true,
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'defendant',
                    appellantIds: ['x'],
                    cassationStatus: 'concluded',
                    result: 'procedural_affirmation',
                    appealPath: 'ordinary',
                    filedAt: '2026-04-01',
                    concludedAt: '2026-05-01',
                },
            ],
        });
        const actions = resolveDecisionAppealActions(upheld, {
            caseStage: 'misdemeanor',
            referenceDate: new Date('2026-05-15'),
            userRole: 'defendant_lawyer',
        });
        expect(actions).not.toContain('intervention_cassation');
        expect(actions).not.toContain('cassation_correction');
    });

    it('intervention filed: golden lock hides all filing buttons', () => {
        const interventionFiled = baseDecision({
            issuedAt: '2026-05-01',
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'defendant',
                    appellantIds: ['x'],
                    cassationStatus: 'pending',
                    appealPath: 'intervention_264b',
                    filedAt: '2026-05-02',
                },
            ],
        });
        const gated = applyStageCassationActionGates(
            ['cassation_appeal', 'intervention_cassation', 'cassation_correction', 'record_appeal_result'],
            interventionFiled,
            { caseStage: 'misdemeanor' },
        );
        expect(gated).toEqual(['record_appeal_result']);
    });

    it('investigation: dual channel within cassation window when no intervention filed', () => {
        const d = baseDecision({ issuedAt: '2026-05-01', isAppealed: false });
        const actions = resolveDecisionAppealActions(d, {
            caseStage: 'investigation',
            referenceDate: new Date('2026-05-10'),
        });
        expect(actions).toEqual(expect.arrayContaining(['cassation_appeal', 'intervention_cassation']));
    });
});
