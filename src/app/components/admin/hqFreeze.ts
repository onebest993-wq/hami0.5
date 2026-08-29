export const HQ_FREEZE_DURATION_OPTIONS = [
    { hours: 24, label: '٢٤ ساعة' },
    { hours: 72, label: '٣ أيام' },
    { hours: 168, label: '٧ أيام' },
    { hours: 0, label: 'دائم' },
] as const;

export type HqFreezeHours = (typeof HQ_FREEZE_DURATION_OPTIONS)[number]['hours'];
