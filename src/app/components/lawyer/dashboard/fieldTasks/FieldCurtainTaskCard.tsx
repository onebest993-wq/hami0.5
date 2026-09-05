import { lazy, memo, Suspense } from 'react';
import { CheckCircle2 } from '@/app/components/ui/icons/CheckCircle2';
import { MapPin } from '@/app/components/ui/icons/MapPin';
import type { LinkedCaseLookupIndex } from '@/app/workspace/resolveLinkedCaseMeta';
import type { LegalTask } from '@/app/types/TaskEngine';
import { isTaskAgendaReadOnly, isTaskMarkedDone } from '@/app/services/tasks/taskAgendaStatusLite';
import { legalTaskUiSignature } from '@/app/services/tasks/legalTaskUiSignature';
import {
    CURTAIN_COMPLETE_BTN,
    CURTAIN_DONE_BADGE,
    CURTAIN_DONE_BADGE_READONLY,
    CURTAIN_GLASS_INNER,
    CURTAIN_LOCATION_TEXT,
    CURTAIN_TASK_TITLE,
} from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';
import { TaskListOrdinalBadge, type TaskListOrdinal } from '@/app/components/lawyer/dashboard/tasksManager/TaskListOrdinalBadge';

const TaskSubTasksCollapsible = lazy(() =>
    import('@/app/components/lawyer/dashboard/tasksManager/TaskSubTasksCollapsible').then((m) => ({
        default: m.TaskSubTasksCollapsible,
    })),
);
const TaskVoicePlayback = lazy(() =>
    import('@/app/components/lawyer/dashboard/tasksManager/TaskVoicePlayback').then((m) => ({
        default: m.TaskVoicePlayback,
    })),
);
const FieldCurtainWorkspacePin = lazy(() =>
    import('@/app/components/lawyer/dashboard/fieldTasks/FieldCurtainWorkspacePin').then((m) => ({
        default: m.FieldCurtainWorkspacePin,
    })),
);

type FieldCurtainTaskCardProps = {
    task: LegalTask;
    listOrdinal?: TaskListOrdinal;
    now: Date;
    pinLookup: LinkedCaseLookupIndex;
    onCompleteRequest: (task: LegalTask) => void;
    onReopenTask: (task: LegalTask) => void;
    onToggleSubComplete: (parentId: string, subId: string) => void;
};

export const FieldCurtainTaskCard = memo(function FieldCurtainTaskCard({
    task,
    listOrdinal,
    now,
    pinLookup,
    onCompleteRequest,
    onReopenTask,
    onToggleSubComplete,
}: FieldCurtainTaskCardProps) {
    const markedDone = isTaskMarkedDone(task);
    const readOnly = isTaskAgendaReadOnly(task, now);
    const fatal = task.isFatalDeadline;
    const hasSubs = (task.subTasks ?? []).length > 0;
    const showOrdinal = (listOrdinal?.total ?? 0) > 1;

    return (
        <li
            data-testid={`field-tasks-curtain-card-${task.id}`}
            className={`hami-field-tasks-list-item relative ${CURTAIN_GLASS_INNER} px-2.5 py-2 text-right ${
                fatal ? 'border-rose-400/35' : markedDone ? 'border-[#34D399]/25' : ''
            }`}
        >
            {showOrdinal ? (
                <TaskListOrdinalBadge
                    ordinal={listOrdinal!}
                    compact
                    testId={`field-tasks-ordinal-${task.id}`}
                />
            ) : null}

            <div className="flex flex-row items-start gap-2">
                <div className="flex-1 min-w-0">
                    {fatal ? (
                        <div className="flex flex-wrap items-center gap-1 justify-end mb-0.5">
                            <span className="text-[10px] font-semibold text-rose-200/90 bg-rose-500/12 px-1.5 py-0.5 rounded-md">
                                حتمي
                            </span>
                        </div>
                    ) : null}
                    <p className={CURTAIN_TASK_TITLE}>{task.title}</p>
                    {task.location ? (
                        <p className={CURTAIN_LOCATION_TEXT}>
                            <MapPin className="size-3 shrink-0 opacity-70" aria-hidden />
                            {task.location}
                        </p>
                    ) : null}
                    {task.voiceRef ? (
                        <div className="mt-2">
                            <Suspense fallback={null}>
                                <TaskVoicePlayback voiceRef={task.voiceRef} compact />
                            </Suspense>
                        </div>
                    ) : null}
                </div>
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <Suspense fallback={null}>
                        <FieldCurtainWorkspacePin task={task} pinLookup={pinLookup} />
                    </Suspense>
                    {markedDone ? (
                        <div className="flex flex-col items-center gap-1">
                            <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold whitespace-nowrap ${
                                    readOnly ? CURTAIN_DONE_BADGE_READONLY : CURTAIN_DONE_BADGE
                                }`}
                            >
                                <CheckCircle2 className="size-3" aria-hidden />
                                {readOnly ? 'للمعاينة' : 'تم'}
                            </span>
                            {!readOnly ? (
                                <button
                                    type="button"
                                    onClick={() => onReopenTask(task)}
                                    className="min-h-[44px] px-2 text-[11px] font-semibold text-[#E6C673]/80 touch-manipulation"
                                    aria-label={`إعادة فتح ${task.title}`}
                                >
                                    تراجع
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <button
                            type="button"
                            data-testid={`field-tasks-complete-${task.id}`}
                            onClick={() => onCompleteRequest(task)}
                            className={CURTAIN_COMPLETE_BTN}
                            aria-label={`إنهاء ${task.title}`}
                        >
                            إنهاء
                        </button>
                    )}
                </div>
            </div>

            {hasSubs ? (
                <Suspense fallback={null}>
                    <TaskSubTasksCollapsible
                        subTasks={task.subTasks ?? []}
                        readOnly={readOnly}
                        onToggleSubComplete={(subId) => onToggleSubComplete(task.id, subId)}
                        compactActions
                        testIdPrefix={`field-tasks-curtain-card-${task.id}`}
                    />
                </Suspense>
            ) : null}
        </li>
    );
}, (prev, next) => {
    if (prev.listOrdinal?.index !== next.listOrdinal?.index || prev.listOrdinal?.total !== next.listOrdinal?.total) {
        return false;
    }
    if (prev.now.toDateString() !== next.now.toDateString()) return false;
    if (prev.pinLookup !== next.pinLookup) return false;
    if (legalTaskUiSignature(prev.task) !== legalTaskUiSignature(next.task)) return false;
    return true;
});
