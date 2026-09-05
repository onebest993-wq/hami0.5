import { describe, expect, it } from 'vitest';
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

    it('focus/completion dispatch helpers are no-ops after workflow strip', () => {
        expect(() => dispatchOpenSeizureCompletion('ex-1', 'dec-1')).not.toThrow();
        expect(() => dispatchPropertySeizureInlineFocus('ex-1', 'dec-prop', 'عقار')).not.toThrow();
        expect(() => dispatchThirdPartySeizureInlineFocus('ex-1', 'dec-tp', 'جهة')).not.toThrow();
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
