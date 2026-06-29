import { describe, expect, it } from 'vitest';
import { pickCollapsedItems } from '@/app/components/lawyer/HamiSettings/components/collapseList';

describe('pickCollapsedItems', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];

    it('يُرجع الكل عند التوسيع', () => {
        expect(pickCollapsedItems(items, 3, true)).toEqual(items);
    });

    it('يقتصر على الحد عند الطي', () => {
        expect(pickCollapsedItems(items, 3, false)).toEqual(['a', 'b', 'c']);
    });

    it('يُبقي العنصر النشط ظاهراً عند الطي', () => {
        expect(pickCollapsedItems(items, 3, false, 'f')).toEqual(['a', 'b', 'f']);
    });
});
