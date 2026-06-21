import type { ShareCatalogSection, ShareSectionKey } from './caseShareTypes';

export const DEFAULT_SECTION_VISIBILITY: Record<ShareSectionKey, 'all' | 'none' | 'pick'> = {
    timeline: 'all',
    notes: 'all',
    documents: 'all',
    parties: 'all',
    court: 'all',
    meta: 'all',
};

export function isShareItemVisible(
    sectionKey: ShareSectionKey,
    itemId: string,
    sectionMode: Record<ShareSectionKey, 'all' | 'none' | 'pick'>,
    hiddenItemIds: string[],
): boolean {
    const mode = sectionMode[sectionKey] ?? 'all';
    if (mode === 'none') return false;
    if (mode === 'all') return true;
    return !hiddenItemIds.includes(itemId);
}

export function resolveVisibleCatalog(
    catalog: ShareCatalogSection[],
    sectionMode: Record<ShareSectionKey, 'all' | 'none' | 'pick'>,
    hiddenItemIds: string[],
): ShareCatalogSection[] {
    return catalog
        .map((section) => ({
            ...section,
            items: section.items.filter((item) =>
                isShareItemVisible(section.key, item.id, sectionMode, hiddenItemIds),
            ),
        }))
        .filter((section) => section.items.length > 0 || sectionMode[section.key] === 'all');
}

export function countVisibleItems(
    catalog: ShareCatalogSection[],
    sectionMode: Record<ShareSectionKey, 'all' | 'none' | 'pick'>,
    hiddenItemIds: string[],
): number {
    return resolveVisibleCatalog(catalog, sectionMode, hiddenItemIds).reduce(
        (sum, s) => sum + s.items.length,
        0,
    );
}

export function toggleSectionMode(
    current: Record<ShareSectionKey, 'all' | 'none' | 'pick'>,
    key: ShareSectionKey,
    mode: 'all' | 'none' | 'pick',
): Record<ShareSectionKey, 'all' | 'none' | 'pick'> {
    return { ...current, [key]: mode };
}

export function toggleHiddenItem(
    hiddenItemIds: string[],
    itemId: string,
    visible: boolean,
): string[] {
    if (visible) return hiddenItemIds.filter((id) => id !== itemId);
    if (hiddenItemIds.includes(itemId)) return hiddenItemIds;
    return [...hiddenItemIds, itemId];
}

/** عند «إخفاء الكل» لقسم — أخفِ كل عناصره */
export function hiddenIdsForSectionHideAll(
    section: ShareCatalogSection,
    current: string[],
): string[] {
    const ids = section.items.map((i) => i.id);
    const set = new Set([...current, ...ids]);
    return [...set];
}

/** عند «إظهار الكل» لقسم — أزل عناصر هذا القسم من القائمة المخفية */
export function hiddenIdsForSectionShowAll(
    section: ShareCatalogSection,
    current: string[],
): string[] {
    const idSet = new Set(section.items.map((i) => i.id));
    return current.filter((id) => !idSet.has(id));
}
