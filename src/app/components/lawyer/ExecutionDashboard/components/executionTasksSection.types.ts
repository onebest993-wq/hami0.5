export type TaskStep = {
    id: string;
    text: string;
    order: number;
    dueDate?: string;
    status: 'pending' | 'done' | 'failed';
};

export type ExecutionTask = {
    id: string;
    title: string;
    body: string;
    dueDate: string;
    createdAt: string;
    trashedAt?: string;
    pinned?: boolean;
    steps?: TaskStep[];
};

export type DoneTaskNote = {
    id: string;
    title: string;
    body: string;
    createdAt: string;
};

export interface ExecutionTasksSectionProps {
    tasks: ExecutionTask[];
    onSaveTask: (task: { title: string; body: string; dueDate: string; steps: TaskStep[] }) => void;
    onUpdateTask: (id: string, updates: Partial<ExecutionTask>) => void;
    onDeleteTask: (id: string) => void;
    onCompleteTask: (id: string) => void;
    onAddTimelineEvent: (event: { title: string; body?: string }) => void;
    onToggleTaskPin: (id: string) => void;
    doneTasks: DoneTaskNote[];
    showDoneTasksPanel: boolean;
    setShowDoneTasksPanel: (show: boolean) => void;
}

let stepCounter = 0;
export const genStepId = () => `step_${Date.now()}_${++stepCounter}`;

export function normalizeSteps(steps: TaskStep[]): TaskStep[] {
    return steps
        .filter((s) => s.text.trim())
        .map((s, i) => ({
            ...s,
            order: i + 1,
            dueDate: s.dueDate?.trim() ? s.dueDate.trim() : undefined,
        }));
}
