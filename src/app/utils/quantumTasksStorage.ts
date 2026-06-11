import type {
    DocumentRequirementItem,
    LegalSubTask,
    LegalTask,
    TaskExpenseEntry,
} from '@/app/types/TaskEngine';
import { isTaskOnFieldCurtain } from '@/app/utils/fieldCurtain';

export const QUANTUM_TASKS_STORAGE_KEY = 'hami_quantum_legal_tasks_v1';

function mapSubTasks(raw: unknown): LegalSubTask[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((x) => {
            const o = x as Record<string, unknown>;
            return {
                id: String(o.id ?? ''),
                title: String(o.title ?? ''),
                location: o.location == null ? null : String(o.location),
                isCompleted: !!o.isCompleted,
            } as LegalSubTask;
        })
        .filter((s) => s.id.length > 0 && s.title.length > 0);
}

function mapDocumentRequirements(raw: unknown): DocumentRequirementItem[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((x) => {
            const o = x as Record<string, unknown>;
            return {
                id: String(o.id ?? ''),
                text: String(o.text ?? ''),
                isChecked: !!o.isChecked,
            } as DocumentRequirementItem;
        })
        .filter((s) => s.id.length > 0 && s.text.length > 0);
}

function mapExpenses(raw: unknown): TaskExpenseEntry[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((x) => {
            const o = x as Record<string, unknown>;
            const amt = typeof o.amount === 'number' ? o.amount : Number(o.amount);
            return {
                id: String(o.id ?? ''),
                amount: Number.isFinite(amt) ? amt : 0,
                label: String(o.label ?? ''),
            } as TaskExpenseEntry;
        })
        .filter((s) => s.id.length > 0 && s.amount > 0);
}

/** استعادة المهام من blob التخزين (localStorage). */
export function deserializeQuantumTasks(raw: unknown): LegalTask[] {
    if (raw === null || typeof raw !== 'object') return [];
    const tasksUnknown = (raw as { tasks?: unknown }).tasks;
    if (!Array.isArray(tasksUnknown)) return [];

    return tasksUnknown
        .map((row) => {
            const r = row as Record<string, unknown>;
            const status = r.status;
            const normalizedStatus =
                status === 'completed' || status === 'delegated' || status === 'pending'
                    ? status
                    : 'pending';

            let parsedDate: Date | null = null;
            if (r.parsedDate != null && typeof r.parsedDate === 'string') {
                const d = new Date(r.parsedDate);
                parsedDate = Number.isNaN(d.getTime()) ? null : d;
            }

            let reminderAt: Date | null = null;
            if (r.reminderAt != null && typeof r.reminderAt === 'string') {
                const rd = new Date(r.reminderAt);
                reminderAt = Number.isNaN(rd.getTime()) ? null : rd;
            }

            let completedAt: Date | null = null;
            if (r.completedAt != null && typeof r.completedAt === 'string') {
                const cd = new Date(r.completedAt);
                completedAt = Number.isNaN(cd.getTime()) ? null : cd;
            } else if (normalizedStatus === 'completed') {
                completedAt = parsedDate ?? new Date();
            }

            let fieldCurtainPinnedAt: Date | null = null;
            if (r.fieldCurtainPinnedAt != null && typeof r.fieldCurtainPinnedAt === 'string') {
                const pd = new Date(r.fieldCurtainPinnedAt);
                fieldCurtainPinnedAt = Number.isNaN(pd.getTime()) ? null : pd;
            }

            return {
                id: String(r.id ?? ''),
                rawText: String(r.rawText ?? ''),
                title: String(r.title ?? ''),
                location: r.location == null ? null : String(r.location),
                parsedDate,
                reminderAt,
                isFatalDeadline: !!r.isFatalDeadline,
                linkedCaseId: r.linkedCaseId == null ? null : String(r.linkedCaseId),
                status: normalizedStatus,
                completedAt,
                pinnedToFieldCurtain: !!r.pinnedToFieldCurtain,
                fieldCurtainPinnedAt,
                subTasks: mapSubTasks(r.subTasks),
                documentRequirements: mapDocumentRequirements(r.documentRequirements),
                expenses: mapExpenses(r.expenses),
            } as LegalTask;
        })
        .filter((t) => t.id.length > 0);
}

/** تسلسل للحفظ — تواريخ ISO. */
export function serializeQuantumTasks(tasks: LegalTask[]): { tasks: Record<string, unknown>[] } {
    return {
        tasks: tasks.map((t) => ({
            ...t,
            parsedDate: t.parsedDate ? t.parsedDate.toISOString() : null,
            reminderAt: t.reminderAt ? t.reminderAt.toISOString() : null,
            completedAt: t.completedAt ? t.completedAt.toISOString() : null,
            fieldCurtainPinnedAt: t.fieldCurtainPinnedAt ? t.fieldCurtainPinnedAt.toISOString() : null,
        })),
    };
}

/** عداد شارة الدوك — مهام مثبتة على ستارة الميدان فقط. */
export function countPendingFieldTasks(pendingTasks: LegalTask[]): number {
    return pendingTasks.filter(isTaskOnFieldCurtain).length;
}
