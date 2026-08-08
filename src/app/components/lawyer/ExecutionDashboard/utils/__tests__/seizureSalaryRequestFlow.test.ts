import { describe, expect, it, vi } from 'vitest';
import {
    buildPendingSeizureDraftAsset,
    dispatchOpenSeizureCompletion,
    dispatchPropertySeizureInlineFocus,
    dispatchThirdPartySeizureInlineFocus,
    mergeSeizureDecisionPayloadJson,
    mergeSeizureDraftPatch,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureSalaryRequestFlow';

describe('seizureSalaryRequestFlow', () => {
    it('builds pending salary draft linked to decision id', () => {
        const draft = buildPendingSeizureDraftAsset({
            decisionId: 'dec-1',
            actionType: 'salary',
        });
        expect(draft.id).toBe('draft_dec-1');
        expect(draft.status).toBe('pending');
        expect((draft.details as Record<string, string>).decisionRowId).toBe('dec-1');
        expect((draft.details as Record<string, string>).seizureUiKind).toBe('salary');
    });

    it('merges draft patch without dropping existing drafts', () => {
        const existing = {
            'dec-old': buildPendingSeizureDraftAsset({ decisionId: 'dec-old', actionType: 'property' }),
        };
        const next = mergeSeizureDraftPatch(existing, 'dec-new', {
            ...buildPendingSeizureDraftAsset({ decisionId: 'dec-new', actionType: 'salary' }),
        });
        expect(Object.keys(next)).toEqual(['dec-old', 'dec-new']);
    });

    it('dispatches open completion custom event', () => {
        const spy = vi.fn();
        window.addEventListener('hami-open-seizure-completion', spy);
        dispatchOpenSeizureCompletion('ex-1', 'dec-1');
        expect(spy).toHaveBeenCalledTimes(1);
        window.removeEventListener('hami-open-seizure-completion', spy);
    });

    it('dispatches property inline focus event', () => {
        const spy = vi.fn();
        window.addEventListener('hami-focus-seizure-property-inline', spy);
        dispatchPropertySeizureInlineFocus('ex-1', 'dec-prop', 'عقار');
        expect(spy).toHaveBeenCalledTimes(1);
        window.removeEventListener('hami-focus-seizure-property-inline', spy);
    });

    it('dispatches third party inline focus event', () => {
        const spy = vi.fn();
        window.addEventListener('hami-focus-seizure-third-party-inline', spy);
        dispatchThirdPartySeizureInlineFocus('ex-1', 'dec-tp', 'جهة');
        expect(spy).toHaveBeenCalledTimes(1);
        window.removeEventListener('hami-focus-seizure-third-party-inline', spy);
    });

    it('merges seizure payload json without losing prior keys', () => {
        const merged = mergeSeizureDecisionPayloadJson(
            JSON.stringify({ seizedPropertyId: 'sp_old', note: 'x' }),
            { seizedPropertyId: 'sp_new', propertyNumber: '12' },
        );
        const parsed = JSON.parse(merged) as Record<string, unknown>;
        expect(parsed.seizedPropertyId).toBe('sp_new');
        expect(parsed.propertyNumber).toBe('12');
        expect(parsed.note).toBe('x');
    });
});
