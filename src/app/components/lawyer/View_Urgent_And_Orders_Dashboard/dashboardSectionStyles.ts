import type { LucideIcon } from 'lucide-react';

export type DashboardSectionVariant = 'critical' | 'pending' | 'completed' | 'neutral' | 'trash';

export const DASHBOARD_SECTION_VARIANTS: Record<
    DashboardSectionVariant,
    { iconWrap: string; iconColor: string; chevron: string }
> = {
    critical: {
        iconWrap: 'border-rose-400/25 bg-rose-500/[0.08]',
        iconColor: 'text-rose-300',
        chevron: 'text-rose-300/70',
    },
    pending: {
        iconWrap: 'border-[#E6C673]/22 bg-[#E6C673]/[0.08]',
        iconColor: 'text-[#E6C673]',
        chevron: 'text-[#E6C673]/65',
    },
    completed: {
        iconWrap: 'border-emerald-400/22 bg-emerald-500/[0.08]',
        iconColor: 'text-emerald-300',
        chevron: 'text-emerald-300/70',
    },
    trash: {
        iconWrap: 'border-rose-400/20 bg-rose-500/[0.06]',
        iconColor: 'text-rose-200',
        chevron: 'text-rose-200/60',
    },
    neutral: {
        iconWrap: 'border-white/[0.10] bg-white/[0.04]',
        iconColor: 'text-white/55',
        chevron: 'text-white/40',
    },
};

export const DASHBOARD_SECTION_SHELL =
    'w-full flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#0A0F1C]/45 backdrop-blur-xl px-4 py-3.5 mb-4 transition-all hover:border-[#E6C673]/18 hover:bg-[#0A0F1C]/55 shadow-[0_10px_36px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.04)]';

export function sectionCountLabel(title: string, count: number): string {
    if (title.includes('حرجة')) return `${count} إجراء يتطلب تدخل فوري`;
    if (title.includes('انتظار') || title.includes('ضمن المدة')) return `${count} إجراء نشط`;
    if (title.includes('منجزة') || title.includes('قطعية')) return `${count} إجراء مكتمل`;
    return `${count} إجراء`;
}
