import { Clock, Gavel, Scale, DollarSign, AlertTriangle } from 'lucide-react';
import type { CalendarEventType } from '@/app/services/lawyer-cloud';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { calendarModuleVisual } from '@/app/services/calendarModuleVisuals';

export const WEEK_DAYS = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export const MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const TYPE_STYLES: Record<CalendarEventType, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
    hearing: { label: 'جلسة', color: 'text-[#D4A87A]', bg: 'bg-[#C4956A]/15', border: 'border-[#C4956A]/35', icon: Gavel },
    deadline: { label: 'موعد نهائي', color: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/25', icon: AlertTriangle },
    consultation: { label: 'استشارة', color: 'text-[#F5EDE0]/85', bg: 'bg-[#F5EDE0]/[0.08]', border: 'border-[#F5EDE0]/15', icon: DollarSign },
    execution: { label: 'تنفيذ', color: 'text-[#E8DCC8]/80', bg: 'bg-[#3d2e22]/60', border: 'border-[#A67B5B]/30', icon: Scale },
    custom: { label: 'موعد', color: 'text-[#E8DCC8]/70', bg: 'bg-[#F5EDE0]/[0.05]', border: 'border-[#F5EDE0]/12', icon: Clock },
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
        const key = e.bridge?.sourceModule ?? e.type;
        if (seen.has(key)) continue;
        seen.add(key);
        if (e.bridge?.sourceModule) {
            colors.push(calendarModuleVisual(e.bridge.sourceModule).dot);
            continue;
        }
        switch (e.type) {
            case 'hearing': colors.push('bg-[#C4956A]'); break;
            case 'deadline': colors.push('bg-rose-400'); break;
            case 'consultation': colors.push('bg-[#F5EDE0]/70'); break;
            case 'execution': colors.push('bg-[#A67B5B]'); break;
            default: colors.push('bg-[#E8DCC8]/50'); break;
        }
    }
    return colors.length > 3 ? colors.slice(0, 3) : colors;
}
