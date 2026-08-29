import type { ProceduralItemLink } from './proceduralItemLink';

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
    /**
     * @deprecated KEEP — يُقرأ في `proceduralContainersNormalize` + proceduralItemLink للبيانات القديمة؛ استخدم link.
     */
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

export function isActionStatus(v: string): v is ProceduralActionStatus {
    return v === 'in_progress' || v === 'done' || v === 'postponed';
}

export function actionStatusLabel(status: ProceduralActionStatus): string {
    return ACTION_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}
