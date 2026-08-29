/**
 * Normalize / migrate / tags / follow-up date helpers for procedural containers.
 * Pure data transforms — no UI. Re-exported from proceduralContainersEngine.
 */
import { normalizeProceduralItemLink } from './proceduralItemLink';
import {
    isActionStatus,
    isPathStatus,
    type ProceduralActionItem,
    type ProceduralActionStatus,
    type ProceduralBranchRole,
    type ProceduralContainer,
    type ProceduralNoteItem,
    type ProceduralSubItem,
} from './proceduralContainersModel';
import {
    createProceduralId,
    normalizeColor,
    normalizeIcon,
} from './proceduralContainersTreeOps';

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
