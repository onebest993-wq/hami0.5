import type { TimelineEvent } from '@/app/types/execution';

const DEFAULT_SIMILAR_WINDOW_MS = 5000;

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

/** مفتاح تطابق: نوع + عنوان + مصدر + معرّف قرار اختياري */
export function timelineEventSimilarityKey(e: TimelineEvent): string {
    const meta = e.metadata;
    let decisionKey = '';
    if (meta && typeof meta === 'object') {
        const m = meta as Record<string, unknown>;
        decisionKey = String(m.decisionRowId ?? m.decisionId ?? '');
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

/**
 * إزالة التكرار عبر دمج الأحداث المتطابقة التي تقع في نفس الثانية.
 * - يعتمد التطابق على timelineEventSimilarityKey + ثانية الحدث.
 * - لا يدمج الأحداث المحذوفة (trashedAt) حتى لا تتداخل مع سلة المهملات.
 */
export function dedupeTimelineEventsSameSecond(events: TimelineEvent[]): TimelineEvent[] {
    const out: TimelineEvent[] = [];
    const indexByKey = new Map<string, number>();

    for (let i = 0; i < events.length; i += 1) {
        const raw = events[i];
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
    const windowMs = options?.windowMs ?? DEFAULT_SIMILAR_WINDOW_MS;
    if (prev.length === 0) return [incoming];

    const head = prev[0];
    if (!head) return [incoming];
    if (head.trashedAt) return [incoming, ...prev];

    const incMs = parseEventMs(incoming);
    const headMs = parseEventMs(head);
    if (incMs == null || headMs == null) return [incoming, ...prev];
    if (Math.abs(incMs - headMs) > windowMs) return [incoming, ...prev];
    if (timelineEventSimilarityKey(head) !== timelineEventSimilarityKey(incoming)) {
        return [incoming, ...prev];
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
    return [merged, ...prev.slice(1)];
}
