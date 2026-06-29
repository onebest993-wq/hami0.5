import type { TimelineEvent } from '@/app/types/execution';
import {
    isResidentialGraceAppointmentEvent,
    isResidentialGraceRegistrationEvent,
    residentialGraceBoundsFromEvent,
    residentialGraceBoundsKey,
} from '@/app/utils/residentialGraceTimeline';

const DEFAULT_SIMILAR_WINDOW_MS = 5000;

function asTimelineEvents(events: TimelineEvent[] | null | undefined): TimelineEvent[] {
    return Array.isArray(events) ? events : [];
}

function parseEventMs(e: TimelineEvent): number | null {
    const ts = e.timestamp?.trim();
    if (ts) {
        const ms = Date.parse(ts);
        if (Number.isFinite(ms)) return ms;
    }
    const d = e.date?.trim();
    if (d) {
        const iso = d.includes('T') ? d : `${d}T12:00:00`;
        const ms = Date.parse(iso);
        if (Number.isFinite(ms)) return ms;
    }
    return null;
}

function norm(s: string): string {
    return s.replace(/\s+/g, ' ').trim();
}

/** توحيد أحداث قاضي البداءة القديمة (coercive) والجديدة (decision) */
function executiveDetentionJudgeAlias(title: string): string | null {
    const t = norm(title)
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .trim();
    if (/وافق\s+قاضي\s+البداءة.*حبس/i.test(t)) return 'judge_approved';
    if (/رفض\s+قاضي\s+البداءة.*حبس/i.test(t)) return 'judge_rejected';
    return null;
}

/** مفتاح تطابق: نوع + عنوان + مصدر + معرّف قرار اختياري */
export function timelineEventSimilarityKey(e: TimelineEvent): string {
    const meta = e.metadata;
    let decisionKey = '';
    if (meta && typeof meta === 'object') {
        const m = meta as Record<string, unknown>;
        decisionKey = String(m.decisionRowId ?? m.decisionId ?? '');
    }
    const judgeAlias = executiveDetentionJudgeAlias(String(e.title ?? ''));
    if (judgeAlias) {
        return ['judge_detention', judgeAlias, norm(String(e.source ?? '')), decisionKey].join('\u0001');
    }
    if (isResidentialGraceAppointmentEvent(e) || isResidentialGraceRegistrationEvent(e)) {
        const boundsKey = residentialGraceBoundsKey(residentialGraceBoundsFromEvent(e));
        if (boundsKey) {
            return [
                'residential_grace',
                isResidentialGraceRegistrationEvent(e) ? 'registration' : 'appointment',
                boundsKey,
            ].join('\u0001');
        }
    }
    return [
        String(e.type ?? ''),
        norm(String(e.title ?? '')),
        norm(String(e.source ?? '')),
        decisionKey,
    ].join('\u0001');
}

function combineText(a?: string, b?: string): string | undefined {
    const ta = (a ?? '').trim();
    const tb = (b ?? '').trim();
    if (!ta) return tb || undefined;
    if (!tb) return ta;
    if (ta === tb) return ta;
    return `${ta}\n—\n${tb}`;
}

function normalizeId(e: TimelineEvent, fallbackIndex: number): TimelineEvent {
    const id = e.id != null ? String(e.id).trim() : '';
    if (id) return e;
    const ms = parseEventMs(e);
    const basis = ms != null ? String(ms) : String(e.timestamp || e.date || '').replace(/\s/g, '');
    return { ...e, id: `tl_${basis || 'x'}_${fallbackIndex}` };
}

function threadOrDecisionDedupeKey(e: TimelineEvent): string | null {
    const meta = e.metadata;
    const judgeAlias = executiveDetentionJudgeAlias(String(e.title ?? ''));
    if (judgeAlias) {
        return `judge:${judgeAlias}:${norm(String(e.source ?? ''))}`;
    }
    if (!meta || typeof meta !== 'object') return null;
    const m = meta as Record<string, unknown>;
    const thread = String(m.timelineThreadKey ?? '').trim();
    if (thread) return `thread:${thread}`;
    const decisionId = String(m.decisionRowId ?? m.decisionId ?? '').trim();
    if (decisionId) return `decision:${decisionId}`;
    return null;
}

function eventTimeMs(e: TimelineEvent): number {
    return parseEventMs(e) ?? 0;
}

/**
 * دمج الأحداث المربوطة بنفس قرار المنفذ/الخيط الزمني — يُبقي الأحدث.
 */
export function dedupeTimelineEventsByThreadOrDecision(events: TimelineEvent[]): TimelineEvent[] {
    const safe = asTimelineEvents(events);
    const out: TimelineEvent[] = [];
    const indexByKey = new Map<string, number>();

    for (let i = 0; i < safe.length; i += 1) {
        const e = normalizeId(safe[i], i);
        if (e.trashedAt) {
            out.push(e);
            continue;
        }
        const linkKey = threadOrDecisionDedupeKey(e);
        if (!linkKey) {
            out.push(e);
            continue;
        }
        const existingIndex = indexByKey.get(linkKey);
        if (existingIndex == null) {
            indexByKey.set(linkKey, out.length);
            out.push(e);
            continue;
        }
        const head = out[existingIndex];
        if (!head) continue;
        const keepIncoming = eventTimeMs(e) >= eventTimeMs(head);
        const winner = keepIncoming ? { ...head, ...e, id: head.id } : head;
        const loser = keepIncoming ? head : e;
        out[existingIndex] = {
            ...winner,
            description: combineText(winner.description, loser.description),
            details: combineText(winner.details, loser.details),
            metadata:
                winner.metadata || loser.metadata
                    ? {
                          ...(typeof winner.metadata === 'object' && winner.metadata ? winner.metadata : {}),
                          ...(typeof loser.metadata === 'object' && loser.metadata ? loser.metadata : {}),
                      }
                    : undefined,
        };
    }

    return out;
}

/**
 * ترتيب العرض: خيط/قرار ثم نفس الثانية.
 */
export function dedupeTimelineEventsForDisplay(events: TimelineEvent[]): TimelineEvent[] {
    return dedupeTimelineEventsSameSecond(dedupeTimelineEventsByThreadOrDecision(events));
}

/**
 * إزالة التكرار عبر دمج الأحداث المتطابقة التي تقع في نفس الثانية.
 * - يعتمد التطابق على timelineEventSimilarityKey + ثانية الحدث.
 * - لا يدمج الأحداث المحذوفة (trashedAt) حتى لا تتداخل مع سلة المهملات.
 */
export function dedupeTimelineEventsSameSecond(events: TimelineEvent[]): TimelineEvent[] {
    const safe = asTimelineEvents(events);
    const out: TimelineEvent[] = [];
    const indexByKey = new Map<string, number>();

    for (let i = 0; i < safe.length; i += 1) {
        const raw = safe[i];
        const e = normalizeId(raw, i);

        if (e.trashedAt) {
            out.push(e);
            continue;
        }

        const ms = parseEventMs(e);
        const sec = ms != null ? Math.floor(ms / 1000) : -1;
        const key = `${timelineEventSimilarityKey(e)}\u0001${sec}`;
        const existingIndex = indexByKey.get(key);
        if (existingIndex == null) {
            indexByKey.set(key, out.length);
            out.push(e);
            continue;
        }

        const head = out[existingIndex];
        if (!head) continue;
        out[existingIndex] = {
            ...head,
            description: combineText(head.description, e.description),
            details: combineText(head.details, e.details),
            snapshot: e.snapshot !== undefined ? e.snapshot : head.snapshot,
            metadata:
                head.metadata || e.metadata
                    ? {
                          ...(typeof head.metadata === 'object' && head.metadata ? head.metadata : {}),
                          ...(typeof e.metadata === 'object' && e.metadata ? e.metadata : {}),
                      }
                    : undefined,
        };
    }

    return out;
}

/**
 * عند إضافة حدث جديد في مقدمة السجل: إن كان مطابقًا تقريبًا لآخر حدث فعّال
 * ضمن نافذة زمنية قصيرة، يُدمَج في نفس البطاقة (وصف أدق بصريًا دون تكرار).
 */
export function mergeSimilarRecentTimelineEvent(
    prev: TimelineEvent[],
    incoming: TimelineEvent,
    options?: { windowMs?: number }
): TimelineEvent[] {
    const safePrev = asTimelineEvents(prev);
    const windowMs = options?.windowMs ?? DEFAULT_SIMILAR_WINDOW_MS;
    if (safePrev.length === 0) return [incoming];

    const head = safePrev[0];
    if (!head) return [incoming];
    if (head.trashedAt) return [incoming, ...safePrev];

    const incMs = parseEventMs(incoming);
    const headMs = parseEventMs(head);
    if (incMs == null || headMs == null) return [incoming, ...safePrev];
    if (Math.abs(incMs - headMs) > windowMs) return [incoming, ...safePrev];
    if (timelineEventSimilarityKey(head) !== timelineEventSimilarityKey(incoming)) {
        return [incoming, ...safePrev];
    }

    const merged: TimelineEvent = {
        ...head,
        ...incoming,
        id: head.id,
        timestamp: incoming.timestamp ?? head.timestamp,
        date: incoming.date ?? head.date,
        description: combineText(head.description, incoming.description),
        details: combineText(head.details, incoming.details),
        snapshot: incoming.snapshot !== undefined ? incoming.snapshot : head.snapshot,
        metadata:
            head.metadata || incoming.metadata
                ? {
                      ...(typeof head.metadata === 'object' && head.metadata ? head.metadata : {}),
                      ...(typeof incoming.metadata === 'object' && incoming.metadata ? incoming.metadata : {}),
                  }
                : undefined,
    };
    return [merged, ...safePrev.slice(1)];
}
