import type { WORK_WEEK } from './constants';

export type WeekAddState = {
    dayKey: (typeof WORK_WEEK)[number]['key'];
    step: 'location' | 'actions';
    location: string;
    actionLines: string[];
    lineDraft: string;
} | null;

export type DetailPanel = { taskId: string; kind: 'branch' | 'brief' | 'expense' } | null;
