import { normalizeProceduralItemLink } from './proceduralItemLink';
import {
    type ProceduralActionStatus,
    ProceduralNoteItem,
    ProceduralActionItem,
    ProceduralSubItem,
    ProceduralBranchRole,
    ProceduralContainer,
    CONTAINER_COLOR_PRESETS,
    CONTAINER_ICON_PRESETS,
    ACTION_STATUS_OPTIONS,
    isPathStatus,
    normalizeProceduralTags,
    normalizeFollowUpDate,
} from './proceduralContainersModel';
import { createProceduralId } from './proceduralContainersIds';
export { createProceduralId } from './proceduralContainersIds';

export function normalizeColor(raw: unknown): string {
    const v = String(raw ?? '').trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
    return CONTAINER_COLOR_PRESETS[0];
}

export function normalizeIcon(raw: unknown): string {
    const v = String(raw ?? '').trim();
    return CONTAINER_ICON_PRESETS.includes(v as (typeof CONTAINER_ICON_PRESETS)[number]) ? v : '📁';
}

export function isActionStatus(v: string): v is ProceduralActionStatus {
    return v === 'in_progress' || v === 'done' || v === 'postponed';
}

export function actionStatusLabel(status: ProceduralActionStatus): string {
    return ACTION_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function normalizeNote(raw: unknown): ProceduralNoteItem | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (String(o.type ?? '') !== 'note') return null;
    const title = String(o.title ?? '').trim();
    if (!title) return null;
    const body = String(o.body ?? '').trim();
    const link = normalizeProceduralItemLink(o.link);
    const contextNote = String(o.contextNote ?? '').trim();
    const legacyRef = String(o.contextRef ?? '').trim();
    const tags = normalizeProceduralTags(o.tags);
    const isStarred = o.isStarred === true;
    return {
        type: 'note',
        id: String(o.id ?? '').trim() || createProceduralId(),
        title,
        body: body || undefined,
        tags,
        isStarred: isStarred || undefined,
        link,
        contextNote: contextNote || (!link && legacyRef ? legacyRef : undefined),
        contextRef: !link && legacyRef ? legacyRef : undefined,
    };
}

function normalizeAction(raw: unknown): ProceduralActionItem | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (String(o.type ?? '') !== 'action') return null;
    const title = String(o.title ?? '').trim();
    const date = String(o.date ?? '').trim();
    if (!title || !date) return null;
    const st = String(o.status ?? 'in_progress');
    const status: ProceduralActionStatus = isActionStatus(st) ? st : 'in_progress';
    const link = normalizeProceduralItemLink(o.link);
    const contextNote = String(o.contextNote ?? '').trim();
    const legacyRef = String(o.contextRef ?? '').trim();
    const followUpDate = normalizeFollowUpDate(o.followUpDate, status);
    const tags = normalizeProceduralTags(o.tags);
    const isStarred = o.isStarred === true;
    return {
        type: 'action',
        id: String(o.id ?? '').trim() || createProceduralId(),
        title,
        date,
        status,
        followUpDate,
        tags,
        isStarred: isStarred || undefined,
        link,
        contextNote: contextNote || (!link && legacyRef ? legacyRef : undefined),
        contextRef: !link && legacyRef ? legacyRef : undefined,
    };
}

function normalizeContainer(raw: unknown, parentId: string | null): ProceduralContainer | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const title = String(o.title ?? o.name ?? '').trim();
    if (!title) return null;
    const id = String(o.id ?? '').trim() || createProceduralId();
    const subRaw = Array.isArray(o.subItems) ? o.subItems : Array.isArray(o.items) ? o.items : [];
    const subItems: ProceduralSubItem[] = [];
    for (const item of subRaw) {
        if (!item || typeof item !== 'object') continue;
        const t = String((item as Record<string, unknown>).type ?? '');
        if (t === 'note') {
            const n = normalizeNote(item);
            if (n) subItems.push(n);
        } else if (t === 'action') {
            const a = normalizeAction(item);
            if (a) subItems.push(a);
        } else if (t === 'container') {
            const nested = (item as Record<string, unknown>).container ?? item;
            const c = normalizeContainer(nested, id);
            if (c) subItems.push({ type: 'container', container: { ...c, parentId: id } });
        }
    }
    const st = String(o.pathStatus ?? 'active');
    const pathStatus = parentId === null && isPathStatus(st) ? st : undefined;
    const pathEndedAt =
        parentId === null && pathStatus === 'completed'
            ? String(o.pathEndedAt ?? '').trim() || undefined
            : undefined;
    const branchRaw = String(o.branchRole ?? '').trim();
    const branchRole: ProceduralBranchRole | undefined =
        parentId !== null ? (branchRaw === 'primary' ? 'primary' : 'sub') : undefined;
    return {
        id,
        title,
        color: normalizeColor(o.color),
        icon: normalizeIcon(o.icon),
        parentId,
        subItems,
        collapsed: o.collapsed === true,
        pathStatus,
        pathEndedAt,
        branchRole,
    };
}

export function normalizeProceduralContainers(raw: unknown): ProceduralContainer[] {
    if (!Array.isArray(raw)) return [];
    const roots: ProceduralContainer[] = [];
    for (const item of raw) {
        const c = normalizeContainer(item, null);
        if (c) roots.push(c);
    }
    return roots;
}

/** ترحيل المسارات المسطحة القديمة إلى حاويات جذرية */
export function migrateLegacyPathsToContainers(rawPaths: unknown): ProceduralContainer[] {
    if (!Array.isArray(rawPaths)) return [];
    const out: ProceduralContainer[] = [];
    for (const p of rawPaths) {
        if (!p || typeof p !== 'object') continue;
        const o = p as Record<string, unknown>;
        const title = String(o.name ?? o.title ?? '').trim();
        if (!title) continue;
        const id = String(o.id ?? '').trim() || createProceduralId();
        const items = Array.isArray(o.items) ? o.items : [];
        const subItems: ProceduralSubItem[] = [];
        for (const it of items) {
            if (!it || typeof it !== 'object') continue;
            const a = normalizeAction({ type: 'action', ...it });
            if (a) subItems.push(a);
        }
        out.push({
            id,
            title,
            color: normalizeColor(o.color),
            icon: '📁',
            parentId: null,
            subItems,
        });
    }
    return out;
}

export function getRootContainers(containers: ProceduralContainer[]): ProceduralContainer[] {
    return containers.filter((c) => !c.parentId);
}

export function cloneContainer(c: ProceduralContainer): ProceduralContainer {
    return {
        ...c,
        subItems: c.subItems.map((item) => {
            if (item.type === 'container') {
                return { type: 'container', container: cloneContainer(item.container) };
            }
            return { ...item };
        }),
    };
}

/** سلسلة ترقيم هيكلي للعرض فقط — لا تُخزَّن. */
export type ProceduralParentNumber = number[];

export type ProceduralPlacementContext = {
    /** عناوين المسار من الجذر إلى حاوية الإدراج */
    breadcrumb: string[];
    /** سلسلة رقمية: 1.2.3 */
    numberChain: string;
    /** سطر واحد للمودال: عنوان أ > عنوان ب */
    breadcrumbLine: string;
};

export function formatProceduralNumberChain(chain: ProceduralParentNumber): string {
    return chain.filter((n) => Number.isFinite(n) && n > 0).join('.');
}

/** يمدّد سلسلة الأب برقم الطفل حسب ترتيبه في subItems (يبدأ من 1). */
export function childProceduralNumber(
    parentNumber: ProceduralParentNumber,
    subItemIndex: number,
): ProceduralParentNumber {
    return [...parentNumber, subItemIndex + 1];
}

export function formatProceduralBreadcrumbLine(segments: string[]): string {
    return segments.map((s) => String(s ?? '').trim()).filter(Boolean).join(' › ');
}

export function containerBreadcrumbTitle(c: ProceduralContainer): string {
    return String(c.title ?? '').trim() || '—';
}

/** سياق الإدراج داخل حاوية أب — للواجهة فقط (بدون تغيير المخطط). */
export function buildProceduralPlacementContext(
    roots: ProceduralContainer[],
    parentContainerId: string,
): ProceduralPlacementContext | null {
    const targetId = String(parentContainerId ?? '').trim();
    if (!targetId) return null;

    const searchInSubItems = (
        subItems: ProceduralSubItem[],
        indexChain: number[],
        breadcrumb: string[],
    ): ProceduralPlacementContext | null => {
        for (let i = 0; i < subItems.length; i++) {
            const currentItem = subItems[i];
            if (currentItem.type !== 'container') continue;
            const c = currentItem.container;
            const chain = [...indexChain, i + 1];
            const crumbs = [...breadcrumb, containerBreadcrumbTitle(c)];
            if (c.id === targetId) {
                const numberChain = formatProceduralNumberChain(chain);
                return {
                    breadcrumb: crumbs,
                    numberChain,
                    breadcrumbLine: formatProceduralBreadcrumbLine(crumbs),
                };
            }
            const hit = searchInSubItems(c.subItems, chain, crumbs);
            if (hit) return hit;
        }
        return null;
    };

    for (let ri = 0; ri < roots.length; ri++) {
        const root = roots[ri];
        const rootChain = [ri + 1];
        const rootCrumb = containerBreadcrumbTitle(root);
        if (root.id === targetId) {
            const numberChain = formatProceduralNumberChain(rootChain);
            return {
                breadcrumb: [rootCrumb],
                numberChain,
                breadcrumbLine: formatProceduralBreadcrumbLine([rootCrumb]),
            };
        }
        const hit = searchInSubItems(root.subItems, rootChain, [rootCrumb]);
        if (hit) return hit;
    }
    return null;
}

export function findContainerInTree(
    roots: ProceduralContainer[],
    id: string,
): { container: ProceduralContainer; parent: ProceduralContainer | null; path: ProceduralContainer[] } | null {
    const walk = (
        list: ProceduralContainer[],
        parent: ProceduralContainer | null,
        path: ProceduralContainer[],
    ): ReturnType<typeof findContainerInTree> => {
        for (const c of list) {
            if (c.id === id) return { container: c, parent, path };
            for (const item of c.subItems) {
                if (item.type === 'container') {
                    const hit = walk([item.container], c, [...path, c]);
                    if (hit) return hit;
                }
            }
        }
        return null;
    };
    return walk(roots, null, []);
}

export function mapContainerTree(
    roots: ProceduralContainer[],
    fn: (c: ProceduralContainer, parent: ProceduralContainer | null) => ProceduralContainer,
): ProceduralContainer[] {
    const mapOne = (c: ProceduralContainer, parent: ProceduralContainer | null): ProceduralContainer => {
        const next = fn(c, parent);
        return {
            ...next,
            subItems: next.subItems.map((item) => {
                if (item.type === 'container') {
                    return {
                        type: 'container',
                        container: mapOne(item.container, next),
                    };
                }
                return item;
            }),
        };
    };
    return roots.map((r) => mapOne(r, null));
}

export function deleteContainerFromTree(roots: ProceduralContainer[], targetId: string): ProceduralContainer[] {
    const prune = (c: ProceduralContainer): ProceduralContainer => ({
        ...c,
        subItems: c.subItems
            .filter((item) => item.type !== 'container' || item.container.id !== targetId)
            .map((item) =>
                item.type === 'container'
                    ? { type: 'container', container: prune(item.container) }
                    : item,
            ),
    });
    return roots.filter((c) => c.id !== targetId).map(prune);
}

