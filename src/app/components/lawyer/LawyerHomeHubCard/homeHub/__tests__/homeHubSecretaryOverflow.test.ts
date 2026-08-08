import { describe, expect, it } from 'vitest';
import {
    HOME_HUB_SECRETARY_PREVIEW_MAX,
    splitHomeHubSecretaryNudges,
} from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubSecretaryOverflow';

describe('homeHubSecretaryOverflow', () => {
    it('يعرض الكل عند 3 أو أقل', () => {
        const items = ['a', 'b', 'c'];
        expect(splitHomeHubSecretaryNudges(items)).toEqual({
            preview: items,
            overflowCount: 0,
            hasOverflow: false,
        });
    });

    it('يقتصر المعاينة على 3 ويحسب الباقي', () => {
        const items = ['a', 'b', 'c', 'd', 'e'];
        const split = splitHomeHubSecretaryNudges(items);
        expect(split.preview).toEqual(['a', 'b', 'c']);
        expect(split.overflowCount).toBe(2);
        expect(split.hasOverflow).toBe(true);
        expect(HOME_HUB_SECRETARY_PREVIEW_MAX).toBe(3);
    });
});
