import { describe, expect, it } from 'vitest';
import {
    chunkRepositoryFeedItems,
    estimateRepositoryFeedRowSize,
    resolveRepositoryFeedColumnCount,
} from '../repositoryFeedVirtualLayout';

describe('repositoryFeedVirtualLayout', () => {
    it('يحسب أعمدة الشبكة حسب عرض الحاوية', () => {
        expect(resolveRepositoryFeedColumnCount('grid', 400)).toBe(1);
        expect(resolveRepositoryFeedColumnCount('grid', 800)).toBe(2);
        expect(resolveRepositoryFeedColumnCount('grid', 1400)).toBe(3);
        expect(resolveRepositoryFeedColumnCount('list', 1400)).toBe(1);
    });

    it('يقسّم العناصر إلى صفوف', () => {
        expect(chunkRepositoryFeedItems([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
        expect(chunkRepositoryFeedItems(['a', 'b'], 1)).toEqual([['a'], ['b']]);
    });

    it('يقدّر ارتفاع الصف حسب نمط العرض الحي', () => {
        expect(estimateRepositoryFeedRowSize('list')).toBeLessThan(estimateRepositoryFeedRowSize('grid'));
        expect(resolveRepositoryFeedColumnCount('list', 1400)).toBe(1);
    });
});
