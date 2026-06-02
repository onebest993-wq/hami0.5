import { describe, expect, it } from 'vitest';
import { splitLegalSearchHighlightSegments } from './legalCodesSearchHighlight';

describe('splitLegalSearchHighlightSegments', () => {
    it('returns plain text when query is empty', () => {
        expect(splitLegalSearchHighlightSegments('نص قانوني', '')).toEqual([
            { text: 'نص قانوني', highlighted: false },
        ]);
    });

    it('highlights all occurrences in body text', () => {
        expect(splitLegalSearchHighlightSegments('توفى المتهم ولم يتوفى القاضي', 'توفى')).toEqual([
            { text: 'توفى', highlighted: true },
            { text: ' المتهم ولم ي', highlighted: false },
            { text: 'توفى', highlighted: true },
            { text: ' القاضي', highlighted: false },
        ]);
    });

    it('highlights numeric article references', () => {
        expect(splitLegalSearchHighlightSegments('المادة 149', '149')).toEqual([
            { text: 'المادة ', highlighted: false },
            { text: '149', highlighted: true },
        ]);
    });
});
