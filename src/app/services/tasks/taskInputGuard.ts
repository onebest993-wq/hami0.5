import type {
    DocumentRequirementItem,
    LegalSubTask,
    LegalTask,
    TaskExpenseEntry,
} from '@/app/types/TaskEngine';
import type { SharedTaskNote } from '@/app/types/taskHelpTypes';

/** حد النص الخام — يمنع تضخّم التخزين المحلي */
export const MAX_TASK_RAW_LENGTH = 2000;
export const MAX_TASK_TITLE_LENGTH = 500;
export const MAX_TASK_LOCATION_LENGTH = 200;
export const MAX_TASK_LINE_LENGTH = 500;
export const MAX_EXPENSE_LABEL_LENGTH = 120;
export const MAX_EXPENSE_AMOUNT = 1_000_000_000_000;
export const MAX_VOICE_TRANSCRIPT_LENGTH = 4000;
export const MAX_HELP_NOTE_LENGTH = 2000;
export const MAX_NESTED_ITEMS = 40;
export const MAX_TASKS_IN_STORE = 2000;
export const MAX_ID_LENGTH = 80;
export const MAX_VOICE_DATA_URL_CHARS = 6_000_000;

const CONTROL_CHARS =
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;

const TASK_VOICE_REF_PREFIX = 'hami-voice-ref:';

const TASK_PATCH_KEYS = [
    'rawText',
    'title',
    'location',
    'parsedDate',
    'reminderAt',
    'isFatalDeadline',
    'linkedCaseId',
    'status',
    'completedAt',
    'pinnedToFieldCurtain',
    'fieldCurtainPinnedAt',
    'subTasks',
    'documentRequirements',
    'expenses',
    'voiceRef',
    'voiceTranscript',
    'voiceDurationSec',
    'helpRequestId',
    'requesterId',
    'assigneeId',
    'shareScope',
    'collaborationStatus',
    'isSanitised',
    'sharedNotes',
] as const;

export function clampTaskText(value: string, max: number): string {
    return String(value ?? '')
        .replace(CONTROL_CHARS, '')
        .trim()
        .slice(0, max);
}

export function clampExpenseAmount(amount: number): number | null {
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return Math.min(amount, MAX_EXPENSE_AMOUNT);
}

export function isAllowedTaskVoiceRef(ref: string | null | undefined): boolean {
    if (!ref) return false;
    if (!ref.startsWith(TASK_VOICE_REF_PREFIX)) return false;
    const key = ref.slice(TASK_VOICE_REF_PREFIX.length).trim();
    if (!key.startsWith('task-voice-')) return false;
    if (key.length > 180) return false;
    if (key.includes('..') || key.includes('/') || key.includes('\\')) return false;
    return true;
}

export function sanitizeTaskVoiceRef(ref: string | null | undefined): string | null {
    if (ref == null) return null;
    const trimmed = String(ref).trim();
    return isAllowedTaskVoiceRef(trimmed) ? trimmed : null;
}

function clampId(id: string): string {
    return clampTaskText(id, MAX_ID_LENGTH);
}

function sanitizeSubTask(raw: LegalSubTask): LegalSubTask | null {
    const id = clampId(raw.id);
    const title = clampTaskText(raw.title, MAX_TASK_LINE_LENGTH);
    if (!id || !title) return null;
    const loc = raw.location == null ? null : clampTaskText(raw.location, MAX_TASK_LOCATION_LENGTH);
    return {
        ...raw,
        id,
        title,
        location: loc || null,
        isCompleted: !!raw.isCompleted,
        kind: raw.kind === 'field' || raw.kind === 'branch' ? raw.kind : undefined,
    };
}

function sanitizeDocumentRequirement(raw: DocumentRequirementItem): DocumentRequirementItem | null {
    const id = clampId(raw.id);
    const text = clampTaskText(raw.text, MAX_TASK_LINE_LENGTH);
    if (!id || !text) return null;
    return { ...raw, id, text, isChecked: !!raw.isChecked };
}

function sanitizeExpense(raw: TaskExpenseEntry): TaskExpenseEntry | null {
    const id = clampId(raw.id);
    const amount = clampExpenseAmount(raw.amount);
    if (!id || amount == null) return null;
    return {
        ...raw,
        id,
        amount,
        label: clampTaskText(raw.label, MAX_EXPENSE_LABEL_LENGTH) || 'مصروف',
    };
}

function sanitizeSharedNotes(notes: SharedTaskNote[] | undefined): SharedTaskNote[] | undefined {
    if (!Array.isArray(notes)) return undefined;
    const next = notes
        .map((n) => {
            const id = clampId(n.id);
            const authorId = clampTaskText(n.authorId, MAX_ID_LENGTH);
            const text = clampTaskText(n.text, MAX_HELP_NOTE_LENGTH);
            const timestamp = clampTaskText(n.timestamp, 40);
            if (!id || !authorId || !text || !timestamp) return null;
            const note: SharedTaskNote = { id, authorId, text, timestamp };
            if (n.authorName) {
                const name = clampTaskText(n.authorName, 80);
                if (name) note.authorName = name;
            }
            return note;
        })
        .filter((n): n is SharedTaskNote => n != null)
        .slice(0, MAX_NESTED_ITEMS);
    return next.length > 0 ? next : undefined;
}

export function sanitizeLegalTask(task: LegalTask): LegalTask {
    const id = clampId(task.id);
    const rawText = clampTaskText(task.rawText, MAX_TASK_RAW_LENGTH);
    const title =
        clampTaskText(task.title, MAX_TASK_TITLE_LENGTH) || rawText.slice(0, MAX_TASK_TITLE_LENGTH);
    const location =
        task.location == null ? null : clampTaskText(task.location, MAX_TASK_LOCATION_LENGTH) || null;
    const linkedCaseId =
        task.linkedCaseId == null ? null : clampTaskText(task.linkedCaseId, MAX_ID_LENGTH) || null;
    const voiceTranscript =
        task.voiceTranscript == null
            ? null
            : clampTaskText(task.voiceTranscript, MAX_VOICE_TRANSCRIPT_LENGTH) || null;
    const voiceDurationSec =
        typeof task.voiceDurationSec === 'number' && Number.isFinite(task.voiceDurationSec)
            ? Math.min(Math.max(task.voiceDurationSec, 0), 180)
            : null;

    const sanitized: LegalTask = {
        ...task,
        id,
        rawText,
        title: title || 'مهمة',
        location,
        linkedCaseId,
        subTasks: (task.subTasks ?? [])
            .map(sanitizeSubTask)
            .filter((s): s is LegalSubTask => s != null)
            .slice(0, MAX_NESTED_ITEMS),
        documentRequirements: (task.documentRequirements ?? [])
            .map(sanitizeDocumentRequirement)
            .filter((s): s is DocumentRequirementItem => s != null)
            .slice(0, MAX_NESTED_ITEMS),
        expenses: (task.expenses ?? [])
            .map(sanitizeExpense)
            .filter((s): s is TaskExpenseEntry => s != null)
            .slice(0, MAX_NESTED_ITEMS),
        voiceRef: sanitizeTaskVoiceRef(task.voiceRef),
        voiceTranscript,
        voiceDurationSec,
    };

    const notes = sanitizeSharedNotes(task.sharedNotes);
    if (notes) sanitized.sharedNotes = notes;
    else delete sanitized.sharedNotes;

    if (task.helpRequestId) {
        const hid = clampTaskText(task.helpRequestId, MAX_ID_LENGTH);
        if (hid) sanitized.helpRequestId = hid;
        else delete sanitized.helpRequestId;
    }
    if (task.requesterId) {
        const rid = clampTaskText(task.requesterId, MAX_ID_LENGTH);
        if (rid) sanitized.requesterId = rid;
        else delete sanitized.requesterId;
    }
    if (task.assigneeId) {
        const aid = clampTaskText(task.assigneeId, MAX_ID_LENGTH);
        if (aid) sanitized.assigneeId = aid;
        else delete sanitized.assigneeId;
    }

    return sanitized;
}

export function sanitizeLegalTaskList(tasks: LegalTask[]): LegalTask[] {
    return tasks
        .map(sanitizeLegalTask)
        .filter((t) => t.id.length > 0)
        .slice(0, MAX_TASKS_IN_STORE);
}

export function sanitizeTaskPatch(patch: Partial<LegalTask>): Partial<LegalTask> {
    const picked: Partial<LegalTask> = {};
    for (const key of TASK_PATCH_KEYS) {
        if (Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== undefined) {
            (picked as Record<string, unknown>)[key] = patch[key];
        }
    }
    const full = sanitizeLegalTask({
        id: 'patch',
        rawText: '',
        title: '',
        location: null,
        parsedDate: null,
        reminderAt: null,
        isFatalDeadline: false,
        linkedCaseId: null,
        status: 'pending',
        completedAt: null,
        pinnedToFieldCurtain: false,
        fieldCurtainPinnedAt: null,
        subTasks: [],
        documentRequirements: [],
        expenses: [],
        voiceRef: null,
        voiceTranscript: null,
        voiceDurationSec: null,
        ...picked,
    });
    const out: Partial<LegalTask> = {};
    for (const key of TASK_PATCH_KEYS) {
        if (Object.prototype.hasOwnProperty.call(patch, key)) {
            (out as Record<string, unknown>)[key] = full[key];
        }
    }
    return out;
}
