import type { GlobalSearchNavigate } from '@/app/services/globalSearchIndex';

export const GLOBAL_SEARCH_NAV_ID_MAX = 128;
export const GLOBAL_SEARCH_STAGE_INDEX_MAX = 512;

const UNSAFE_ID_CHARS = /[<>'"\u0000-\u001F\u007F]/;
const SCHEME_ID = /^(javascript|data|vbscript):/i;

export function sanitizeSearchEntityId(raw: unknown): string | null {
    if (raw == null) return null;
    const id = String(raw).trim();
    if (!id || id.length > GLOBAL_SEARCH_NAV_ID_MAX) return null;
    if (UNSAFE_ID_CHARS.test(id) || SCHEME_ID.test(id)) return null;
    return id;
}

export function sanitizeSearchCalendarDate(raw: unknown): string | null {
    const s = String(raw ?? '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (
        dt.getUTCFullYear() !== year ||
        dt.getUTCMonth() !== month - 1 ||
        dt.getUTCDate() !== day
    ) {
        return null;
    }
    return s;
}

export function sanitizeSearchStageIndex(raw: unknown): number | null {
    if (typeof raw !== 'number' || !Number.isInteger(raw)) return null;
    if (raw < 0 || raw > GLOBAL_SEARCH_STAGE_INDEX_MAX) return null;
    return raw;
}

function optionalId(raw: unknown): { ok: true; id?: string } | { ok: false } {
    if (raw == null) return { ok: true };
    if (typeof raw === 'string' && !raw.trim()) return { ok: true };
    const id = sanitizeSearchEntityId(raw);
    if (!id) return { ok: false };
    return { ok: true, id };
}

/** ينظّف هدف التنقّل من البحث — يرفض معرّفات/تواريخ غير آمنة */
export function sanitizeGlobalSearchNavigate(nav: GlobalSearchNavigate): GlobalSearchNavigate | null {
    switch (nav.type) {
        case 'notifications':
        case 'repository':
        case 'profile':
        case 'vault':
            return { type: nav.type };
        case 'calendar': {
            let date: string | undefined;
            if (nav.date != null && String(nav.date).trim() !== '') {
                const next = sanitizeSearchCalendarDate(nav.date);
                if (!next) return null;
                date = next;
            }
            const event = optionalId(nav.eventId);
            if (!event.ok) return null;
            return { type: 'calendar', date, eventId: event.id };
        }
        case 'community': {
            const post = optionalId(nav.postId);
            if (!post.ok) return null;
            return { type: 'community', postId: post.id };
        }
        case 'urgent': {
            const urgent = optionalId(nav.urgentId);
            if (!urgent.ok) return null;
            return { type: 'urgent', urgentId: urgent.id };
        }
        case 'criminal': {
            const criminalId = sanitizeSearchEntityId(nav.criminalId);
            if (!criminalId) return null;
            return { type: 'criminal', criminalId };
        }
        case 'transactions': {
            const tx = optionalId(nav.transactionId);
            if (!tx.ok) return null;
            return { type: 'transactions', transactionId: tx.id };
        }
        case 'tasks_manager': {
            const task = optionalId(nav.taskId);
            if (!task.ok) return null;
            return { type: 'tasks_manager', taskId: task.id };
        }
        case 'note':
        case 'voice': {
            const note = optionalId(nav.noteId);
            if (!note.ok) return null;
            return { type: nav.type, noteId: note.id };
        }
        case 'file': {
            const fileId = sanitizeSearchEntityId(nav.fileId);
            if (!fileId) return null;
            let stageIndex: number | undefined;
            if (nav.stageIndex != null) {
                const stage = sanitizeSearchStageIndex(nav.stageIndex);
                if (stage == null) return null;
                stageIndex = stage;
            }
            const event = optionalId(nav.eventId);
            if (!event.ok) return null;
            return { type: 'file', fileId, stageIndex, eventId: event.id };
        }
        case 'case': {
            const caseId = sanitizeSearchEntityId(nav.caseId);
            if (!caseId) return null;
            return { type: 'case', caseId };
        }
        default:
            return null;
    }
}
