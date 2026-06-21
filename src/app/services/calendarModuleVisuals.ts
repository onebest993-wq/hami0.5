import type { CalendarSourceModule } from './calendarBridge.types';

export type CalendarModuleVisual = {
    label: string;
    /** شريط جانبي للبطاقة */
    rail: string;
    /** شارة المصدر */
    badge: string;
    /** نقطة في شبكة التقويم */
    dot: string;
};

export const CALENDAR_MODULE_VISUAL: Record<CalendarSourceModule, CalendarModuleVisual> = {
    lawsuit: {
        label: 'دعوى',
        rail: 'from-[#E6C673] via-[#E6C673]/40 to-[#1e3a5f]',
        badge: 'bg-[#C9A227]/12 text-[#E6C673] border-[#C9A227]/35',
        dot: 'bg-[#C9A227]',
    },
    execution: {
        label: 'تنفيذ',
        rail: 'from-slate-300 via-slate-500/50 to-[#1e3a5f]',
        badge: 'bg-slate-500/15 text-slate-200 border-slate-400/35',
        dot: 'bg-slate-400',
    },
    criminal: {
        label: 'جزائي',
        rail: 'from-rose-400 via-rose-500/45 to-[#1e3a5f]',
        badge: 'bg-rose-500/12 text-rose-300 border-rose-400/35',
        dot: 'bg-rose-400',
    },
    urgent: {
        label: 'مستعجل',
        rail: 'from-orange-400 via-orange-500/45 to-[#1e3a5f]',
        badge: 'bg-orange-500/12 text-orange-200 border-orange-400/35',
        dot: 'bg-orange-400',
    },
    transaction: {
        label: 'معاملة',
        rail: 'from-violet-400 via-violet-500/45 to-[#1e3a5f]',
        badge: 'bg-violet-500/12 text-violet-200 border-violet-400/35',
        dot: 'bg-violet-400',
    },
    threading: {
        label: 'إداري',
        rail: 'from-[#C4782F] via-[#C4782F]/45 to-[#0A171D]',
        badge: 'bg-[#C4782F]/12 text-[#D49248] border-[#C4782F]/40',
        dot: 'bg-[#C4782F]',
    },
    task: {
        label: 'ميدان',
        rail: 'from-emerald-400 via-emerald-500/45 to-[#1e3a5f]',
        badge: 'bg-emerald-500/12 text-emerald-200 border-emerald-400/35',
        dot: 'bg-emerald-400',
    },
    note: {
        label: 'ملاحظة',
        rail: 'from-sky-400 via-sky-500/45 to-[#1e3a5f]',
        badge: 'bg-sky-500/12 text-sky-200 border-sky-400/35',
        dot: 'bg-sky-400',
    },
    manual: {
        label: 'يدوي',
        rail: 'from-[#64748b] via-[#64748b]/60 to-[#1e3a5f]',
        badge: 'bg-[#64748b]/15 text-slate-300 border-[#64748b]/30',
        dot: 'bg-[#64748b]',
    },
};

export function calendarModuleVisual(module?: CalendarSourceModule | null): CalendarModuleVisual {
    if (module && CALENDAR_MODULE_VISUAL[module]) return CALENDAR_MODULE_VISUAL[module];
    return CALENDAR_MODULE_VISUAL.manual;
}
