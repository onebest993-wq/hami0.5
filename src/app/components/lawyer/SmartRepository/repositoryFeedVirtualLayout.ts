import type { RepositoryFeedLayoutId } from './repositoryFeedLayout';
import { REPOSITORY_FEED_VIRTUAL_SCROLL_THRESHOLD } from './repositoryFeedConstants';

/** xl: 1280px — sm: 640px — تطابق شبكة repositoryFeedLayout */
export function resolveRepositoryFeedColumnCount(
    layoutId: RepositoryFeedLayoutId,
    containerWidth: number,
): number {
    if (layoutId === 'list') {
        return 1;
    }
    if (containerWidth >= 1280) return 3;
    if (containerWidth >= 640) return 2;
    return 1;
}

export function chunkRepositoryFeedItems<T>(items: T[], columnCount: number): T[][] {
    if (columnCount <= 1) {
        return items.map((item) => [item]);
    }
    const rows: T[][] = [];
    for (let i = 0; i < items.length; i += columnCount) {
        rows.push(items.slice(i, i + columnCount));
    }
    return rows;
}

export function estimateRepositoryFeedRowSize(layoutId: RepositoryFeedLayoutId): number {
    return layoutId === 'list' ? 132 : 184;
}

export function repositoryFeedRowGridClass(columnCount: number): string {
    if (columnCount >= 3) return 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3';
    if (columnCount === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3';
    return 'grid grid-cols-1 gap-2.5 sm:gap-3';
}

export function shouldVirtualizeRepositoryFeed(itemCount: number): boolean {
    return itemCount >= REPOSITORY_FEED_VIRTUAL_SCROLL_THRESHOLD;
}
