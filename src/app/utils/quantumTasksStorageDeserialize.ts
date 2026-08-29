import type {
    DocumentRequirementItem,
    LegalSubTask,
    LegalTask,
    TaskExpenseEntry,
} from '@/app/types/TaskEngine';
import type {
    CollaborationStatus,
    ShareScope,
    SharedTaskNote,
} from '@/app/types/taskHelpTypes';
import { QUANTUM_TASKS_STORAGE_KEY } from '@/app/utils/quantumTasksStorageKey';
import { sanitizeLegalTaskList } from '@/app/services/tasks/taskInputGuard';

export { QUANTUM_TASKS_STORAGE_KEY } from '@/app/utils/quantumTasksStorageKey';

const COLLAB_STATUSES: ReadonlySet<string> = new Set([
    'NONE',
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'COMPLETED',
    'AWAITING_OWNER_REVIEW',
]);

function mapSharedNotes(raw: unknown): SharedTaskNote[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const notes = raw
        .map((x) => {
            const o = x as Record<string, unknown>;
            const id = String(o.id ?? '');
            const authorId = String(o.authorId ?? '');
            const text = String(o.text ?? '').trim();
            const timestamp = String(o.timestamp ?? '');
            if (!id || !authorId || !text || !timestamp) return null;
            const note: SharedTaskNote = { id, authorId, text, timestamp };
            if (typeof o.authorName === 'string' && o.authorName.trim()) {
                note.authorName = o.authorName.trim();
            }
            return note;
        })
        .filter((n): n is SharedTaskNote => n != null);
    return notes.length > 0 ? notes : undefined;
}

function mapCollaborationFields(r: Record<string, unknown>): Partial<LegalTask> {
    const out: Partial<LegalTask> = {};
    if (typeof r.helpRequestId === 'string' && r.helpRequestId.trim()) {
        out.helpRequestId = r.helpRequestId.trim();
    }
    if (typeof r.requesterId === 'string' && r.requesterId.trim()) {
        out.requesterId = r.requesterId.trim();
    }
    if (typeof r.assigneeId === 'string' && r.assigneeId.trim()) {
        out.assigneeId = r.assigneeId.trim();
    }
    if (r.shareScope === 'PRIVATE_DIRECT' || r.shareScope === 'PUBLIC_FORUM') {
        out.shareScope = r.shareScope as ShareScope;
    }
    if (typeof r.collaborationStatus === 'string' && COLLAB_STATUSES.has(r.collaborationStatus)) {
        out.collaborationStatus = r.collaborationStatus as CollaborationStatus;
    }
    if (typeof r.isSanitised === 'boolean') {
        out.isSanitised = r.isSanitised;
    }
    const notes = mapSharedNotes(r.sharedNotes);
    if (notes) out.sharedNotes = notes;
    return out;
}

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
                kind: o.kind === 'field' || o.kind === 'branch' ? o.kind : undefined,
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

/** قراءة خام — localStorage فقط، بلا أجندة أسبوعية أو محلل نص. */
export function readQuantumTasksRawFromDiskSync(): string | null {
    try {
        if (typeof localStorage !== 'undefined') {
            const fromLs = localStorage.getItem(QUANTUM_TASKS_STORAGE_KEY);
            if (fromLs?.trim()) return fromLs;
        }
    } catch {
        /* ignore */
    }
    return null;
}

/** استعادة المهام من blob التخزين (localStorage). */
export function deserializeQuantumTasks(raw: unknown): LegalTask[] {
    if (raw === null || typeof raw !== 'object') return [];
    const tasksUnknown = (raw as { tasks?: unknown }).tasks;
    if (!Array.isArray(tasksUnknown)) return [];

    return sanitizeLegalTaskList(
        tasksUnknown
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
                voiceRef: r.voiceRef == null ? null : String(r.voiceRef),
                voiceTranscript: r.voiceTranscript == null ? null : String(r.voiceTranscript),
                voiceDurationSec:
                    typeof r.voiceDurationSec === 'number' && Number.isFinite(r.voiceDurationSec)
                        ? r.voiceDurationSec
                        : null,
                ...mapCollaborationFields(r),
            } as LegalTask;
        })
        .filter((t) => t.id.length > 0),
    );
}

/** تسلسل للحفظ — تواريخ ISO. */
export function serializeQuantumTasks(tasks: LegalTask[]): { tasks: Record<string, unknown>[] } {
    return {
        tasks: sanitizeLegalTaskList(tasks).map((t) => ({
            ...t,
            parsedDate: t.parsedDate ? t.parsedDate.toISOString() : null,
            reminderAt: t.reminderAt ? t.reminderAt.toISOString() : null,
            completedAt: t.completedAt ? t.completedAt.toISOString() : null,
            fieldCurtainPinnedAt: t.fieldCurtainPinnedAt ? t.fieldCurtainPinnedAt.toISOString() : null,
        })),
    };
}
