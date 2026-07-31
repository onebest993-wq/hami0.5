/** غرف المستودع المخصصة (ملكية/موكل) — منفصلة عن SmartVault وتصنيفات customCategory */

export type RepositoryRoom = {
    id: string;
    title: string;
    description?: string;
    createdAt: string;
    clientLabel?: string | null;
};

/** `main` = المستودع العام (roomId فارغ)، وإلا معرف الغرفة */
export type RepositoryRoomFilter = 'main' | (string & {});

const STORAGE_KEY = 'hami:repository:rooms:v1';

function storageKey(userId: string): string {
    return `${STORAGE_KEY}:${userId.trim()}`;
}

function sanitizeTitle(title: string): string {
    return title.trim().slice(0, 80);
}

function isRoom(value: unknown): value is RepositoryRoom {
    if (!value || typeof value !== 'object') return false;
    const r = value as RepositoryRoom;
    return typeof r.id === 'string' && r.id.length > 0 && typeof r.title === 'string' && r.title.trim().length > 0;
}

export function normalizeRoomId(roomId?: string | null): string | null {
    const trimmed = roomId?.trim();
    return trimmed ? trimmed : null;
}

export function itemMatchesRoomFilter(
    roomId: string | null | undefined,
    filter: RepositoryRoomFilter,
): boolean {
    const normalized = normalizeRoomId(roomId);
    if (filter === 'main') return normalized == null;
    return normalized === filter;
}

export function loadRepositoryRooms(userId: string): RepositoryRoom[] {
    if (!userId.trim()) return [];
    try {
        const raw = localStorage.getItem(storageKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isRoom).map((r) => ({
            id: r.id,
            title: sanitizeTitle(r.title),
            description: r.description?.trim() || undefined,
            createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
            clientLabel: r.clientLabel?.trim() || null,
        }));
    } catch {
        return [];
    }
}

export function saveRepositoryRooms(userId: string, rooms: RepositoryRoom[]): void {
    if (!userId.trim()) return;
    localStorage.setItem(storageKey(userId), JSON.stringify(rooms));
}

export function createRepositoryRoomId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `room_${crypto.randomUUID()}`;
    }
    return `room_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addRepositoryRoom(
    userId: string,
    title: string,
    extras?: { description?: string; clientLabel?: string | null; maxRooms?: number },
): RepositoryRoom[] {
    const trimmed = sanitizeTitle(title);
    if (!trimmed || !userId.trim()) return loadRepositoryRooms(userId);
    const existing = loadRepositoryRooms(userId);
    if (existing.some((r) => r.title === trimmed)) return existing;
    const maxRooms = extras?.maxRooms;
    if (typeof maxRooms === 'number' && existing.length >= maxRooms) return existing;
    const next: RepositoryRoom[] = [
        ...existing,
        {
            id: createRepositoryRoomId(),
            title: trimmed,
            description: extras?.description?.trim() || undefined,
            createdAt: new Date().toISOString(),
            clientLabel: extras?.clientLabel?.trim() || null,
        },
    ];
    saveRepositoryRooms(userId, next);
    return next;
}

export function removeRepositoryRoom(userId: string, roomId: string): RepositoryRoom[] {
    const id = roomId.trim();
    if (!id || !userId.trim()) return loadRepositoryRooms(userId);
    const next = loadRepositoryRooms(userId).filter((r) => r.id !== id);
    saveRepositoryRooms(userId, next);
    return next;
}

export function countItemsInRoom(
    roomId: string,
    notes: { roomId?: string | null }[],
    docs: { roomId?: string | null }[],
): number {
    const id = roomId.trim();
    if (!id) return 0;
    let n = 0;
    for (const note of notes) {
        if (normalizeRoomId(note.roomId) === id) n += 1;
    }
    for (const doc of docs) {
        if (normalizeRoomId(doc.roomId) === id) n += 1;
    }
    return n;
}
