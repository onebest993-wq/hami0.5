import type { ProceduralLinkKind } from './proceduralItemLink';
import { normalizeProceduralItemLink } from './proceduralItemLink';
import {
    ProceduralNoteItem,
    ProceduralActionItem,
    ProceduralSubItem,
    ProceduralContainer,
    ProceduralAttentionEntry,
    ProceduralAttentionBoard,
    todayIsoDate,
    walkInProgressActions,
} from './proceduralContainersModel';
import {
    formatProceduralNumberChain,
    formatProceduralBreadcrumbLine,
    containerBreadcrumbTitle,
    actionStatusLabel,
} from './proceduralContainersNormalize';

export function buildProceduralAttentionBoard(
    roots: ProceduralContainer[],
    todayIso = todayIsoDate(),
): ProceduralAttentionBoard {
    const flat: ProceduralAttentionEntry[] = [];
    for (const root of roots) {
        walkInProgressActions(root, [], flat);
    }
    const overdue: ProceduralAttentionEntry[] = [];
    const upcoming: ProceduralAttentionEntry[] = [];
    const noDate: ProceduralAttentionEntry[] = [];
    for (const entry of flat) {
        const fu = entry.followUpDate;
        if (!fu) {
            noDate.push(entry);
            continue;
        }
        if (fu < todayIso) overdue.push(entry);
        else upcoming.push(entry);
    }
    return {
        overdue,
        upcoming,
        noDate,
        total: flat.length,
    };
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

export type ProceduralSubItemKind = 'note' | 'action';

/** مرجع عكسي من طلب/تايم لاين إلى عنصر في مسارات التتبع */
export type ProceduralLinkReference = {
    itemType: ProceduralSubItemKind;
    itemId: string;
    title: string;
    numberChain: string;
    breadcrumbLine: string;
};

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

function subItemSearchText(item: ProceduralNoteItem | ProceduralActionItem): string {
    const parts = [item.title];
    if (item.type === 'note' && item.body) parts.push(item.body);
    if (item.type === 'action' && item.date) parts.push(item.date);
    if (item.tags?.length) parts.push(...item.tags);
    if (item.contextNote) parts.push(item.contextNote);
    return parts.join(' ').toLowerCase();
}

function normalizeSearchQuery(raw: string): string {
    return String(raw ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/** عناصر المسار التي تشير إلى سجل طلب أو حدث تايم لاين */
export function findProceduralReferencesToLink(
    roots: ProceduralContainer[],
    target: { kind: ProceduralLinkKind; id: string },
): ProceduralLinkReference[] {
    const kind = target.kind;
    const id = String(target.id ?? '').trim();
    if (!id) return [];
    const out: ProceduralLinkReference[] = [];

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
                const link = normalizeProceduralItemLink(item.link);
                if (link?.kind === kind && link.id === id) {
                    out.push({
                        itemType: item.type,
                        itemId: item.id,
                        title: item.title,
                        numberChain: formatProceduralNumberChain(chain),
                        breadcrumbLine: formatProceduralBreadcrumbLine(crumbs),
                    });
                }
            } else if (item.type === 'container') {
                walkSubItems(item.container.subItems, chain, [
                    ...crumbs,
                    containerBreadcrumbTitle(item.container),
                ]);
            }
        }
    };

    for (let ri = 0; ri < roots.length; ri++) {
        const root = roots[ri];
        walkSubItems(root.subItems, [ri + 1], [containerBreadcrumbTitle(root)]);
    }
    return out;
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
    if (!q) return [];
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
                if (subItemSearchText(item).includes(q)) {
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
                if (containerBreadcrumbTitle(c).toLowerCase().includes(q)) {
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
        if (containerBreadcrumbTitle(root).toLowerCase().includes(q)) {
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

export type ProceduralSearchVisibility = {
    active: boolean;
    visibleContainerIds: Set<string>;
    matchedItemIds: Set<string>;
    expandContainerIds: Set<string>;
};

function subtreeHasSearchMatch(container: ProceduralContainer, q: string): boolean {
    if (containerBreadcrumbTitle(container).toLowerCase().includes(q)) return true;
    for (const item of container.subItems) {
        if (item.type === 'note' || item.type === 'action') {
            if (subItemSearchText(item).includes(q)) return true;
        } else if (item.type === 'container' && subtreeHasSearchMatch(item.container, q)) {
            return true;
        }
    }
    return false;
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
    if (!q) return empty;

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

/** نص مرتب للطباعة أو النسخ — بدون تغيير التخزين */
export function formatProceduralPathsForExport(roots: ProceduralContainer[]): string {
    const lines: string[] = ['مسارات التتبع', ''];

    const indent = (depth: number) => '  '.repeat(Math.max(0, depth));

    const walkSubItems = (subItems: ProceduralSubItem[], depth: number, prefix: string) => {
        subItems.forEach((item, idx) => {
            const num = prefix ? `${prefix}.${idx + 1}` : String(idx + 1);
            if (item.type === 'note') {
                lines.push(`${indent(depth)}${num} [ملاحظة] ${item.title}`);
                if (item.body) lines.push(`${indent(depth + 1)}${item.body}`);
            } else if (item.type === 'action') {
                lines.push(
                    `${indent(depth)}${num} [إجراء] ${item.title} — ${item.date} (${actionStatusLabel(item.status)})`,
                );
            } else {
                lines.push(`${indent(depth)}${num} [مرحلة] ${item.container.title}`);
                walkSubItems(item.container.subItems, depth + 1, num);
            }
        });
    };

    roots.forEach((root, ri) => {
        const status = root.pathStatus === 'completed' ? 'منتهٍ' : 'نشط';
        lines.push(`${ri + 1}. ${root.title} (${status})`);
        walkSubItems(root.subItems, 1, String(ri + 1));
        lines.push('');
    });

    return lines.join('\n').trim();
}

