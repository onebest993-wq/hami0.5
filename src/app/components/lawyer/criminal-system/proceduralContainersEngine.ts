import type { ProceduralItemLink, ProceduralLinkKind } from './proceduralItemLink';
import { normalizeProceduralItemLink } from './proceduralItemLink';

export type ProceduralActionStatus = 'in_progress' | 'done' | 'postponed';

/** ربط سياقي اختياري — نص حر (جلسة، طلب، طرف…) */
export type ProceduralContextRef = string;

export type ProceduralNoteItem = {
    type: 'note';
    id: string;
    title: string;
    body?: string;
    tags?: string[];
    isStarred?: boolean;
    /** @deprecated — يُقرأ للترحيل؛ استخدم link */
    contextRef?: ProceduralContextRef;
    link?: ProceduralItemLink;
    contextNote?: string;
};

export type ProceduralActionItem = {
    type: 'action';
    id: string;
    title: string;
    date: string;
    status: ProceduralActionStatus;
    /** مراجعة صامتة — فقط مع status = in_progress */
    followUpDate?: string;
    tags?: string[];
    isStarred?: boolean;
    contextRef?: ProceduralContextRef;
    link?: ProceduralItemLink;
    contextNote?: string;
};

/** حاوية متداخلة داخل subItems */
export type ProceduralNestedContainerItem = {
    type: 'container';
    container: ProceduralContainer;
};

export type ProceduralSubItem = ProceduralNoteItem | ProceduralActionItem | ProceduralNestedContainerItem;

/** حالة المسار الجذري فقط — مساران منفصلان لا يُعاملان كمرحلة ١ و٢ */
export type ProceduralPathStatus = 'active' | 'completed';

/** داخل مسار جذر: فرع رئيسي (مسار أساسي) أو فرع أصغر (مسار فرعي) */
export type ProceduralBranchRole = 'primary' | 'sub';

export type ProceduralContainer = {
    id: string;
    title: string;
    color: string;
    icon: string;
    parentId: string | null;
    subItems: ProceduralSubItem[];
    collapsed?: boolean;
    /** للجذر فقط: مسار نشط أو منتهٍ (نقطة نهاية) */
    pathStatus?: ProceduralPathStatus;
    pathEndedAt?: string;
    /** للحاويات المتداخلة فقط */
    branchRole?: ProceduralBranchRole;
};

export function isBranchRole(v: string): v is ProceduralBranchRole {
    return v === 'primary' || v === 'sub';
}

export function branchRoleLabel(role: ProceduralBranchRole | undefined, isRoot: boolean): string {
    if (isRoot) return 'مسار مستقل';
    if (role === 'primary') return 'مسار أساسي';
    return 'مسار فرعي';
}

export function isPathStatus(v: string): v is ProceduralPathStatus {
    return v === 'active' || v === 'completed';
}

export function pathStatusLabel(status: ProceduralPathStatus): string {
    return status === 'completed' ? 'منتهٍ' : 'نشط';
}

export const CONTAINER_COLOR_PRESETS = [
    '#E6C673',
    '#38bdf8',
    '#a78bfa',
    '#34d399',
    '#fb923c',
    '#f472b6',
    '#f87171',
    '#94a3b8',
] as const;

export const CONTAINER_ICON_PRESETS = ['🛤️', '📁', '📨', '🔬', '⚖️', '📋', '🏛️', '🔐', '💡'] as const;

export const ACTION_STATUS_OPTIONS: { value: ProceduralActionStatus; label: string }[] = [
    { value: 'in_progress', label: 'قيد المتابعة' },
    { value: 'done', label: 'منجز' },
    { value: 'postponed', label: 'مؤجل' },
];

export type AddChildKind = 'note' | 'action' | 'container';

/** تحديث جزئي لملاحظة أو إجراء داخل الشجرة */
export type ProceduralSubItemPatch = {
    title?: string;
    body?: string;
    date?: string;
    status?: ProceduralActionStatus;
    followUpDate?: string;
    tags?: string[];
    isStarred?: boolean;
    link?: ProceduralItemLink;
    contextNote?: string;
    contextRef?: string;
};

const MAX_TAG_LEN = 48;
const MAX_TAGS = 12;

export function normalizeProceduralTags(raw: unknown): string[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of raw) {
        const t = String(item ?? '').trim();
        if (!t || seen.has(t)) continue;
        seen.add(t);
        out.push(t.slice(0, MAX_TAG_LEN));
        if (out.length >= MAX_TAGS) break;
    }
    return out.length ? out : undefined;
}

/** نص مفصول بفواصل → وسوم */
export function parseTagsInput(text: string): string[] | undefined {
    const parts = String(text ?? '')
        .split(/[,،]/)
        .map((s) => s.trim())
        .filter(Boolean);
    return normalizeProceduralTags(parts);
}

export function formatTagsInput(tags: string[] | undefined): string {
    return Array.isArray(tags) ? tags.join('، ') : '';
}

export function cloneProceduralNoteItem(source: ProceduralNoteItem): ProceduralNoteItem {
    return {
        ...source,
        type: 'note',
        id: createProceduralId(),
        tags: source.tags ? [...source.tags] : undefined,
        link: source.link ? { ...source.link } : undefined,
    };
}

export function cloneProceduralActionItem(source: ProceduralActionItem): ProceduralActionItem {
    return {
        ...source,
        type: 'action',
        id: createProceduralId(),
        tags: source.tags ? [...source.tags] : undefined,
        link: source.link ? { ...source.link } : undefined,
    };
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeFollowUpDate(raw: unknown, status: ProceduralActionStatus): string | undefined {
    if (status !== 'in_progress') return undefined;
    const v = String(raw ?? '').trim();
    return ISO_DATE_RE.test(v) ? v : undefined;
}

/** تاريخ اليوم ISO — للمقارنة مع موعد المراجعة */
export function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

/** موعد المراجعة حلّ أو تأخّر (YYYY-MM-DD مقارنة lexicographic) */
export function isFollowUpDueOrOverdue(followUpDate: string, todayIso = todayIsoDate()): boolean {
    const d = String(followUpDate ?? '').trim();
    if (!ISO_DATE_RE.test(d)) return false;
    return todayIso >= d;
}

/** إدخال مستخلص لمركز المتابعة — بدون تغيير نموذج البيانات */
export type ProceduralAttentionEntry = {
    actionId: string;
    parentId: string;
    title: string;
    followUpDate?: string;
    pathLabel: string;
};

export type ProceduralAttentionBoard = {
    overdue: ProceduralAttentionEntry[];
    upcoming: ProceduralAttentionEntry[];
    noDate: ProceduralAttentionEntry[];
    total: number;
};

function walkInProgressActions(
    container: ProceduralContainer,
    pathParts: string[],
    sink: ProceduralAttentionEntry[],
) {
    const pathLabel = [...pathParts, container.title].join(' › ');
    for (const item of container.subItems) {
        if (item.type === 'action' && item.status === 'in_progress') {
            const followUpDate = normalizeFollowUpDate(item.followUpDate, 'in_progress');
            sink.push({
                actionId: item.id,
                parentId: container.id,
                title: item.title,
                followUpDate,
                pathLabel,
            });
        } else if (item.type === 'container') {
            walkInProgressActions(item.container, [...pathParts, container.title], sink);
        }
    }
}

/** تسطيح الشجرة وتصنيف إجراءات قيد المتابعة حسب موعد المراجعة */
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

export function createProceduralId(): string {
    return globalThis.crypto &&
        'randomUUID' in globalThis.crypto &&
        typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

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

function containerBreadcrumbTitle(c: ProceduralContainer): string {
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
            if (subItems[i].type !== 'container') continue;
            const c = subItems[i].container;
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

export function insertRootContainer(roots: ProceduralContainer[], container: ProceduralContainer): ProceduralContainer[] {
    return [...roots, { ...container, parentId: null }];
}

export function insertNestedContainer(
    roots: ProceduralContainer[],
    parentId: string,
    child: ProceduralContainer,
): ProceduralContainer[] {
    return mapContainerTree(roots, (c) => {
        if (c.id !== parentId) return c;
        return {
            ...c,
            subItems: [
                ...c.subItems,
                { type: 'container', container: { ...child, parentId: parentId } },
            ],
        };
    });
}

export function appendSubItem(roots: ProceduralContainer[], parentId: string, item: ProceduralSubItem): ProceduralContainer[] {
    return mapContainerTree(roots, (c) => {
        if (c.id !== parentId) return c;
        return { ...c, subItems: [...c.subItems, item] };
    });
}

/** نسخ ملاحظة/إجراء وإدراجه مباشرة أسفل الأصل */
export function duplicateSubItemInTree(
    roots: ProceduralContainer[],
    parentId: string,
    itemId: string,
): ProceduralContainer[] | null {
    let ok = false;
    const next = mapContainerTree(roots, (c) => {
        if (c.id !== parentId) return c;
        const idx = c.subItems.findIndex((item) => subItemMatchesId(item, itemId));
        if (idx < 0) return c;
        const item = c.subItems[idx];
        if (item.type === 'note') {
            const copy = cloneProceduralNoteItem(item);
            const subItems = [...c.subItems];
            subItems.splice(idx + 1, 0, copy);
            ok = true;
            return { ...c, subItems };
        }
        if (item.type === 'action') {
            const copy = cloneProceduralActionItem(item);
            const subItems = [...c.subItems];
            subItems.splice(idx + 1, 0, copy);
            ok = true;
            return { ...c, subItems };
        }
        return c;
    });
    return ok ? next : null;
}

function subItemMatchesId(item: ProceduralSubItem, itemId: string): boolean {
    if (item.type === 'container') return item.container.id === itemId;
    return item.id === itemId;
}

export function updateSubItemInTree(
    roots: ProceduralContainer[],
    parentId: string,
    itemId: string,
    patch: ProceduralSubItemPatch,
): ProceduralContainer[] {
    return mapContainerTree(roots, (c) => {
        if (c.id !== parentId) return c;
        return {
            ...c,
            subItems: c.subItems.map((item) => {
                if (!subItemMatchesId(item, itemId)) return item;
                if (item.type === 'note') return { ...item, ...patch, type: 'note' as const };
                if (item.type === 'action') return { ...item, ...patch, type: 'action' as const };
                return item;
            }),
        };
    });
}

export function removeSubItemFromTree(roots: ProceduralContainer[], parentId: string, itemId: string): ProceduralContainer[] {
    return mapContainerTree(roots, (c) => {
        if (c.id !== parentId) return c;
        return {
            ...c,
            subItems: c.subItems.filter((item) => {
                if (item.type === 'container') return item.container.id !== itemId;
                return item.id !== itemId;
            }),
        };
    });
}

/** نقل عنصر بين حاويات أو إعادة ترتيب داخل نفس الحاوية */
export function moveSubItemInTree(
    roots: ProceduralContainer[],
    fromParentId: string,
    toParentId: string,
    itemId: string,
    toIndex: number,
): ProceduralContainer[] {
    let moving: ProceduralSubItem | null = null;
    let afterRemove = mapContainerTree(roots, (c) => {
        if (c.id !== fromParentId) return c;
        const idx = c.subItems.findIndex((it) => {
            if (it.type === 'container') return it.container.id === itemId;
            return it.id === itemId;
        });
        if (idx < 0) return c;
        moving = c.subItems[idx]!;
        return { ...c, subItems: c.subItems.filter((_, i) => i !== idx) };
    });
    if (!moving) return roots;
    const item = moving;
    return mapContainerTree(afterRemove, (c) => {
        if (c.id !== toParentId) return c;
        const next = [...c.subItems];
        const safeIdx = Math.max(0, Math.min(toIndex, next.length));
        next.splice(safeIdx, 0, item);
        return { ...c, subItems: next };
    });
}

export function insertRootContainerAt(
    roots: ProceduralContainer[],
    container: ProceduralContainer,
    index: number,
): ProceduralContainer[] {
    const next = [...roots, { ...container, parentId: null }];
    const safeIdx = Math.max(0, Math.min(index, next.length - 1));
    const [row] = next.splice(next.length - 1, 1);
    next.splice(safeIdx, 0, row);
    return next;
}

export function insertNestedContainerAt(
    roots: ProceduralContainer[],
    parentId: string,
    child: ProceduralContainer,
    index: number,
): ProceduralContainer[] {
    return mapContainerTree(roots, (c) => {
        if (c.id !== parentId) return c;
        const next = [...c.subItems];
        const safeIdx = Math.max(0, Math.min(index, next.length));
        next.splice(safeIdx, 0, { type: 'container', container: { ...child, parentId } });
        return { ...c, subItems: next };
    });
}

/** نقل حاوية بين الجذر والتداخل */
export function moveContainerInTree(
    roots: ProceduralContainer[],
    containerId: string,
    newParentId: string | null,
    toIndex: number,
): ProceduralContainer[] {
    const hit = findContainerInTree(roots, containerId);
    if (!hit) return roots;
    const moving = cloneContainer(hit.container);
    let next = deleteContainerFromTree(roots, containerId);
    if (newParentId === null) {
        return insertRootContainerAt(next, { ...moving, parentId: null }, toIndex);
    }
    return insertNestedContainerAt(next, newParentId, moving, toIndex);
}

export function reorderRootContainers(
    roots: ProceduralContainer[],
    fromId: string,
    toId: string,
): ProceduralContainer[] {
    const list = [...roots];
    const fromIdx = list.findIndex((c) => c.id === fromId);
    const toIdx = list.findIndex((c) => c.id === toId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return roots;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    return list;
}

export function advanceActionToNextPhase(
    roots: ProceduralContainer[],
    parentId: string,
    actionId: string,
    opts?: { spawnChildContainer?: { title: string; color?: string; icon?: string } },
): ProceduralContainer[] {
    let updated = updateSubItemInTree(roots, parentId, actionId, {
        status: 'done',
        followUpDate: undefined,
    });
    if (opts?.spawnChildContainer?.title?.trim()) {
        const child: ProceduralContainer = {
            id: createProceduralId(),
            title: opts.spawnChildContainer.title.trim(),
            color: normalizeColor(opts.spawnChildContainer.color),
            icon: normalizeIcon(opts.spawnChildContainer.icon),
            parentId: parentId,
            subItems: [],
        };
        updated = insertNestedContainer(updated, parentId, child);
    }
    return updated;
}
