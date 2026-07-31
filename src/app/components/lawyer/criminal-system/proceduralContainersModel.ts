import type { ProceduralItemLink } from './proceduralItemLink';
import { createProceduralId } from './proceduralContainersIds';

export type ProceduralActionStatus = 'in_progress' | 'done' | 'postponed';

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

export function walkInProgressActions(
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
