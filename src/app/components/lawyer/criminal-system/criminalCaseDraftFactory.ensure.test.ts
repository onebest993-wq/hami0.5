import { describe, expect, it } from 'vitest';
import { ensureCriminalCaseDraft, makeInitialDraft } from './criminalCaseDraftFactory';

describe('ensureCriminalCaseDraft', () => {
    it('rebuilds a usable draft from an empty object seed', () => {
        const draft = ensureCriminalCaseDraft({});
        expect(draft.basics.stage).toBe('');
        expect(draft.complainants.length).toBeGreaterThan(0);
        expect(draft.defendants.length).toBeGreaterThan(0);
        expect(draft.location).toBeTruthy();
    });

    it('preserves filled basics while filling missing arrays', () => {
        const draft = ensureCriminalCaseDraft({
            basics: { stage: 'مرحلة التحقيق', role: '', ourRepresentation: 'complainant_side', legalArticle: '413', crimeType: 'جنحة' },
        });
        expect(draft.basics.stage).toBe('مرحلة التحقيق');
        expect(draft.basics.ourRepresentation).toBe('complainant_side');
        expect(draft.defendants.length).toBe(1);
    });

    it('returns a fresh initial draft for nullish input', () => {
        expect(ensureCriminalCaseDraft(null).basics).toEqual(makeInitialDraft().basics);
    });
});
