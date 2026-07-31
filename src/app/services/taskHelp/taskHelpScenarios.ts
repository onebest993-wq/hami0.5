/**
 * سيناريوهات تشغيل محلية لميزة طلب المساعدة — بدون شبكة حية.
 * تُستخدم في الاختبارات للتحقق من مسار العمل الكامل.
 */
import type { LegalTask } from '@/app/types/TaskEngine';
import type { TaskHelpRequest } from '@/app/types/taskHelpTypes';
import { sanitizeTaskForPublic } from '@/app/services/tasks/taskSanitizer';
import { TaskHelpRepository } from '@/app/services/taskHelp/taskHelpRepository';

export type ScenarioActor = { id: string; name: string };

export type HelpLifecycleResult = {
    request: TaskHelpRequest;
    publicTitle?: string;
    secondAcceptCode?: string;
    strangerNoteOk: boolean;
    notesCount: number;
};

/** سيناريو: طلب عام → قبول أول زميل → رفض الثاني → ملاحظات → إنجاز → تأكيد مالك */
export async function runPublicHelpLifecycleScenario(params: {
    owner: ScenarioActor;
    helperA: ScenarioActor;
    helperB: ScenarioActor;
    stranger: ScenarioActor;
    task: LegalTask;
}): Promise<HelpLifecycleResult> {
    const sanitized = sanitizeTaskForPublic(params.task);
    const created = await TaskHelpRepository.create({
        sourceTaskId: params.task.id,
        requesterId: params.owner.id,
        requesterName: params.owner.name,
        shareScope: 'PUBLIC_FORUM',
        title: sanitized.title,
        location: sanitized.location,
        dueDate: sanitized.dueDate,
        instructions: sanitized.instructions,
        isSanitised: true,
    });

    const first = await TaskHelpRepository.accept(created.id, params.helperA.id, params.helperA.name);
    if (first.ok === false) throw new Error(`expected first accept ok, got ${first.code}`);

    const second = await TaskHelpRepository.accept(created.id, params.helperB.id, params.helperB.name);
    const secondAcceptCode = second.ok === false ? second.code : undefined;

    const strangerNote = await TaskHelpRepository.addNote(
        created.id,
        params.stranger.id,
        'ملاحظة دخيل',
        params.stranger.name,
    );

    const ownerNote = await TaskHelpRepository.addNote(
        created.id,
        params.owner.id,
        'شكراً على القبول',
        params.owner.name,
    );
    const helperNote = await TaskHelpRepository.addNote(
        created.id,
        params.helperA.id,
        'حضرت الجلسة',
        params.helperA.name,
    );
    if (!ownerNote || !helperNote) throw new Error('party notes should succeed');

    const done = await TaskHelpRepository.complete(created.id, params.helperA.id, 'helper_done');
    if (done.ok === false) throw new Error(`helper_done failed: ${done.code}`);

    const confirmed = await TaskHelpRepository.complete(created.id, params.owner.id, 'owner_confirm');
    if (confirmed.ok === false) throw new Error(`owner_confirm failed: ${confirmed.code}`);

    return {
        request: confirmed.request,
        publicTitle: sanitized.title,
        secondAcceptCode,
        strangerNoteOk: strangerNote != null,
        notesCount: confirmed.request.sharedNotes.length,
    };
}

/** سيناريو: طلب خاص — فقط الزميل المستهدف يقبل */
export async function runPrivateDirectLockScenario(params: {
    owner: ScenarioActor;
    target: ScenarioActor;
    other: ScenarioActor;
    taskId: string;
}): Promise<{ acceptedByTarget: boolean; otherCode?: string; finalStatus: string }> {
    const created = await TaskHelpRepository.create({
        sourceTaskId: params.taskId,
        requesterId: params.owner.id,
        shareScope: 'PRIVATE_DIRECT',
        title: 'طلب خاص لجلسة',
        isSanitised: false,
        targetColleagueId: params.target.id,
        targetColleagueName: params.target.name,
    });

    const other = await TaskHelpRepository.accept(created.id, params.other.id, params.other.name);
    const target = await TaskHelpRepository.accept(created.id, params.target.id, params.target.name);

    return {
        acceptedByTarget: target.ok,
        otherCode: other.ok === false ? other.code : undefined,
        finalStatus: target.ok
            ? target.request.collaborationStatus
            : created.collaborationStatus,
    };
}

export function buildSampleSensitiveTask(overrides: Partial<LegalTask> = {}): LegalTask {
    return {
        id: 'task-sensitive-1',
        rawText: 'جلسة للموكل أحمد علي رقم القضية 123456789012 في محكمة الكرخ',
        title: 'جلسة للموكل أحمد علي رقم القضية 123456789012',
        location: 'محكمة الكرخ',
        parsedDate: new Date('2026-09-01T00:00:00.000Z'),
        reminderAt: null,
        isFatalDeadline: false,
        linkedCaseId: 'case-secret-99',
        status: 'pending',
        completedAt: null,
        pinnedToFieldCurtain: false,
        fieldCurtainPinnedAt: null,
        subTasks: [{ id: 's1', title: 'تقديم لائحة جوابية', location: null, isCompleted: false }],
        documentRequirements: [{ id: 'd1', text: 'هوية الموكل الأصلية', isChecked: false }],
        expenses: [{ id: 'e1', amount: 25000, label: 'رسم' }],
        voiceRef: 'hami-voice-ref:secret',
        voiceTranscript: 'تفاصيل سرية عن الموكل',
        voiceDurationSec: 20,
        ...overrides,
    };
}
