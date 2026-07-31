import {
    type RepositoryRoom,
    type RepositoryRoomFilter,
    normalizeRoomId,
} from './repositoryRooms';

const PINNED_KEY = 'hami:repository:rooms:pinned:v1';

/** أقصى غرف مثبّتة على الشريط — يبقى مضغوطاً وأنيقاً */
export const REPOSITORY_PINNED_MAX = 5;
/** سقف حماية من بطء التخزين/العرض */
export const REPOSITORY_ROOMS_SOFT_MAX = 80;

function pinnedStorageKey(userId: string): string {
    return `${PINNED_KEY}:${userId.trim()}`;
}

export function loadRepositoryPinnedRoomIds(userId: string): string[] {
    if (!userId.trim()) return [];
    try {
        const raw = localStorage.getItem(pinnedStorageKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
            .slice(0, REPOSITORY_PINNED_MAX);
    } catch {
        return [];
    }
}

export function saveRepositoryPinnedRoomIds(userId: string, ids: string[]): void {
    if (!userId.trim()) return;
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
        const trimmed = id.trim();
        if (!trimmed || seen.has(trimmed)) continue;
        seen.add(trimmed);
        unique.push(trimmed);
        if (unique.length >= REPOSITORY_PINNED_MAX) break;
    }
    localStorage.setItem(pinnedStorageKey(userId), JSON.stringify(unique));
}

export function pruneRepositoryPinnedRoomIds(userId: string, validRoomIds: Set<string>): string[] {
    const next = loadRepositoryPinnedRoomIds(userId).filter((id) => validRoomIds.has(id));
    saveRepositoryPinnedRoomIds(userId, next);
    return next;
}

export function toggleRepositoryPinnedRoom(
    userId: string,
    roomId: string,
    pinnedIds: string[],
): { ids: string[]; pinned: boolean; atLimit: boolean } {
    const id = roomId.trim();
    if (!id) return { ids: pinnedIds, pinned: false, atLimit: false };
    if (pinnedIds.includes(id)) {
        const ids = pinnedIds.filter((x) => x !== id);
        saveRepositoryPinnedRoomIds(userId, ids);
        return { ids, pinned: false, atLimit: false };
    }
    if (pinnedIds.length >= REPOSITORY_PINNED_MAX) {
        return { ids: pinnedIds, pinned: false, atLimit: true };
    }
    const ids = [...pinnedIds, id];
    saveRepositoryPinnedRoomIds(userId, ids);
    return { ids, pinned: true, atLimit: false };
}

/** حرف أبجدي للتجميع — يوحّد أشكال الألف */
export function repositoryRoomInitial(title: string): string {
    const raw = title.trim().charAt(0);
    if (!raw) return '#';
    const map: Record<string, string> = {
        أ: 'ا',
        إ: 'ا',
        آ: 'ا',
        ٱ: 'ا',
        ء: 'ا',
        ؤ: 'و',
        ئ: 'ي',
        ة: 'ه',
    };
    return map[raw] ?? raw.toUpperCase();
}

export type RepositoryRoomAlphaGroup = {
    letter: string;
    rooms: RepositoryRoom[];
};

export function groupRepositoryRoomsByInitial(rooms: RepositoryRoom[]): RepositoryRoomAlphaGroup[] {
    const map = new Map<string, RepositoryRoom[]>();
    const sorted = [...rooms].sort((a, b) => a.title.localeCompare(b.title, 'ar'));
    for (const room of sorted) {
        const letter = repositoryRoomInitial(room.title);
        const bucket = map.get(letter);
        if (bucket) bucket.push(room);
        else map.set(letter, [room]);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b, 'ar'))
        .map(([letter, list]) => ({ letter, rooms: list }));
}

/** غرف الشريط = المثبّتة فقط (+ الغرفة النشطة إن لم تكن مثبّتة — شريحة واحدة مؤقتة) */
export function resolvePinnedRailRooms(
    rooms: RepositoryRoom[],
    pinnedIds: string[],
    selectedRoomId: RepositoryRoomFilter,
): { pinned: RepositoryRoom[]; activeUnpinned: RepositoryRoom | null } {
    const byId = new Map(rooms.map((r) => [r.id, r]));
    const pinned: RepositoryRoom[] = [];
    for (const id of pinnedIds) {
        const room = byId.get(id);
        if (room) pinned.push(room);
    }
    let activeUnpinned: RepositoryRoom | null = null;
    if (selectedRoomId !== 'main' && !pinnedIds.includes(selectedRoomId)) {
        activeUnpinned = byId.get(selectedRoomId) ?? null;
    }
    return { pinned, activeUnpinned };
}

/** عدّاد واحد O(notes+docs) — آمن مع كثرة الغرف */
export function buildRepositoryRoomCounts(
    roomIds: Iterable<string>,
    notes: { roomId?: string | null }[],
    docs: { roomId?: string | null }[],
): Map<string, number> {
    const map = new Map<string, number>();
    for (const id of roomIds) map.set(id, 0);
    for (const note of notes) {
        const id = normalizeRoomId(note.roomId);
        if (id != null && map.has(id)) map.set(id, (map.get(id) ?? 0) + 1);
    }
    for (const doc of docs) {
        const id = normalizeRoomId(doc.roomId);
        if (id != null && map.has(id)) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
}
