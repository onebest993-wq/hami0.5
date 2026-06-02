import type { AlertPriority } from './types';

export const PRIORITY_ORDER: Record<AlertPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
};
