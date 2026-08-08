import { describe, expect, it } from 'vitest';
import { splitHomeHubPins } from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubPinsOverflow';

describe('splitHomeHubPins', () => {
    it('يعرض الكل عند 3 أو أقل', () => {
        expect(splitHomeHubPins(['a', 'b', 'c'])).toEqual({
            preview: ['a', 'b', 'c'],
            overflowCount: 0,
            hasOverflow: false,
        });
    });

    it('يقصّ عند 4+ ويحسب الباقي', () => {
        const split = splitHomeHubPins(['a', 'b', 'c', 'd', 'e']);
        expect(split.preview).toEqual(['a', 'b', 'c']);
        expect(split.overflowCount).toBe(2);
        expect(split.hasOverflow).toBe(true);
    });
});
