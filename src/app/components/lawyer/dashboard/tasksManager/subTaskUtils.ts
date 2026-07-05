import type { LegalSubTask } from '@/app/types/TaskEngine';

export type SubTaskKind = 'field' | 'branch';

export function resolveSubTaskKind(st: LegalSubTask, taskHasLocation: boolean): SubTaskKind {
    if (st.kind === 'field' || st.kind === 'branch') return st.kind;
    return taskHasLocation ? 'field' : 'branch';
}

export function partitionSubTasks(subTasks: LegalSubTask[], taskHasLocation: boolean) {
    const fieldSubTasks: LegalSubTask[] = [];
    const branchSubTasks: LegalSubTask[] = [];
    for (const st of subTasks) {
        const kind = resolveSubTaskKind(st, taskHasLocation);
        if (kind === 'field') fieldSubTasks.push(st);
        else branchSubTasks.push(st);
    }
    return { fieldSubTasks, branchSubTasks };
}
