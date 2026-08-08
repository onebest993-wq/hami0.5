import type { CalendarEvent } from '@/app/services/cloud/lawyerCalendarCloud';
import { moduleLabelAr } from '@/app/services/calendar/bridge/core';
import type { CalendarSourceModule } from '@/app/services/calendarBridge.types';
import { addBaghdadDays, toBaghdadYmd } from '@/app/utils/baghdadTime';

const BAGHDAD_TZ = 'Asia/Baghdad';

function formatBaghdadClock(ts: number): string {
    return new Intl.DateTimeFormat('ar-IQ', {
        timeZone: BAGHDAD_TZ,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(ts);
}

function formatBaghdadShortDate(ts: number): string {
    return new Intl.DateTimeFormat('ar-IQ', {
        timeZone: BAGHDAD_TZ,
        day: 'numeric',
        month: 'short',
    }).format(ts);
}

/** اليوم / غداً / تاريخ قصير / انتهى */
export function formatRadarDateLabel(ts: number, nowMs = Date.now()): string {
    if (ts < nowMs) return 'انتهى';

    const eventYmd = toBaghdadYmd(ts);
    const todayYmd = toBaghdadYmd(nowMs);
    if (eventYmd && todayYmd && eventYmd === todayYmd) return 'اليوم';

    const tomorrowYmd = todayYmd ? addBaghdadDays(todayYmd, 1) : null;
    if (eventYmd && tomorrowYmd && eventYmd === tomorrowYmd) return 'غداً';

    return formatBaghdadShortDate(ts);
}

export function formatRadarTimeLabel(ts: number): string {
    return formatBaghdadClock(ts);
}

/** للوصولية — يجمع التاريخ والوقت */
export function formatRadarDeadlineLabel(ts: number, nowMs = Date.now()): string {
    const datePart = formatRadarDateLabel(ts, nowMs);
    const clock = formatRadarTimeLabel(ts);
    if (datePart === 'انتهى') return `${datePart} (${clock})`;
    return `${datePart} ${clock}`;
}

/** شارة قسم المصدر — تقويم، دعوى، مهمة… */
export function resolveRadarModuleLabel(ev: CalendarEvent): string {
    const module = ev.sourceModule as CalendarSourceModule | undefined;
    if (module) {
        switch (module) {
            case 'lawsuit':
                return 'دعوى';
            case 'execution':
                return 'تنفيذ';
            case 'urgent':
                return 'مستعجل';
            case 'transaction':
                return 'معاملة';
            case 'criminal':
                return 'جزائي';
            case 'threading':
                return 'معاملة';
            case 'task':
                return 'مهمة';
            case 'note':
                return 'ملاحظة';
            case 'manual':
                return 'تقويم';
            default:
                break;
        }
    }

    switch (ev.type) {
        case 'hearing':
            return 'جلسة';
        case 'deadline':
            return 'موعد نهائي';
        case 'consultation':
            return 'استشارة';
        case 'execution':
            return 'تنفيذ';
        default:
            return 'موعد';
    }
}

export function isDossierBridgedCalendarModule(module: string | undefined): boolean {
    return (
        module === 'lawsuit'
        || module === 'execution'
        || module === 'criminal'
        || module === 'urgent'
        || module === 'transaction'
        || module === 'threading'
    );
}

export function resolveRadarPlaceHint(ev: CalendarEvent): string | undefined {
    const place = String(ev.court ?? ev.location ?? '').trim();
    return place || undefined;
}

/** للعرض في الرادار — رقم الإضبارة يُقدَّم على المحكمة/المكان */
export function resolveRadarHeadlineSuffix(ev: CalendarEvent): string | undefined {
    const caseNo = String(ev.caseNo ?? '').trim();
    if (caseNo && isDossierBridgedCalendarModule(ev.sourceModule)) return caseNo;
    return resolveRadarPlaceHint(ev);
}

/** نص مساعد للوصولية — مصدر + مكان */
export function resolveRadarSourceHint(ev: CalendarEvent): string | undefined {
    const parts: string[] = [resolveRadarModuleLabel(ev)];
    const caseNo = String(ev.caseNo ?? '').trim();
    if (caseNo && isDossierBridgedCalendarModule(ev.sourceModule)) {
        parts.push(caseNo);
    }
    const place = resolveRadarPlaceHint(ev);
    if (place) parts.push(place);

    const legacy =
        String(ev.sourceLabel ?? '').trim() ||
        (ev.sourceModule && ev.sourceModule !== 'manual'
            ? moduleLabelAr(ev.sourceModule as CalendarSourceModule)
            : '');
    if (legacy && !parts.includes(legacy)) {
        const moduleLabel = resolveRadarModuleLabel(ev);
        if (legacy !== moduleLabel && !legacy.startsWith(moduleLabel)) {
            parts.push(legacy);
        }
    }

    return parts.filter(Boolean).join(' · ');
}
