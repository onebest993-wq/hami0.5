/**
 * إجراءات طلب المساعدة — تُحمَّل خدمات Forum/TaskHelp ديناميكياً عند الاستدعاء فقط
 * حتى لا تدخل في مسار ستارة الميدان / QuantumTasks الساخن.
 */
import type { LegalTask } from '@/app/types/TaskEngine';
import type { ShareScope, TaskHelpRequest } from '@/app/types/taskHelpTypes';
import { clampTaskText, MAX_HELP_NOTE_LENGTH } from '@/app/services/tasks/taskInputGuard';

export type RequestTaskHelpParams = {
    taskId: string;
    scope: ShareScope;
    requesterId: string;
    requesterName?: string;
    targetColleagueId?: string;
    targetColleagueName?: string;
    note?: string;
};

function newId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `thr-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function canRequestTaskHelp(task: LegalTask | undefined | null): task is LegalTask {
    if (!task || task.completedAt) return false;
    const status = task.collaborationStatus;
    return status !== 'PENDING' && status !== 'ACCEPTED' && status !== 'AWAITING_OWNER_REVIEW';
}

export async function executeRequestTaskHelp(
    task: LegalTask,
    params: RequestTaskHelpParams,
): Promise<TaskHelpRequest | null> {
    if (!canRequestTaskHelp(task)) return null;
    if (params.scope === 'PRIVATE_DIRECT' && !params.targetColleagueId) return null;

    const [{ sanitizeTaskForPublic, redactPiiText }, { TaskHelpApiService }] = await Promise.all([
        import('@/app/services/tasks/taskSanitizer'),
        import('@/app/services/taskHelp/taskHelpApiService'),
    ]);

    const note = clampTaskText(params.note ?? '', MAX_HELP_NOTE_LENGTH);
    const publicPayload = params.scope === 'PUBLIC_FORUM' ? sanitizeTaskForPublic(task) : null;
    const title = publicPayload?.title ?? task.title;
    const location = publicPayload?.location ?? task.location;
    const dueDate = publicPayload?.dueDate ?? (task.parsedDate?.toISOString() ?? null);
    const safeNote = params.scope === 'PUBLIC_FORUM' ? redactPiiText(note) : note;
    const instructions = [publicPayload?.instructions, safeNote]
        .filter(Boolean)
        .join('\n\n');

    const created = await TaskHelpApiService.create({
        sourceTaskId: task.id,
        requesterId: params.requesterId,
        requesterName: params.requesterName,
        shareScope: params.scope,
        title,
        location,
        dueDate,
        instructions: instructions || undefined,
        isSanitised: params.scope === 'PUBLIC_FORUM',
        targetColleagueId: params.targetColleagueId,
        targetColleagueName: params.targetColleagueName,
        note: safeNote || undefined,
    });

    if (params.scope === 'PUBLIC_FORUM') {
        try {
            const { ForumApiService } = await import('@/app/services/forumApiService');
            const nowIso = new Date().toISOString();
            const saved = await ForumApiService.createPost({
                id: newId(),
                authorId: params.requesterId,
                authorName: params.requesterName?.trim() || 'محامٍ',
                content: [title, location ? `الموقع: ${location}` : '', instructions]
                    .filter(Boolean)
                    .join('\n')
                    .slice(0, 10000),
                tags: ['#مساعدة_مهام', '#تنفيذ'],
                createdAt: nowIso,
                updatedAt: nowIso,
                attachment: null,
                upvoterIds: [],
                comments: [],
                bestCommentId: null,
                isUrgent: true,
                isAnonymous: false,
            });
            if (saved?.id) {
                await TaskHelpApiService.attachForumPost(created.id, params.requesterId, saved.id);
                created.forumPostId = saved.id;
            }
        } catch {
            /* الطلب يبقى قائماً حتى لو فشل منشور المنتدى */
        }
    }

    return created;
}

export async function executeAcceptTaskHelp(
    helpRequestId: string,
    colleagueId: string,
    colleagueName?: string,
): Promise<TaskHelpRequest> {
    const { TaskHelpApiService } = await import('@/app/services/taskHelp/taskHelpApiService');
    return TaskHelpApiService.accept(helpRequestId, colleagueId, colleagueName);
}

export async function executeAddSharedTaskNote(
    helpRequestId: string,
    authorId: string,
    noteText: string,
    authorName?: string,
): Promise<TaskHelpRequest> {
    const { TaskHelpApiService } = await import('@/app/services/taskHelp/taskHelpApiService');
    return TaskHelpApiService.addNote(
        helpRequestId,
        authorId,
        clampTaskText(noteText, MAX_HELP_NOTE_LENGTH),
        authorName,
    );
}

export async function executeMarkHelpCompleted(
    helpRequestId: string,
    actorId: string,
): Promise<TaskHelpRequest> {
    const { TaskHelpApiService } = await import('@/app/services/taskHelp/taskHelpApiService');
    return TaskHelpApiService.markHelperDone(helpRequestId, actorId);
}

export async function executeConfirmHelpReview(
    helpRequestId: string,
    actorId: string,
): Promise<TaskHelpRequest> {
    const { TaskHelpApiService } = await import('@/app/services/taskHelp/taskHelpApiService');
    return TaskHelpApiService.confirmOwnerReview(helpRequestId, actorId);
}

export function helpFieldsPatchFromRequest(help: TaskHelpRequest): Partial<LegalTask> {
    const patch: Partial<LegalTask> = {
        helpRequestId: help.id,
        requesterId: help.requesterId,
        assigneeId: help.assigneeId,
        shareScope: help.shareScope,
        collaborationStatus: help.collaborationStatus,
        isSanitised: help.isSanitised,
        sharedNotes: help.sharedNotes,
    };
    if (
        help.collaborationStatus === 'ACCEPTED' ||
        help.collaborationStatus === 'AWAITING_OWNER_REVIEW'
    ) {
        patch.status = 'delegated';
    }
    return patch;
}
