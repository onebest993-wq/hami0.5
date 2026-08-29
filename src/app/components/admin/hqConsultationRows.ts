import { clampHqCount, stripHqControlChars } from '@/app/domain/admin/hqSafeText';

const ID_MAX = 64;
const NAME_MAX = 80;
const CONTENT_MAX = 2500;
const TIME_MAX = 40;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HqConsultationRow = {
    id: string;
    name: string;
    content: string;
    time: string;
    pinned: boolean;
    locked: boolean;
    replyCount: number;
};

function asUuid(value: unknown): string {
    const id = stripHqControlChars(value, ID_MAX);
    return UUID_RE.test(id) ? id : '';
}

export function sanitizeHqConsultationRow(raw: unknown): HqConsultationRow | null {
    if (!raw || typeof raw !== 'object') return null;
    const rec = raw as Record<string, unknown>;
    const id = asUuid(rec.id);
    if (!id) return null;
    const offers = Array.isArray(rec.offers) ? rec.offers : [];
    const fromOffers = offers.length;
    return {
        id,
        name: stripHqControlChars(rec.name, NAME_MAX) || '—',
        content: stripHqControlChars(rec.content, CONTENT_MAX),
        time: stripHqControlChars(rec.time, TIME_MAX) || '—',
        pinned: rec.pinned === true,
        locked: rec.locked === true,
        replyCount: clampHqCount(rec.replyCount ?? fromOffers, 10_000),
    };
}

export function sanitizeHqConsultationRows(raw: unknown): HqConsultationRow[] {
    if (!Array.isArray(raw)) return [];
    const out: HqConsultationRow[] = [];
    for (const row of raw) {
        const mapped = sanitizeHqConsultationRow(row);
        if (mapped) out.push(mapped);
    }
    return out;
}
