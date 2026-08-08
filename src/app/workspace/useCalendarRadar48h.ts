import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDB } from '@/app/services/cloud/lawyerCalendarCloud';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import type { CalendarEvent } from '@/app/services/calendar/calendarTypes';
import type { CalendarRadarEvent } from './types';
import { buildWorkspaceRoute } from './workspaceRoutes';
import type { WorkspacePinType } from './types';
import { calendarEventToTimestamp } from '@/app/utils/calendarDateTime';
import { addBaghdadDays, baghdadDayRange, todayBaghdadYmd } from '@/app/utils/baghdadTime';
import { peekHomeHubRadarCache } from '@/app/services/alerts/homeHubRadarWarmCache';
import { isUserAuthoredBridgedCalendarEvent } from '@/app/services/calendarAuthenticity';
import {
    formatRadarDeadlineLabel,
    formatRadarDateLabel,
    formatRadarTimeLabel,
    resolveRadarModuleLabel,
    resolveRadarPlaceHint,
    resolveRadarSourceHint,
} from './calendarRadarDisplay';

const BRIDGED_ROUTE_MODULES: WorkspacePinType[] = [
    'lawsuit',
    'execution',
    'criminal',
    'urgent',
    'transaction',
    'threading',
];

const RADAR_MS = 48 * 60 * 60 * 1000;

function parseEventMs(ev: CalendarEvent): number | null {
    return calendarEventToTimestamp(ev.date, ev.time, 'end');
}

function resolveRadarRoute(ev: CalendarEvent): string {
    const entityId = String(ev.sourceEntityId ?? ev.caseId ?? '').trim();
    const mod = ev.sourceModule;
    if (entityId && mod && BRIDGED_ROUTE_MODULES.includes(mod as WorkspacePinType)) {
        return buildWorkspaceRoute(mod as WorkspacePinType, entityId);
    }
    if (entityId) {
        return buildWorkspaceRoute('lawsuit', entityId);
    }
    return 'workspace:schedule:calendar';
}

function mapRadarEvent(ev: CalendarEvent, nowMs: number): CalendarRadarEvent | null {
    const ts = parseEventMs(ev);
    if (ts === null) return null;
    const route = resolveRadarRoute(ev);
    const sourceEntityId = String(ev.sourceEntityId ?? ev.caseId ?? '').trim();
    const sourceHint = resolveRadarSourceHint(ev);
    const sourcePlace = resolveRadarPlaceHint(ev);
    return {
        id: ev.id,
        title: ev.title,
        whenLabel: formatRadarDeadlineLabel(ts, nowMs),
        dateLabel: formatRadarDateLabel(ts, nowMs),
        timeLabel: formatRadarTimeLabel(ts),
        sourceModuleLabel: resolveRadarModuleLabel(ev),
        ...(sourcePlace ? { sourcePlace } : {}),
        ...(sourceHint ? { sourceHint } : {}),
        clientName: ev.clientName,
        caseNo: ev.caseNo,
        routePath: route,
        ...(sourceEntityId ? { sourceEntityId } : {}),
    };
}

/** مواعيد اليوم وغداً ضمن نافذة 48 ساعة — من CalendarDB فقط */
export function useCalendarRadar48h(lawyerId: string | null): {
    events: CalendarRadarEvent[];
    loading: boolean;
} {
    const [raw, setRaw] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const hasLoadedOnceRef = useRef(false);
    // رمز جلب: يُرفع عند كل استدعاء، ويُتجاهَل أي رد سابق إذا تغيّر
    const fetchTokenRef = useRef(0);

    const fetchEvents = useCallback(() => {
        if (!lawyerId) {
            fetchTokenRef.current += 1;
            setRaw([]);
            setLoading(false);
            hasLoadedOnceRef.current = false;
            return;
        }
        const cached = peekHomeHubRadarCache(lawyerId);
        if (cached && !hasLoadedOnceRef.current) {
            setRaw(cached);
            setLoading(false);
        } else if (!hasLoadedOnceRef.current) {
            setLoading(true);
        }
        const token = ++fetchTokenRef.current;
        void CalendarDB.getEvents(lawyerId)
            .then((list) => {
                if (token !== fetchTokenRef.current) return; // قد تغيّر المحامي
                setRaw(Array.isArray(list) ? list : []);
            })
            .catch(() => {
                if (token !== fetchTokenRef.current) return;
                setRaw([]);
            })
            .finally(() => {
                if (token !== fetchTokenRef.current) return;
                setLoading(false);
                hasLoadedOnceRef.current = true;
            });
    }, [lawyerId]);

    useEffect(() => {
        hasLoadedOnceRef.current = false;
    }, [lawyerId]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        if (typeof window === 'undefined' || !lawyerId) return undefined;
        const onUpdate = () => fetchEvents();
        window.addEventListener(CALENDAR_UPDATED_EVENT, onUpdate);
        return () => window.removeEventListener(CALENDAR_UPDATED_EVENT, onUpdate);
    }, [lawyerId, fetchEvents]);

    const events = useMemo(() => {
        const now = Date.now();
        const end = now + RADAR_MS;
        // حساب "بداية اليوم" و"نهاية الغد" بتوقيت Asia/Baghdad
        const todayYmd = todayBaghdadYmd();
        const todayRange = baghdadDayRange(todayYmd);
        const tomorrowYmd = todayYmd ? addBaghdadDays(todayYmd, 1) : null;
        const tomorrowRange = tomorrowYmd ? baghdadDayRange(tomorrowYmd) : null;
        const tomorrowEndMs = tomorrowRange?.endMs ?? (todayRange ? todayRange.endMs + 24 * 60 * 60 * 1000 : end);

        return raw
            .filter((ev) => {
                if (!isUserAuthoredBridgedCalendarEvent(ev)) return false;
                if (ev.isCompleted) return false;
                const ts = parseEventMs(ev);
                if (ts === null) return false;
                if (ts < now || ts > end) return false;
                // داخل نافذة اليوم + الغد بتوقيت بغداد
                return ts <= tomorrowEndMs;
            })
            .map((ev) => {
                const ts = parseEventMs(ev)!;
                const mapped = mapRadarEvent(ev, now);
                return mapped ? { ts, mapped } : null;
            })
            .filter((x): x is { ts: number; mapped: CalendarRadarEvent } => x !== null)
            .sort((a, b) => a.ts - b.ts)
            .map((x) => x.mapped);
    }, [raw]);

    return { events, loading };
}
