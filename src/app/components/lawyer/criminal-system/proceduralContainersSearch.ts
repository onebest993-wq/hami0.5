/**
 * Search, visibility, and tree-anchor helpers for procedural containers.
 * Re-exported from proceduralContainersEngine.
 */
import type {
    ProceduralActionItem,
    ProceduralContainer,
    ProceduralNoteItem,
    ProceduralSubItem,
} from './proceduralContainersModel';
import {
    containerBreadcrumbTitle,
    formatProceduralBreadcrumbLine,
    formatProceduralNumberChain,
} from './proceduralContainersPlacement';
import { archiveTextMatchesQuery } from '@/app/services/search/normalizeArabicSearch';
import { clampGlobalSearchQuery } from '@/app/services/search/globalSearchQuerySecurity';

export type ProceduralSubItemKind = 'note' | 'action';

export type ProceduralNavTarget =
    | { kind: 'note' | 'action'; id: string }
    | { kind: 'container'; id: string };

export type ProceduralSearchHit = {
    itemType: 'note' | 'action' | 'container';
    itemId: string;
    title: string;
    numberChain: string;
    breadcrumbLine: string;
};

export type ProceduralSearchVisibility = {
    active: boolean;
    visibleContainerIds: Set<string>;
    matchedItemIds: Set<string>;
    expandContainerIds: Set<string>;
};

function subItemSearchText(item: ProceduralNoteItem | ProceduralActionItem): string {
    const parts = [item.title];
    if (item.type === 'note' && item.body) parts.push(item.body);
    if (item.type === 'action' && item.date) parts.push(item.date);
    if (item.tags?.length) parts.push(...item.tags);
    if (item.contextNote) parts.push(item.contextNote);
    return parts.join(' ');
}

function normalizeSearchQuery(raw: string): string {
    return clampGlobalSearchQuery(String(raw ?? ''));
}

export function collectAllContainerIds(roots: ProceduralContainer[]): string[] {
    const ids: string[] = [];
    const walk = (list: ProceduralContainer[]) => {
        for (const c of list) {
            ids.push(c.id);
            for (const item of c.subItems) {
                if (item.type === 'container') walk([item.container]);
            }
        }
    };
    walk(roots);
    return ids;
}

/** بحث نصي بسيط عبر العناوين والوسوم — للواجهة فقط */
export function searchProceduralTree(roots: ProceduralContainer[], rawQuery: string): ProceduralSearchHit[] {
    const q = normalizeSearchQuery(rawQuery);
    if (!q.trim()) return [];
    const hits: ProceduralSearchHit[] = [];

    const walkSubItems = (
        subItems: ProceduralSubItem[],
        indexChain: number[],
        breadcrumb: string[],
    ) => {
        for (let i = 0; i < subItems.length; i++) {
            const item = subItems[i];
            const chain = [...indexChain, i + 1];
            const crumbs = breadcrumb;
            if (item.type === 'note' || item.type === 'action') {
                if (archiveTextMatchesQuery(subItemSearchText(item), q)) {
                    hits.push({
                        itemType: item.type,
                        itemId: item.id,
                        title: item.title,
                        numberChain: formatProceduralNumberChain(chain),
                        breadcrumbLine: formatProceduralBreadcrumbLine(crumbs),
                    });
                }
            } else if (item.type === 'container') {
                const c = item.container;
                const childCrumbs = [...crumbs, containerBreadcrumbTitle(c)];
                if (archiveTextMatchesQuery(containerBreadcrumbTitle(c), q)) {
                    hits.push({
                        itemType: 'container',
                        itemId: c.id,
                        title: c.title,
                        numberChain: formatProceduralNumberChain(chain),
                        breadcrumbLine: formatProceduralBreadcrumbLine(childCrumbs),
                    });
                }
                walkSubItems(c.subItems, chain, childCrumbs);
            }
        }
    };

    for (let ri = 0; ri < roots.length; ri++) {
        const root = roots[ri];
        const rootCrumbs = [containerBreadcrumbTitle(root)];
        if (archiveTextMatchesQuery(containerBreadcrumbTitle(root), q)) {
            hits.push({
                itemType: 'container',
                itemId: root.id,
                title: root.title,
                numberChain: formatProceduralNumberChain([ri + 1]),
                breadcrumbLine: formatProceduralBreadcrumbLine(rootCrumbs),
            });
        }
        walkSubItems(root.subItems, [ri + 1], rootCrumbs);
    }
    return hits;
}

function subtreeHasSearchMatch(container: ProceduralContainer, q: string): boolean {
    if (archiveTextMatchesQuery(containerBreadcrumbTitle(container), q)) return true;
    for (const item of container.subItems) {
        if (item.type === 'note' || item.type === 'action') {
            if (archiveTextMatchesQuery(subItemSearchText(item), q)) return true;
        } else if (item.type === 'container' && subtreeHasSearchMatch(item.container, q)) {
            return true;
        }
    }
    return false;
}

export function findSubItemAnchorInTree(
    roots: ProceduralContainer[],
    itemId: string,
): { parentId: string; expandContainerIds: string[]; itemType: ProceduralSubItemKind } | null {
    const target = String(itemId ?? '').trim();
    if (!target) return null;

    const walk = (list: ProceduralContainer[], ancestors: string[]): ReturnType<typeof findSubItemAnchorInTree> => {
        for (const c of list) {
            const chain = [...ancestors, c.id];
            for (const item of c.subItems) {
                if ((item.type === 'note' || item.type === 'action') && item.id === target) {
                    return { parentId: c.id, expandContainerIds: chain, itemType: item.type };
                }
                if (item.type === 'container') {
                    const hit = walk([item.container], chain);
                    if (hit) return hit;
                }
            }
        }
        return null;
    };
    return walk(roots, []);
}

export function findContainerAnchorInTree(
    roots: ProceduralContainer[],
    containerId: string,
): { expandContainerIds: string[] } | null {
    const target = String(containerId ?? '').trim();
    if (!target) return null;
    const walk = (list: ProceduralContainer[], ancestors: string[]): string[] | null => {
        for (const c of list) {
            const chain = [...ancestors, c.id];
            if (c.id === target) return chain;
            for (const item of c.subItems) {
                if (item.type === 'container') {
                    const hit = walk([item.container], chain);
                    if (hit) return hit;
                }
            }
        }
        return null;
    };
    const chain = walk(roots, []);
    return chain ? { expandContainerIds: chain } : null;
}

/** مسار الحاويات للوصول إلى إجراء (للتوسيع والتمرير) */
export function findActionAnchorInTree(
    roots: ProceduralContainer[],
    actionId: string,
): { parentId: string; expandContainerIds: string[] } | null {
    const walk = (list: ProceduralContainer[], ancestors: string[]): ReturnType<typeof findActionAnchorInTree> => {
        for (const c of list) {
            const chain = [...ancestors, c.id];
            for (const item of c.subItems) {
                if (item.type === 'action' && item.id === actionId) {
                    return { parentId: c.id, expandContainerIds: chain };
                }
                if (item.type === 'container') {
                    const hit = walk([item.container], chain);
                    if (hit) return hit;
                }
            }
        }
        return null;
    };
    return walk(roots, []);
}

export function buildProceduralSearchVisibility(
    roots: ProceduralContainer[],
    rawQuery: string,
): ProceduralSearchVisibility {
    const q = normalizeSearchQuery(rawQuery);
    const empty = {
        active: false,
        visibleContainerIds: new Set<string>(),
        matchedItemIds: new Set<string>(),
        expandContainerIds: new Set<string>(),
    };
    if (!q.trim()) return empty;

    const hits = searchProceduralTree(roots, q);
    const matchedItemIds = new Set<string>();
    const expandContainerIds = new Set<string>();
    const visibleContainerIds = new Set<string>();

    for (const hit of hits) {
        if (hit.itemType === 'container') {
            visibleContainerIds.add(hit.itemId);
            expandContainerIds.add(hit.itemId);
        } else {
            matchedItemIds.add(hit.itemId);
            const anchor = findSubItemAnchorInTree(roots, hit.itemId);
            anchor?.expandContainerIds.forEach((cid) => {
                visibleContainerIds.add(cid);
                expandContainerIds.add(cid);
            });
        }
    }

    for (const root of roots) {
        if (subtreeHasSearchMatch(root, q)) visibleContainerIds.add(root.id);
    }

    return { active: true, visibleContainerIds, matchedItemIds, expandContainerIds };
}
