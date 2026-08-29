import type { VisitationScheduleConfig, VisitationSession } from '@/app/types/visitationSchedule';
import { computeVisitationSessionReturnYmd } from './visitationScheduleDateUtils';
import { isVisitationSessionDocumented } from './visitationScheduleSessions';

export type VisitationCalendarCellTone =
    | 'empty'
    | 'scheduled'
    | 'overdue'
    | 'documented_success'
    | 'documented_absence'
    | 'return_scheduled'
    | 'return_overdue'
    | 'return_documented_success'
    | 'return_documented_absence';

export type VisitationCalendarDayRole = 'pickup' | 'return';

export type VisitationCalendarDayMarker = {
    session: VisitationSession;
    role: VisitationCalendarDayRole;
};

export function buildVisitationCalendarDayMarkers(
    config: VisitationScheduleConfig,
    sessions: VisitationSession[],
): Map<string, VisitationCalendarDayMarker[]> {
    const map = new Map<string, VisitationCalendarDayMarker[]>();
    const push = (ymd: string, marker: VisitationCalendarDayMarker) => {
        const list = map.get(ymd) ?? [];
        list.push(marker);
        map.set(ymd, list);
    };
    for (const session of sessions) {
        push(session.date, { session, role: 'pickup' });
        const returnYmd = computeVisitationSessionReturnYmd(config, session.date);
        if (returnYmd && returnYmd !== session.date) {
            push(returnYmd, { session, role: 'return' });
        }
    }
    return map;
}

function resolvePickupCalendarTone(session: VisitationSession, todayYmd: string): VisitationCalendarCellTone {
    if (isVisitationSessionDocumented(session)) {
        return session.status === 'completed' ? 'documented_success' : 'documented_absence';
    }
    const today = String(todayYmd || '').trim();
    if (today && session.date < today) return 'overdue';
    return 'scheduled';
}

function resolveReturnCalendarTone(
    session: VisitationSession,
    returnYmd: string,
    todayYmd: string,
): VisitationCalendarCellTone {
    if (isVisitationSessionDocumented(session)) {
        return session.status === 'completed'
            ? 'return_documented_success'
            : 'return_documented_absence';
    }
    const today = String(todayYmd || '').trim();
    if (today && returnYmd < today) return 'return_overdue';
    return 'return_scheduled';
}

export function resolveVisitationCalendarCellToneForDate(
    markers: VisitationCalendarDayMarker[] | undefined,
    dateYmd: string,
    todayYmd: string,
): VisitationCalendarCellTone {
    if (!markers?.length) return 'empty';
    const pickup = markers.find((m) => m.role === 'pickup');
    if (pickup) return resolvePickupCalendarTone(pickup.session, todayYmd);
    const ret = markers.find((m) => m.role === 'return');
    if (ret) return resolveReturnCalendarTone(ret.session, dateYmd, todayYmd);
    return 'empty';
}

export function resolveVisitationCalendarCellTone(
    session: VisitationSession | undefined,
    todayYmd: string,
): VisitationCalendarCellTone {
    if (!session) return 'empty';
    return resolvePickupCalendarTone(session, todayYmd);
}
