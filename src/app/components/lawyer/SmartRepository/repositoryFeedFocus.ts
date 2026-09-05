import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import { repositoryFeedItemKey } from '@/app/services/repository/repositoryUnifiedFeed';
import {
    normalizeRoomId,
    type RepositoryRoomFilter,
} from '@/app/services/repository/repositoryRooms';
import { djb2Hash } from '@/app/utils/djb2';

/** معرّف البطاقة كما يُكتب على data-note-id (ملاحظات عامة) أو مفتاح الخلاصة */
export function repositoryFeedFocusId(item: RepositoryFeedItem): string {
    if (item.kind === 'global') return String(item.note.id);
    if (item.kind === 'dossier') return item.ref.id;
    return item.doc.id;
}

export function indexOfRepositoryFeedFocus(
    items: RepositoryFeedItem[],
    focusNoteId: string,
): number {
    return items.findIndex((item) => repositoryFeedFocusId(item) === focusNoteId);
}

export function repositoryFeedItemsSignature(items: RepositoryFeedItem[]): string {
    if (items.length === 0) return '0';
    let keys = '';
    for (const item of items) keys += `${repositoryFeedItemKey(item)}\n`;
    return `${items.length}:${djb2Hash(keys)}`;
}

export function repositoryNoteIdSelector(noteId: string): string {
    const escaped =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(noteId)
            : noteId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `[data-note-id="${escaped}"]`;
}

/**
 * تمرير بحث/تنبيه إلى بطاقة: مرة لكل focusNoteId بعد ظهورها في القائمة.
 * إعادة الربط مع كل تغيّر في الخلاصة كانت تعيد التمرير بعد أن يحرّك المستخدم القائمة.
 */
export function consumeRepositoryFeedFocus(
    focusNoteId: string | undefined,
    appliedRef: { current: string | null },
    found: boolean,
): boolean {
    if (!focusNoteId) {
        appliedRef.current = null;
        return false;
    }
    if (!found) return false;
    if (appliedRef.current === focusNoteId) return false;
    appliedRef.current = focusNoteId;
    return true;
}

/**
 * بحث/تنبيه يفتح المستودع العام بينما البطاقة في غرفة — تُختار الغرفة مرة لكل معرّف.
 * null = لا تركيز أو البطاقة لم تُحمَّل بعد (لا تُصفَّر غرفة المستخدم).
 */
export function resolveRepositoryFocusRoomFilter(
    notes: { id: string | number; roomId?: string | null }[],
    focusNoteId: string | undefined,
): RepositoryRoomFilter | null {
    if (!focusNoteId) return null;
    const note = notes.find((n) => String(n.id) === focusNoteId);
    if (!note) return null;
    return normalizeRoomId(note.roomId) ?? 'main';
}

/** تمرير افتراضي: البطاقة قد لا تكون في DOM بعد scrollToIndex — لا تستهلك قبل ظهورها. */
export function scheduleRepositoryFeedCardScroll(
    focusNoteId: string,
    getRoot: () => ParentNode | Document | null | undefined,
    consume: () => boolean,
    maxFrames = 16,
): () => void {
    let cancelled = false;
    let frames = 0;
    let raf = 0;
    const tick = () => {
        if (cancelled) return;
        const root = getRoot() ?? document;
        const el = root.querySelector(repositoryNoteIdSelector(focusNoteId));
        if (el instanceof HTMLElement) {
            if (consume()) {
                el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            }
            return;
        }
        frames += 1;
        if (frames < maxFrames) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
        cancelled = true;
        window.cancelAnimationFrame(raf);
    };
}
