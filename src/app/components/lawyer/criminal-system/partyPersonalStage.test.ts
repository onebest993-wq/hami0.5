import { describe, expect, it } from 'vitest';
import {
    decisionRequiresDefendantScope,
    eventTouchesDefendant,
    expandPurgeScopeWithAutoUnknownDefendants,
    filterSelectableDefendantsForPurgeScope,
    filterSelectableDefendantsForScope,
    filterSelectableDefendantsForTrialFinalDecision,
    hasDivergentDefendantFates,
    personalStageForDecision,
    resolveEffectiveDefendantScopeIds,
    resolveTrialFinalDecisionScopeIds,
    shouldShowDefendantDecisionScopePicker,
} from './partyPersonalStage';
import type { CriminalDefendant } from './criminalStore';
import {
    INVESTIGATION_CLOSURE_FINAL_OBJECTIVE_TEMPLATE,
    INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE,
    INVESTIGATION_CLOSURE_FINAL_TEMPLATE,
    INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
} from './proceduralRequestTypes';
import { makeUnknownIdentityDefendant } from './criminalUnknownDefendant';

describe('partyPersonalStage', () => {
    it('maps conviction to convicted personal stage', () => {
        expect(personalStageForDecision('conviction')).toBe('convicted');
    });

    it('maps expiration death to lawsuit_dropped_death', () => {
        expect(personalStageForDecision('expiration', 'death')).toBe('lawsuit_dropped_death');
    });

    it('maps expiration statute of limitations to lawsuit_dropped', () => {
        expect(personalStageForDecision('expiration', 'statute_of_limitations')).toBe('lawsuit_dropped');
    });

    it('requires defendant scope for referral and conviction', () => {
        expect(decisionRequiresDefendantScope('referral')).toBe(true);
        expect(decisionRequiresDefendantScope('conviction')).toBe(true);
        expect(decisionRequiresDefendantScope('juvenile_severance_referral')).toBe(false);
    });

    it('hides defendant scope picker when only one selectable defendant', () => {
        const defendants = [{ id: 'd1', fullName: 'أحمد' }] as CriminalDefendant[];
        expect(shouldShowDefendantDecisionScopePicker(defendants)).toBe(false);
        expect(resolveEffectiveDefendantScopeIds(defendants, [])).toEqual(['d1']);
    });

    it('shows defendant scope picker for multiple defendants', () => {
        const defendants = [
            { id: 'd1', fullName: 'أحمد' },
            { id: 'd2', fullName: 'علي' },
        ] as CriminalDefendant[];
        expect(shouldShowDefendantDecisionScopePicker(defendants)).toBe(true);
        expect(resolveEffectiveDefendantScopeIds(defendants, ['d2'])).toEqual(['d2']);
    });

    it('detects divergent fates across defendants', () => {
        const defendants = [
            { id: 'a', personalStage: 'referred_to_trial' },
            { id: 'b', personalStage: 'released_temporary' },
        ] as CriminalDefendant[];
        expect(hasDivergentDefendantFates(defendants)).toBe(true);
    });

    it('does not treat death alone as path split trigger', () => {
        const defendants = [
            { id: 'a', personalStage: 'lawsuit_dropped_death' },
            { id: 'b', personalStage: 'under_investigation' },
        ] as CriminalDefendant[];
        expect(hasDivergentDefendantFates(defendants)).toBe(false);
    });

    it('does not split when only difference is lawsuit dropped vs death', () => {
        const defendants = [
            { id: 'a', personalStage: 'lawsuit_dropped_death' },
            { id: 'b', personalStage: 'lawsuit_dropped' },
        ] as CriminalDefendant[];
        expect(hasDivergentDefendantFates(defendants)).toBe(false);
    });

    it('filters timeline events by defendant scope', () => {
        expect(eventTouchesDefendant({ defendantIds: ['a'] }, 'a')).toBe(true);
        expect(eventTouchesDefendant({ defendantIds: ['a'] }, 'b')).toBe(false);
        expect(eventTouchesDefendant({}, 'b')).toBe(true);
        expect(eventTouchesDefendant({ targetDefendantId: 'b' }, 'b')).toBe(true);
    });

    it('keeps unknown blocked in UI but auto-includes them in temporary closure purge scope', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const defendants = [
            { id: 'd1', fullName: 'أحمد' },
            unknown,
        ] as CriminalDefendant[];
        expect(filterSelectableDefendantsForScope(defendants)).toHaveLength(1);
        expect(filterSelectableDefendantsForPurgeScope(defendants)).toHaveLength(1);
        expect(
            shouldShowDefendantDecisionScopePicker(defendants, INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE),
        ).toBe(true);
        expect(
            expandPurgeScopeWithAutoUnknownDefendants(
                defendants,
                ['d1'],
                INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE,
            ),
        ).toEqual(expect.arrayContaining(['d1', unknown.id]));
        expect(
            resolveEffectiveDefendantScopeIds(defendants, ['d1'], INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE),
        ).toEqual(expect.arrayContaining(['d1', unknown.id]));
        expect(
            resolveEffectiveDefendantScopeIds(defendants, [unknown.id], INVESTIGATION_CLOSURE_TEMPORARY_TEMPLATE),
        ).toEqual(expect.arrayContaining(['d1', unknown.id]));
    });

    it('does not auto-include unknown in personal final closure purge scope', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const defendants = [
            { id: 'd1', fullName: 'أحمد' },
            unknown,
        ] as CriminalDefendant[];
        expect(
            resolveEffectiveDefendantScopeIds(defendants, ['d1'], INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE),
        ).toEqual(['d1']);
        expect(
            resolveEffectiveDefendantScopeIds(
                defendants,
                ['d1', unknown.id],
                INVESTIGATION_CLOSURE_FINAL_PERSONAL_TEMPLATE,
            ),
        ).toEqual(['d1']);
        expect(
            resolveEffectiveDefendantScopeIds(defendants, ['d1'], INVESTIGATION_CLOSURE_FINAL_TEMPLATE),
        ).toEqual(['d1']);
    });

    it('includes all defendants in objective final closure scope', () => {
        const unknown = makeUnknownIdentityDefendant(1);
        const defendants = [
            { id: 'd1', fullName: 'أحمد' },
            unknown,
        ] as CriminalDefendant[];
        expect(
            resolveEffectiveDefendantScopeIds(defendants, [], INVESTIGATION_CLOSURE_FINAL_OBJECTIVE_TEMPLATE),
        ).toEqual(['d1', unknown.id]);
    });

    it('includes referred defendants in trial final decision scope (not investigation-active only)', () => {
        const defendants = [
            {
                id: 'd1',
                fullName: 'أحمد',
                investigationStatus: 'referred',
                personalStage: 'referred_to_trial',
            },
        ] as CriminalDefendant[];
        expect(filterSelectableDefendantsForScope(defendants)).toHaveLength(0);
        expect(filterSelectableDefendantsForTrialFinalDecision(defendants)).toHaveLength(1);
        expect(resolveTrialFinalDecisionScopeIds(defendants, [])).toEqual(['d1']);
    });

    it('excludes terminal personal stages from trial final decision scope', () => {
        const defendants = [
            { id: 'd1', fullName: 'أحمد', personalStage: 'convicted' },
            { id: 'd2', fullName: 'علي', personalStage: 'referred_to_trial' },
        ] as CriminalDefendant[];
        expect(filterSelectableDefendantsForTrialFinalDecision(defendants).map((d) => d.id)).toEqual(['d2']);
        expect(resolveTrialFinalDecisionScopeIds(defendants, ['d2'])).toEqual(['d2']);
    });
});
