import { describe, expect, it } from 'vitest';
import {
    chunkRepositoryFeedItems,
    estimateRepositoryFeedRowSize,
    resolveRepositoryFeedColumnCount,
    shouldVirtualizeRepositoryFeed,
} from '../repositoryFeedVirtualLayout';
import { REPOSITORY_FEED_VIRTUAL_SCROLL_THRESHOLD } from '../repositoryFeedConstants';

describe('repositoryFeedVirtualLayout', () => {
    it('يفعّل الت virtualization عند عتبة القائمة', () => {
        expect(shouldVirtualizeRepositoryFeed(REPOSITORY_FEED_VIRTUAL_SCROLL_THRESHOLD - 1)).toBe(false);
        expect(shouldVirtualizeRepositoryFeed(REPOSITORY_FEED_VIRTUAL_SCROLL_THRESHOLD)).toBe(true);
    });

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

    it('يقدّر ارتفاع الصف حسب نمط العرض', () => {
        expect(estimateRepositoryFeedRowSize('compact')).toBeLessThan(estimateRepositoryFeedRowSize('grid'));
        expect(estimateRepositoryFeedRowSize('gallery')).toBeGreaterThan(estimateRepositoryFeedRowSize('list'));
    });
});
