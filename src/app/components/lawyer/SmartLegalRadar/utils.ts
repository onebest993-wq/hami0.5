import { Clock, Gavel, Scale, DollarSign, AlertTriangle } from '@/app/components/ui/lucideIcons';
import type { CalendarEventType } from '@/app/services/lawyer-cloud';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { calendarModuleVisual } from '@/app/services/calendarModuleVisuals';

export const WEEK_DAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export const MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const TYPE_STYLES: Record<CalendarEventType, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
    hearing: { label: 'جلسة', color: 'text-amber-300', bg: 'bg-amber-950/45', border: 'border-amber-500/35', icon: Gavel },
    deadline: { label: 'موعد نهائي', color: 'text-rose-300', bg: 'bg-rose-950/40', border: 'border-rose-500/30', icon: AlertTriangle },
    consultation: { label: 'استشارة', color: 'text-slate-300', bg: 'bg-slate-800/55', border: 'border-slate-500/35', icon: DollarSign },
    execution: { label: 'تنفيذ', color: 'text-slate-200', bg: 'bg-slate-900/60', border: 'border-slate-500/30', icon: Scale },
    custom: { label: 'موعد', color: 'text-[#94A3B8]', bg: 'bg-[#2A2A2A]', border: 'border-white/70', icon: Clock },
};

export type EventFormData = {
    title: string;
    date: string;
    time: string;
    type: CalendarEventType;
    location: string;
    notes: string;
    clientName: string;
    clientPhone: string;
    /** null = بدون تذكير · يتطلب time */
    reminderMinutesBefore: number | null;
};

export const EMPTY_FORM: EventFormData = {
    title: '',
    date: '',
    time: '',
    type: 'custom',
    location: '',
    notes: '',
    clientName: '',
    clientPhone: '',
    reminderMinutesBefore: null,
};

export function getDayName(dateStr: string): string {
    try {
        const d = new Date(dateStr + 'T12:00:00');
        if (isNaN(d.getTime())) return '';
        return WEEK_DAYS[d.getDay()];
    } catch {
        return '';
    }
}

export function isToday(dateStr: string): boolean {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return dateStr === `${y}-${m}-${d}`;
}

/** يوم سابق — للعرض الشفاف دون الحذف */
export function isPastDay(dateStr: string): boolean {
    if (!dateStr || dateStr.length < 10) return false;
    return dateStr < todayYmd();
}

export function todayYmd(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** تسمية عربية لخلية يوم التقويم — قارئ الشاشة فقط */
export function buildCalendarDayAriaLabel(
    day: number,
    viewMonth: number,
    viewYear: number,
    eventCount: number,
    isTodayCell: boolean,
): string {
    const parts = [`${day} ${MONTHS[viewMonth]} ${viewYear}`];
    if (isTodayCell) parts.push('اليوم');
    if (eventCount > 0) {
        parts.push(`${eventCount} ${eventCount === 1 ? 'موعد' : 'مواعيد'}`);
    }
    return parts.join('، ');
}

export function buildCalendarGridAriaLabel(viewMonth: number, viewYear: number): string {
    return `تقويم ${MONTHS[viewMonth]} ${viewYear}`;
}

export function timeValue(t?: string): number {
    if (!t) return 9999;
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return 9999;
    return h * 60 + m;
}

export function dotColorsForDate(events: UnifiedEvent[]): string[] {
    const colors: string[] = [];
    const seen = new Set<string>();
    for (const e of events) {
        const key = e.bridge?.sourceModule ?? e.type;
        if (seen.has(key)) continue;
        seen.add(key);
        if (e.bridge?.sourceModule) {
            colors.push(calendarModuleVisual(e.bridge.sourceModule).dot);
            continue;
        }
        switch (e.type) {
            case 'hearing': colors.push('bg-amber-400'); break;
            case 'deadline': colors.push('bg-rose-400'); break;
            case 'consultation': colors.push('bg-slate-400'); break;
            case 'execution': colors.push('bg-slate-500'); break;
            default: colors.push('bg-[#E2E8F0]'); break;
        }
    }
    return colors.length > 3 ? colors.slice(0, 3) : colors;
}
