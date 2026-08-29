export type DashboardSectionVariant = 'critical' | 'pending';

export const DASHBOARD_SECTION_VARIANTS: Record<
    DashboardSectionVariant,
    { iconColor: string; chevron: string }
> = {
    critical: {
        iconColor: 'text-rose-300',
        chevron: 'text-white/35',
    },
    pending: {
        iconColor: 'text-white/45',
        chevron: 'text-white/35',
    },
};

export const DASHBOARD_SECTION_SHELL =
    'w-full min-h-[44px] flex items-center justify-between rounded-lg px-1 py-1 mb-1.5 touch-manipulation';
