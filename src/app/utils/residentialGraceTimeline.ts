import type { TimelineEvent } from '@/app/types/execution';

function parseYmdMs(raw: string | undefined): number | null {
    const ymd = normalizeGraceYmd(raw);
    if (!ymd) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

export type ResidentialGraceBounds = { start?: string; end?: string; days?: number };

const GRACE_APPT_TITLE_RE = /انتهاء المهلة|انتهاء مهلة التخلية السكنية/;

export function normalizeGraceYmd(raw: string | undefined): string | undefined {
    if (!raw) return undefined;
    const s = String(raw).trim();
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
    return m?.[1];
}

export function parseResidentialGraceBoundsFromText(desc: string): ResidentialGraceBounds {
    const modern = desc.match(
        /المهلة\s+(\d+)\s+يوماً?\s*\(\s*من\s+(\d{4}-\d{2}-\d{2})\s+إلى\s+(\d{4}-\d{2}-\d{2})\s*\)/iu
    );
    if (modern) {
        return { days: Number(modern[1]), start: modern[2], end: modern[3] };
    }
    const range = desc.match(/من\s+(\d{4}-\d{2}-\d{2})\s+إلى\s+(\d{4}-\d{2}-\d{2})/iu);
    if (range) {
        const daysM = desc.match(/(\d+)\s+يوماً?\s*تقويمياً/iu);
        return {
            start: range[1],
            end: range[2],
            days: daysM ? Number(daysM[1]) : undefined,
        };
    }
    const legacyStart = desc.match(/بداية احتساب المهلة:\s*(\d{4}-\d{2}-\d{2})/iu);
    const legacyEnd = desc.match(/انتهاء المهلة:\s*(\d{4}-\d{2}-\d{2})/iu);
    const legacyDays = desc.match(/المدة:\s*(\d+)/iu);
    return {
        start: legacyStart?.[1],
        end: legacyEnd?.[1],
        days: legacyDays ? Number(legacyDays[1]) : undefined,
    };
}

export function residentialGraceBoundsFromEvent(e: TimelineEvent): ResidentialGraceBounds {
    const meta = e.metadata as Record<string, unknown> | undefined;
    const startMeta = normalizeGraceYmd(String(meta?.graceStartYmd ?? ''));
    const endMeta = normalizeGraceYmd(String(meta?.graceEndYmd ?? ''));
    if (startMeta && endMeta) {
        const daysMeta = typeof meta?.graceDays === 'number' ? meta.graceDays : undefined;
        return { start: startMeta, end: endMeta, days: daysMeta };
    }
    const fromText = parseResidentialGraceBoundsFromText(String(e.description || ''));
    if (fromText.start && fromText.end) return fromText;
    const endFromDate = normalizeGraceYmd(String(e.date || ''));
    if (endFromDate && isResidentialGraceAppointmentEvent(e)) {
        return { ...fromText, end: endFromDate };
    }
    return fromText;
}

export function residentialGraceBoundsKey(bounds: ResidentialGraceBounds): string | null {
    const start = normalizeGraceYmd(bounds.start);
    const end = normalizeGraceYmd(bounds.end);
    if (!start || !end) return null;
    return `${start}\u0001${end}`;
}

export function isResidentialGraceAppointmentEvent(e: TimelineEvent): boolean {
    if (e.type !== 'appointment') return false;
    return GRACE_APPT_TITLE_RE.test(String(e.title || ''));
}

export function isResidentialGraceRegistrationEvent(e: TimelineEvent): boolean {
    const meta = e.metadata as Record<string, unknown> | undefined;
    if (meta?.evictionResidentialGraceModal) return true;
    const title = String(e.title || '');
    return e.type === 'eviction' && (/🏠\s*مهلة|مهلة التخلية السكنية/u.test(title));
}

export function isResidentialGraceTimelineEvent(e: TimelineEvent): boolean {
    return isResidentialGraceAppointmentEvent(e) || isResidentialGraceRegistrationEvent(e);
}

export function stripResidentialGraceTimelineEvents(events: TimelineEvent[]): TimelineEvent[] {
    return events.filter((e) => !isResidentialGraceTimelineEvent(e));
}

function graceEventTimeMs(e: TimelineEvent): number {
    const ts = e.timestamp?.trim();
    if (ts) {
        const ms = Date.parse(ts);
        if (Number.isFinite(ms)) return ms;
    }
    return parseYmdMs(String(e.date || '')) ?? 0;
}

export function buildResidentialGraceDisplayEvent(
    primary: TimelineEvent,
    secondary: TimelineEvent | null,
    bounds: ResidentialGraceBounds
): TimelineEvent {
    const start = bounds.start || '';
    const end = bounds.end || '';
    const days =
        bounds.days ??
        (start && end
            ? Math.max(
                  1,
                  Math.round((parseYmdMs(end)! - parseYmdMs(start)!) / 86400000) + 1
              )
            : undefined);
    const description =
        start && end
            ? `من ${start} إلى ${end}${days ? ` — ${days} يوماً تقويمياً` : ''}`
            : String(primary.description || secondary?.description || '').trim();
    const ids = [primary.id, secondary?.id].filter(Boolean);
    return {
        ...primary,
        type: 'eviction',
        title: 'مهلة التخلية السكنية',
        description,
        source: 'الإجراءات الجبرية — تخلية',
        metadata: {
            ...(typeof primary.metadata === 'object' && primary.metadata ? primary.metadata : {}),
            evictionResidentialGraceModal: true,
            graceStartYmd: start || undefined,
            graceEndYmd: end || undefined,
            graceDays: days,
            mergedResidentialGraceDisplay: ids,
        },
    };
}

/**
 * يزيل تكرار مواعيد انتهاء المهلة ويدمج التسجيل + الموعد في بطاقة واحدة للعرض.
 */
export function mergeResidentialGraceTimelineForDisplay(events: TimelineEvent[]): TimelineEvent[] {
    const consumed = new Set<string>();
    const registrationByKey = new Map<string, TimelineEvent>();
    const appointmentByKey = new Map<string, TimelineEvent>();

    for (const e of events) {
        const id = String(e.id);
        if (isResidentialGraceRegistrationEvent(e)) {
            const key = residentialGraceBoundsKey(residentialGraceBoundsFromEvent(e));
            if (!key) continue;
            const prev = registrationByKey.get(key);
            if (!prev || graceEventTimeMs(e) >= graceEventTimeMs(prev)) {
                if (prev) consumed.add(String(prev.id));
                registrationByKey.set(key, e);
            } else {
                consumed.add(id);
            }
            continue;
        }
        if (isResidentialGraceAppointmentEvent(e)) {
            const key = residentialGraceBoundsKey(residentialGraceBoundsFromEvent(e));
            if (!key) continue;
            const prev = appointmentByKey.get(key);
            if (!prev || graceEventTimeMs(e) >= graceEventTimeMs(prev)) {
                if (prev) consumed.add(String(prev.id));
                appointmentByKey.set(key, e);
            } else {
                consumed.add(id);
            }
        }
    }

    const out: TimelineEvent[] = [];

    for (const e of events) {
        const id = String(e.id);
        if (consumed.has(id)) continue;

        if (isResidentialGraceRegistrationEvent(e)) {
            const key = residentialGraceBoundsKey(residentialGraceBoundsFromEvent(e));
            const canonical = key ? registrationByKey.get(key) : undefined;
            if (!canonical || String(canonical.id) !== id) {
                consumed.add(id);
                continue;
            }
            const appt = key ? appointmentByKey.get(key) : undefined;
            if (appt) consumed.add(String(appt.id));
            out.push(
                buildResidentialGraceDisplayEvent(
                    e,
                    appt ?? null,
                    residentialGraceBoundsFromEvent(e)
                )
            );
            continue;
        }

        if (isResidentialGraceAppointmentEvent(e)) {
            const key = residentialGraceBoundsKey(residentialGraceBoundsFromEvent(e));
            const canonical = key ? appointmentByKey.get(key) : undefined;
            if (!canonical || String(canonical.id) !== id) {
                consumed.add(id);
                continue;
            }
            if (key && registrationByKey.has(key)) {
                consumed.add(id);
                continue;
            }
            out.push(
                buildResidentialGraceDisplayEvent(
                    e,
                    null,
                    residentialGraceBoundsFromEvent(e)
                )
            );
            continue;
        }

        out.push(e);
    }

    return out;
}
