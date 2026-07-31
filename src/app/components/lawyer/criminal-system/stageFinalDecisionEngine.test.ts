import { describe, expect, it } from 'vitest';
import {
    applyAbsentiaObjectionExpiry,
    canShowStageFinalCassationAppealByRole,
    enrichVerdictCardFromForm,
    formatPenaltyDisplay,
    resolvePenaltiesSupplementary,
    resolveAbsentiaObjectionDays,
    resolveStageFinalDecisionActions,
    resolveStageFinalDecisionBadge,
    validateStageFinalDecisionForm,
} from './stageFinalDecisionEngine';
import type { VerdictCard } from './verdictCardsEngine';

describe('stageFinalDecisionEngine', () => {
    it('validates summary path without outcome selection', () => {
        const ctx = { case_classification: 'جنحة' as const, misdemeanor_type: 'موجزة' as const, isSummaryProcedure: true };
        const err = validateStageFinalDecisionForm(
            {
                kind: 'conviction_penalty',
                issuedAt: '2026-06-01',
                presenceType: 'وجاهي',
                decisionText: '',
                decisionPath: 'summary',
                penalty: { masterKind: 'fine', fineAmountIqd: 100_000 },
            },
            ctx,
        );
        expect(err).toBeNull();
    });
    it('validates full conviction requires conviction text and penalty', () => {
        const ctx = { case_classification: 'جناية' as const, misdemeanor_type: 'غير موجزة' as const, isSummaryProcedure: false };
        const base = {
            kind: 'conviction_penalty' as const,
            issuedAt: '2026-06-01',
            presenceType: 'وجاهي' as const,
            decisionText: '',
            decisionPath: 'full' as const,
            penalty: { masterKind: 'severe_imprisonment' as const },
        };
        expect(validateStageFinalDecisionForm(base, ctx)).toMatch(/إدانة/);
        expect(
            validateStageFinalDecisionForm(
                { ...base, convictionText: 'إدانة بالسرقة', penalty: { masterKind: 'severe_imprisonment', years: 1 } },
                ctx,
            ),
        ).toBeNull();
    });

    it('formats penalty display for combined sentence without supplementary line', () => {
        const text = formatPenaltyDisplay({
            masterKind: 'combined_imprisonment_fine',
            years: 2,
            months: 3,
            fineAmountIqd: 500_000,
            substituteImprisonmentDays: 30,
            penalties_supplementary: 'مراقبة الشرطة لمدة سنة',
        });
        expect(text).toContain('حبس');
        expect(text).toContain('غرامة مقدارها');
        expect(text).toContain('دينار عراقي');
        expect(text).not.toContain('مراقبة الشرطة');
    });

    it('resolves supplementary penalties separately from master penalty', () => {
        expect(
            resolvePenaltiesSupplementary({
                masterKind: 'fine',
                penalties_supplementary: 'مصادرة وإتلاف',
            }),
        ).toBe('مصادرة وإتلاف');
        expect(
            resolvePenaltiesSupplementary({
                masterKind: 'fine',
                accessory_penalties: 'ترحيل قديم',
            }),
        ).toBe('ترحيل قديم');
    });

    it('shows 30-day cassation countdown for in-person verdict', () => {
        const card: VerdictCard = {
            id: 'v1',
            outcome: 'conviction',
            issuedAt: '2026-06-01',
            appealDeadline: '2026-07-01',
            presenceType: 'وجاهي',
            finalDecisionKind: 'conviction_penalty',
        };
        const badge = resolveStageFinalDecisionBadge(card, new Date('2026-06-10T12:00:00Z'));
        expect(badge.tone).toBe('countdown_orange');
        expect(badge.label).toMatch(/متبقي \d+ يوم للتمييز العادي/);
        const actions = resolveStageFinalDecisionActions(card, {
            readOnly: false,
            referenceDate: new Date('2026-06-10T12:00:00Z'),
            userRole: 'defendant_lawyer',
        });
        expect(actions.showCassationAppeal).toBe(true);
    });

    it('hides cassation for defendant lawyer on acquittal or release', () => {
        const acquittal: VerdictCard = {
            id: 'v-acq',
            outcome: 'acquittal',
            issuedAt: '2026-06-01',
            appealDeadline: '2026-07-01',
            presenceType: 'وجاهي',
            finalDecisionKind: 'acquittal',
        };
        const release: VerdictCard = {
            id: 'v-rel',
            outcome: 'release',
            issuedAt: '2026-06-01',
            appealDeadline: '2026-07-01',
            presenceType: 'وجاهي',
            finalDecisionKind: 'release',
        };
        const ctx = {
            readOnly: false as const,
            referenceDate: new Date('2026-06-10T12:00:00Z'),
            userRole: 'defendant_lawyer' as const,
        };
        expect(resolveStageFinalDecisionActions(acquittal, ctx).showCassationAppeal).toBe(false);
        expect(resolveStageFinalDecisionActions(release, ctx).showCassationAppeal).toBe(false);
        expect(canShowStageFinalCassationAppealByRole(acquittal, 'lawyer_of_defendant')).toBe(false);
    });

    it('shows cassation for complainant lawyer on conviction, acquittal, and release', () => {
        const ctx = {
            readOnly: false as const,
            referenceDate: new Date('2026-06-10T12:00:00Z'),
            userRole: 'complainant_lawyer' as const,
        };
        const conviction: VerdictCard = {
            id: 'v-con',
            outcome: 'conviction',
            issuedAt: '2026-06-01',
            appealDeadline: '2026-07-01',
            presenceType: 'وجاهي',
            finalDecisionKind: 'conviction_penalty',
        };
        const acquittal: VerdictCard = {
            id: 'v-acq',
            outcome: 'acquittal',
            issuedAt: '2026-06-01',
            appealDeadline: '2026-07-01',
            presenceType: 'وجاهي',
            finalDecisionKind: 'acquittal',
        };
        const release: VerdictCard = {
            id: 'v-rel',
            outcome: 'release',
            issuedAt: '2026-06-01',
            appealDeadline: '2026-07-01',
            presenceType: 'وجاهي',
            finalDecisionKind: 'release',
        };
        expect(resolveStageFinalDecisionActions(conviction, ctx).showCassationAppeal).toBe(true);
        expect(resolveStageFinalDecisionActions(acquittal, ctx).showCassationAppeal).toBe(true);
        expect(resolveStageFinalDecisionActions(release, ctx).showCassationAppeal).toBe(true);
        expect(canShowStageFinalCassationAppealByRole(acquittal, 'lawyer_of_claimant')).toBe(true);
    });

    it('marks final when cassation window expires', () => {
        const card: VerdictCard = {
            id: 'v2',
            outcome: 'acquittal',
            issuedAt: '2026-01-01',
            appealDeadline: '2026-02-01',
            presenceType: 'وجاهي',
            finalDecisionKind: 'acquittal',
        };
        const badge = resolveStageFinalDecisionBadge(card, new Date('2026-03-01T12:00:00Z'));
        expect(badge.tone).toBe('final_green');
        expect(badge.label).toContain('حكم بات نافذ');
    });

    it('resolves absentia objection days by case type', () => {
        expect(resolveAbsentiaObjectionDays('مخالفة')).toBe(30);
        expect(resolveAbsentiaObjectionDays('جنحة')).toBe(90);
        expect(resolveAbsentiaObjectionDays('جناية')).toBe(180);
    });

    it('flips absentia card to in-person after objection expiry', () => {
        const card: VerdictCard = enrichVerdictCardFromForm(
            {
                id: 'verdict_x',
                outcome: 'conviction',
                issuedAt: '2026-01-01',
                appealDeadline: '',
            },
            {
                kind: 'conviction_penalty',
                issuedAt: '2026-01-01',
                presenceType: 'غيابي',
                decisionText: 'حكم غيابي',
            },
            'جنحة',
        );
        const withPub: VerdictCard = {
            ...card,
            absentiaPublicationDate: '2026-02-01',
            absentiaObjectionDeadline: '2026-05-02',
        };
        const flipped = applyAbsentiaObjectionExpiry(withPub, new Date('2026-06-01T12:00:00Z'));
        expect(flipped.absentiaTreatedAsInPerson).toBe(true);
        expect(String(flipped.appealDeadline ?? '').length).toBeGreaterThan(0);
    });
});
