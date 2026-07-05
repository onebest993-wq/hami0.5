import type { WORK_WEEK } from './constants';

export type WeekAddState = {
    dayKey: (typeof WORK_WEEK)[number]['key'];
    details: string;
    location: string;
} | null;

export type DetailPanel = { taskId: string; kind: 'brief' } | null;
