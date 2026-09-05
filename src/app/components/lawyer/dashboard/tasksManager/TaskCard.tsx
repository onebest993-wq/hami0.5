import React, { Suspense, lazy, useCallback, useMemo } from 'react';
import { buildTaskWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import {
    TASKS_INNER_GLASS_SOFT,
    TASK_CARD_BASE,
    TASK_CARD_DEFAULT,
    TASK_CARD_DONE,
    TASK_CARD_FATAL,
} from './tasksBoucleTheme';
import { isReminderDue, isTaskArchivedToHistory } from './utils';
import {
    isTaskAgendaReadOnly,
    isTaskDayOverdueIncomplete,
    isTaskMarkedDone,
} from '@/app/services/tasks/taskAgendaStatusLite';
import { TaskCardFieldBrief } from './TaskCardFieldBrief';
import { TaskCardMainBrief } from './TaskCardMainBrief';
import { TaskCardBranchPanel, TaskCardDocPanel } from './TaskCardPanels';
import { partitionSubTasks } from './subTaskUtils';
import type { TaskCardProps } from './taskCardUtils';
import { areTaskCardPropsEqual } from './taskCardUtils';
import { TaskListOrdinalBadge } from './TaskListOrdinalBadge';
import { TaskCardToolRow } from './TaskCardToolRow';
import { TaskCardStatusRow } from './TaskCardStatusRow';
import { useTaskCardChrome } from './useTaskCardChrome';

const TaskVoicePlayback = lazy(() =>
    import('./TaskVoicePlayback').then((m) => ({ default: m.TaskVoicePlayback })),
);

function TaskCardComponent(props: TaskCardProps) {
    const {
        task,
        listOrdinal,
        lawsuitFiles = [],
        executionFiles = [],
        now,
        onCompleteRequest,
        onReopenTask,
        onToggleFatal,
        onToggleFieldCurtainPin,
        detailPanel,
        setDetailPanel,
        addSubTask,
        toggleSubTaskComplete,
        setSubTaskPlanStatus,
        renameSubTask,
        removeSubTask,
        addDocumentRequirement,
        toggleDocumentRequirement,
        onEditRequest,
        onDeleteRequest,
        onReminderBadgeClick,
        onPostponeRequest,
        onRequestHelp,
    } = props;
    const {
        branchOpen,
        setBranchOpen,
        optionsOpen,
        optionsAnchorRef,
        menuPos,
        closeOptionsMenu,
        toggleOptionsMenu,
    } = useTaskCardChrome(task.id);

    const panelKind = detailPanel?.taskId === task.id ? detailPanel.kind : null;

    const fieldLocation = String(task.location ?? '').trim();
    const taskHasLocation = fieldLocation.length > 0;
    const { fieldSubTasks, branchSubTasks } = useMemo(
        () => partitionSubTasks(task.subTasks ?? [], taskHasLocation),
        [task.subTasks, taskHasLocation],
    );

    const closeBranchTool = useCallback(() => {
        setBranchOpen(false);
    }, []);

    const onToggleSub = (subId: string) => toggleSubTaskComplete(task.id, subId);

    const toggleBranchTool = () => {
        if (branchOpen) {
            closeBranchTool();
            return;
        }
        setDetailPanel(null);
        closeOptionsMenu();
        setBranchOpen(true);
    };

    const toggleBranchSection = () => {
        setBranchOpen((open) => !open);
    };

    const toggleBrief = () => {
        if (panelKind === 'brief') {
            setDetailPanel(null);
            return;
        }
        closeBranchTool();
        closeOptionsMenu();
        setDetailPanel({ taskId: task.id, kind: 'brief' });
    };

    const showBranchSection = branchSubTasks.length > 0 || branchOpen;
    const activeBranchSubs = branchSubTasks.filter((s) => !s.isCompleted).length;
    const docOpen = task.documentRequirements.filter((d) => !d.isChecked).length;
    const requirementsOpen = panelKind === 'brief';
    const hasDocItems = task.documentRequirements.length > 0;
    const showRequirementsBlock = hasDocItems || requirementsOpen;
    const reminderFire = task.reminderAt !== null && isReminderDue(task, now);
    const markedDone = isTaskMarkedDone(task);
    const readOnly = isTaskAgendaReadOnly(task, now);
    const archived = isTaskArchivedToHistory(task, now);
    const overdueIncomplete = isTaskDayOverdueIncomplete(task, now);
    const clusterPin = useMemo(
        () => buildTaskWorkspacePin(task, lawsuitFiles, executionFiles),
        [task, lawsuitFiles, executionFiles],
    );

    const detailsText = String(task.title ?? '').trim();
    const cardTone =
        readOnly && markedDone
            ? `${TASK_CARD_DONE} opacity-95`
            : markedDone
              ? TASK_CARD_DONE
              : overdueIncomplete
                ? TASK_CARD_FATAL
                : TASK_CARD_DEFAULT;

    return (
        <li
            data-testid={`tasks-task-card-${task.id}`}
            tabIndex={-1}
            className={`${TASK_CARD_BASE} [content-visibility:auto] [contain-intrinsic-size:auto_7rem] ${cardTone}`}
        >
            {(listOrdinal?.total ?? 0) > 1 ? (
                <TaskListOrdinalBadge ordinal={listOrdinal!} />
            ) : null}
            <div className="p-2.5 text-right space-y-1.5">
                <TaskCardStatusRow
                    task={task}
                    showFatalBadge={task.isFatalDeadline}
                    overdueIncomplete={overdueIncomplete}
                    branchCount={branchSubTasks.length}
                    activeBranchSubs={activeBranchSubs}
                    markedDone={markedDone}
                    readOnly={readOnly}
                    archived={archived}
                    reminderFire={reminderFire}
                    clusterPin={clusterPin}
                    optionsOpen={optionsOpen}
                    optionsAnchorRef={optionsAnchorRef}
                    menuPos={menuPos}
                    onCompleteRequest={onCompleteRequest}
                    onReopenTask={onReopenTask}
                    onReminderBadgeClick={onReminderBadgeClick}
                    toggleOptionsMenu={toggleOptionsMenu}
                    closeOptionsMenu={closeOptionsMenu}
                    onEditRequest={onEditRequest}
                    onDeleteRequest={onDeleteRequest}
                    onPostponeRequest={onPostponeRequest}
                    onRequestHelp={onRequestHelp}
                />

                <TaskCardMainBrief
                    details={detailsText}
                    location={task.location}
                    detailsClassName={readOnly && !markedDone ? 'line-through decoration-white/35' : undefined}
                />

                {task.voiceRef ? (
                    <div className="mt-0.5">
                        <Suspense fallback={null}>
                            <TaskVoicePlayback voiceRef={task.voiceRef} compact />
                        </Suspense>
                    </div>
                ) : null}

                {fieldSubTasks.length > 0 ? (
                    <TaskCardFieldBrief
                        fieldActions={fieldSubTasks}
                        readOnly={readOnly}
                        onToggleSubComplete={onToggleSub}
                    />
                ) : null}

                <TaskCardToolRow
                    taskId={task.id}
                    readOnly={readOnly}
                    isFatalDeadline={task.isFatalDeadline}
                    pinnedToFieldCurtain={Boolean(task.pinnedToFieldCurtain)}
                    branchOpen={branchOpen}
                    requirementsOpen={requirementsOpen}
                    hasDocItems={hasDocItems}
                    docOpen={docOpen}
                    onToggleFatal={() => onToggleFatal(task.id)}
                    onToggleFieldCurtainPin={() => onToggleFieldCurtainPin(task.id)}
                    onToggleBranch={toggleBranchTool}
                    onToggleBrief={toggleBrief}
                />

                {showRequirementsBlock ? (
                    <div
                        data-testid={`tasks-task-requirements-panel-${task.id}`}
                        className={`rounded-lg border border-violet-500/14 ${TASKS_INNER_GLASS_SOFT} px-2 py-1.5`}
                    >
                        <TaskCardDocPanel
                            items={task.documentRequirements}
                            readOnly={readOnly}
                            showAdd={requirementsOpen}
                            onToggle={(itemId) => toggleDocumentRequirement(task.id, itemId)}
                            onAdd={(text) => addDocumentRequirement(task.id, text)}
                        />
                    </div>
                ) : null}
            </div>

            {showBranchSection ? (
                <TaskCardBranchPanel
                    subTasks={branchSubTasks}
                    branchOpen={branchOpen}
                    readOnly={readOnly}
                    onToggleSection={toggleBranchSection}
                    onAddSubTask={(title, location) => addSubTask(task.id, title, location)}
                    onSetPlanStatus={(subId, status) => setSubTaskPlanStatus(task.id, subId, status)}
                    onRenameSubTask={(subId, title) => renameSubTask(task.id, subId, title)}
                    onRemoveSubTask={(subId) => removeSubTask(task.id, subId)}
                />
            ) : null}
        </li>
    );
}

export const TaskCard = React.memo(TaskCardComponent, areTaskCardPropsEqual);
