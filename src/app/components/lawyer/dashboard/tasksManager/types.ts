import type { WORK_WEEK } from './constants';

export type WeekAddPlanStep = { id: string; title: string };

export type WeekAddState = {
    dayKey: (typeof WORK_WEEK)[number]['key'];
    details: string;
    location: string;
    /** يظهر حقل التفاصيل فقط بعد الضغط على «+ تفاصيل» */
    detailsOpen: boolean;
    /** يظهر حقل الموقع فقط بعد الضغط على «+ موقع» */
    locationOpen: boolean;
    planOpen: boolean;
    planSteps: WeekAddPlanStep[];
} | null;

export type DetailPanel = { taskId: string; kind: 'brief' } | null;
