import { describe, expect, it } from 'vitest';
import type { JudicialDecision } from '@/app/types/criminal';
import {
    formatAppealResultLabel,
    computeOrdinaryCassationWindow,
    resolveAppealResultCategory,
    resolveDecisionAppealActions,
    resolveDecisionAppealBadge,
    resolveDecisionAppealStatePhase,
    resolveTotalAppealLegalDays,
} from './decisionAppealPeriodEngine';

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

describe('decisionAppealPeriodEngine state machine', () => {
    it('state 1a: cassation within 30 days for appealable decision', () => {
        const d = baseDecision({ issuedAt: '2026-05-01', isAppealed: false });
        const actions = resolveDecisionAppealActions(d, {
            caseStage: 'misdemeanor',
            referenceDate: new Date('2026-05-10'),
        });
        expect(actions).toContain('cassation_appeal');
        expect(actions).toContain('intervention_cassation');
        expect(actions).not.toContain('declare_judgment_final');

        const badge = resolveDecisionAppealBadge(d, {
            caseStage: 'misdemeanor',
            referenceDate: new Date('2026-05-10'),
        });
        expect(badge.label).toMatch(/متبقي \d+ يوم للتمييز/);
        expect(badge.tone).toBe('countdown');
    });

    it('state 1a investigation: cassation and intervention together within 30 days', () => {
        const d = baseDecision({ issuedAt: '2026-05-01', isAppealed: false });
        const actions = resolveDecisionAppealActions(d, {
            caseStage: 'investigation',
            referenceDate: new Date('2026-05-10'),
        });
        expect(actions).toContain('cassation_appeal');
        expect(actions).toContain('intervention_cassation');
        expect(actions).not.toContain('cassation_correction');
    });

    it('state 1a expired: intervention after 30 days', () => {
        const d = baseDecision({ issuedAt: '2026-01-01', isAppealed: false });
        const actions = resolveDecisionAppealActions(d, {
            caseStage: 'misdemeanor',
            referenceDate: new Date('2026-03-01'),
        });
        expect(actions).toContain('intervention_cassation');
        expect(actions).not.toContain('cassation_appeal');

        const badge = resolveDecisionAppealBadge(d, {
            caseStage: 'misdemeanor',
            referenceDate: new Date('2026-03-01'),
        });
        expect(badge.label).toBe('انقضاء مدة الطعن العادي');
        expect(badge.tone).toBe('period_expired');
    });

    it('state 1b: preparatory non-appealable shows intervention only', () => {
        const d = baseDecision({
            decisionType: 'preparatory',
            title: 'قرار إحالة',
            proceduralTemplate: 'قرار إحالة',
            isAppealable: false,
            decisionAppealability: 'غير قابل للطعن على انفراد',
            isAppealed: false,
        });
        const actions = resolveDecisionAppealActions(d, { caseStage: 'misdemeanor' });
        expect(actions).toEqual(['intervention_cassation']);
        expect(resolveDecisionAppealBadge(d, { caseStage: 'misdemeanor' }).label).toBe(
            'قرار إعدادي نافذ',
        );
    });

    it('state 2: under review hides cassation and intervention until result', () => {
        const d = baseDecision({
            isAppealed: true,
            appeals: [{ id: 'a1', appellantType: 'defendant', appellantIds: ['x'], cassationStatus: 'pending', filedAt: '2026-05-01' }],
        });
        expect(resolveDecisionAppealStatePhase(d)).toBe('under_cassation_review');
        const actions = resolveDecisionAppealActions(d, { caseStage: 'misdemeanor' });
        expect(actions).not.toContain('cassation_appeal');
        expect(actions).not.toContain('intervention_cassation');
        expect(actions).toContain('record_appeal_result');
        expect(resolveDecisionAppealBadge(d).label).toBe('قيد التدقيق التمييزي');
    });

    it('state 3 upheld: correction window then absolute finality', () => {
        const upheld = baseDecision({
            title: 'حكم بإدانة المتهم',
            disposition: 'favors_complainant',
            isAppealed: true,
            appealResult: 'تأييد القرار',
            cassationPapersReceivedAt: '2026-05-01',
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'defendant',
                    appellantIds: ['x'],
                    cassationStatus: 'concluded',
                    result: 'procedural_affirmation',
                    concludedAt: '2026-05-01',
                    filedAt: '2026-04-01',
                },
            ],
        });
        expect(resolveAppealResultCategory('procedural_affirmation')).toBe('upheld');
        expect(resolveDecisionAppealActions(upheld, {
            caseStage: 'misdemeanor',
            referenceDate: new Date('2026-05-15'),
            userRole: 'defendant_lawyer',
        })).toContain('cassation_correction');
        expect(
            resolveDecisionAppealActions(
                { ...upheld, cassationCorrectionPending: true },
                { caseStage: 'misdemeanor', referenceDate: new Date('2026-05-15') },
            ),
        ).not.toContain('cassation_correction');
        expect(
            resolveDecisionAppealActions(upheld, { referenceDate: new Date('2026-06-15') }),
        ).toEqual([]);

        const badgeOpen = resolveDecisionAppealBadge(upheld, { referenceDate: new Date('2026-05-15') });
        expect(badgeOpen.label).toBe('');
        expect(badgeOpen.tone).toBe('result');

        const badgeFinal = resolveDecisionAppealBadge(upheld, { referenceDate: new Date('2026-06-15') });
        expect(badgeFinal.label).toBe('حكم بات نافذ قطعي');
        expect(badgeFinal.tone).toBe('absolute_finality');
    });

    it('state 3 quashed: no buttons and red badge', () => {
        const quashed = baseDecision({
            isAppealed: true,
            appealResult: 'نقض القرار',
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'defendant',
                    appellantIds: ['x'],
                    cassationStatus: 'concluded',
                    result: 'procedural_annulment',
                    concludedAt: '2026-05-01',
                },
            ],
        });
        expect(resolveDecisionAppealStatePhase(quashed)).toBe('quashed_final');
        expect(resolveDecisionAppealActions(quashed)).toEqual([]);
        expect(resolveDecisionAppealBadge(quashed).label).toBe('قرار منقوض - يعاد للمحكمة');
        expect(resolveDecisionAppealBadge(quashed).tone).toBe('quashed');
    });

    it('formats procedural cassation result keys in Arabic', () => {
        expect(formatAppealResultLabel('procedural_affirmation')).toBe('تأييد القرار');
        expect(formatAppealResultLabel('procedural_annulment')).toBe('نقض القرار');
        expect(formatAppealResultLabel('verdict_quash_remand_retrial')).toBe(
            'نقض القرار وإعادة الأوراق لنفس المحكمة لإعادة المحاكمة',
        );
    });

    it('ordinary cassation window caps at 30 days on verdict day', () => {
        const window = computeOrdinaryCassationWindow('2026-05-01', new Date('2026-05-01T12:00:00Z'));
        expect(window.remainingDays).toBe(30);
        expect(window.isExpired).toBe(false);
    });

    it('cassation correction m266/m267: available after ordinary concluded for losing party', () => {
        const convictionUpheld = baseDecision({
            title: 'conviction',
            summary: 'conviction penalty text',
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
                    filedAt: '2026-04-01',
                },
            ],
        });
        expect(
            resolveDecisionAppealActions(convictionUpheld, {
                caseStage: 'misdemeanor',
                referenceDate: new Date('2026-05-15'),
                userRole: 'defendant_lawyer',
            }),
        ).toContain('cassation_correction');
        expect(
            resolveDecisionAppealActions(convictionUpheld, {
                caseStage: 'misdemeanor',
                referenceDate: new Date('2026-05-15'),
                userRole: 'complainant_lawyer',
            }),
        ).not.toContain('cassation_correction');
    });

    it('upheld correction window with pending intervention offers record result', () => {
        const upheld = baseDecision({
            title: 'حكم بإدانة',
            disposition: 'favors_complainant',
            isAppealed: true,
            appealResult: 'procedural_affirmation',
            cassationPapersReceivedAt: '2026-05-01',
            interventionCassationPending: true,
            appeals: [
                {
                    id: 'a1',
                    appellantType: 'defendant',
                    appellantIds: ['x'],
                    cassationStatus: 'concluded',
                    result: 'procedural_affirmation',
                    appealPath: 'ordinary',
                    concludedAt: '2026-05-01',
                    filedAt: '2026-04-01',
                },
                {
                    id: 'a2',
                    appellantType: 'complainant',
                    appellantIds: ['y'],
                    cassationStatus: 'pending',
                    appealPath: 'intervention_264b',
                    filedAt: '2026-05-10',
                },
            ],
        });
        const actions = resolveDecisionAppealActions(upheld, {
            caseStage: 'investigation',
            referenceDate: new Date('2026-05-15'),
        });
        expect(actions).toContain('record_appeal_result');
        expect(actions).not.toContain('cassation_appeal');
        expect(actions).not.toContain('intervention_cassation');
        expect(actions).not.toContain('cassation_correction');
    });
});
