import type { RepositoryRoom } from '@/app/services/repository/repositoryRooms';

export function filterRepositoryRoomsByQuery(
    rooms: RepositoryRoom[],
    query: string,
): RepositoryRoom[] {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
        (r) =>
            r.title.toLowerCase().includes(q) ||
            (r.clientLabel?.toLowerCase().includes(q) ?? false),
    );
}
