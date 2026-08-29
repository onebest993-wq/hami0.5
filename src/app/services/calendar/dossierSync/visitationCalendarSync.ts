import { normalizeDateToYmd } from '@/app/services/calendar/bridge';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { isRecord, readStr } from './shared';

/** معرّف ثابت — موعد مشاهدة واحد قادم لكل إضبارة تنفيذ، بلا إغراق الجدول المولَّد */
export const EXECUTION_VISIT_NEXT_EVENT_ID = 'visit_next';

type NextVisitation = {
    date: string;
    time?: string;
    location?: string;
};

function isUpcomingScheduledSession(raw: Record<string, unknown>, todayYmd: string): boolean {
    const status = String(raw.status ?? 'scheduled');
    if (status !== 'scheduled') return false;
    if (String(raw.documentedAt ?? '').trim()) return false;
    const ymd = normalizeDateToYmd(readStr(raw, 'date'));
    return Boolean(ymd && ymd >= todayYmd);
}

export function resolveNextExecutionVisitation(file: Record<string, unknown>): NextVisitation | null {
    const bundle = file.visitationSchedule;
    if (!isRecord(bundle)) return null;
    const sessions = Array.isArray(bundle.sessions) ? bundle.sessions : [];
    const todayYmd = getLocalTodayYmd();
    let next: NextVisitation | null = null;
    for (const raw of sessions) {
        if (!isRecord(raw) || !isUpcomingScheduledSession(raw, todayYmd)) continue;
        const date = normalizeDateToYmd(readStr(raw, 'date'));
        if (!date) continue;
        if (next && date >= next.date) continue;
        const config = isRecord(bundle.config) ? bundle.config : null;
        next = {
            date,
            time: config ? readStr(config, 'startTime') || undefined : undefined,
            location: config ? readStr(config, 'location') || undefined : undefined,
        };
    }
    return next;
}
