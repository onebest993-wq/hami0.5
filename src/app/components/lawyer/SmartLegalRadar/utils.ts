import { Clock, Gavel, Scale, DollarSign, AlertTriangle } from 'lucide-react';
import type { CalendarEventType } from '@/app/services/lawyer-cloud';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

export const WEEK_DAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export const MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const TYPE_STYLES: Record<CalendarEventType, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
    hearing: { label: 'جلسة', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Gavel },
    deadline: { label: 'موعد نهائي', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: AlertTriangle },
    consultation: { label: 'استشارة', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: DollarSign },
    execution: { label: 'تنفيذ', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Scale },
    custom: { label: 'موعد', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: Clock },
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
        if (seen.has(e.type)) continue;
        seen.add(e.type);
        switch (e.type) {
            case 'hearing': colors.push('bg-amber-500'); break;
            case 'deadline': colors.push('bg-rose-500'); break;
            case 'consultation': colors.push('bg-emerald-500'); break;
            case 'execution': colors.push('bg-purple-500'); break;
            default: colors.push('bg-indigo-500'); break;
        }
    }
    return colors.length > 3 ? colors.slice(0, 3) : colors;
}
