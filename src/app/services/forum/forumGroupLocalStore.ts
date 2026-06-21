import type {
    CreateForumGroupInput,
    ForumGroup,
    ForumGroupMember,
    ForumGroupMemberRow,
    ForumGroupRow,
} from './forumGroupTypes';

const GROUPS_KEY = 'hami:forum:groups:v1';
const MEMBERS_KEY = 'hami:forum:group-members:v1';

function createId(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readJson<T>(key: string): T[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
        return [];
    }
}

function writeJson<T>(key: string, rows: T[]): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(rows));
}

function rowToGroup(
    row: ForumGroupRow,
    memberCount: number,
    viewerId: string | null,
    members: ForumGroupMemberRow[],
): ForumGroup {
    const membership = viewerId
        ? members.find((m) => m.group_id === row.id && m.lawyer_id === viewerId)
        : undefined;
    return {
        id: row.id,
        name: row.name,
        description: row.description ?? '',
        coverImage: row.cover_image,
        creatorId: row.creator_id,
        isOfficial: row.is_official,
        createdAt: row.created_at,
        memberCount,
        isMember: Boolean(membership),
        viewerRole: membership?.role ?? null,
    };
}

export const ForumGroupLocalStore = {
    listGroups(viewerId: string | null, query = ''): ForumGroup[] {
        const groups = readJson<ForumGroupRow>(GROUPS_KEY);
        const members = readJson<ForumGroupMemberRow>(MEMBERS_KEY);
        const q = query.trim().toLowerCase();
        const filtered = q
            ? groups.filter(
                  (g) =>
                      g.name.toLowerCase().includes(q) ||
                      (g.description ?? '').toLowerCase().includes(q),
              )
            : groups;
        return filtered
            .map((row) => {
                const memberCount = members.filter((m) => m.group_id === row.id).length;
                return rowToGroup(row, memberCount, viewerId, members);
            })
            .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    },

    getGroup(groupId: string, viewerId: string | null): ForumGroup | null {
        return this.listGroups(viewerId).find((g) => g.id === groupId) ?? null;
    },

    createGroup(creatorId: string, input: CreateForumGroupInput): ForumGroup {
        const groups = readJson<ForumGroupRow>(GROUPS_KEY);
        const members = readJson<ForumGroupMemberRow>(MEMBERS_KEY);
        const now = new Date().toISOString();
        const row: ForumGroupRow = {
            id: createId(),
            name: input.name.trim(),
            description: input.description.trim(),
            cover_image: input.coverImage?.trim() || null,
            creator_id: creatorId,
            is_official: input.isOfficial === true,
            created_at: now,
        };
        groups.unshift(row);
        const memberRow: ForumGroupMemberRow = {
            id: createId(),
            group_id: row.id,
            lawyer_id: creatorId,
            role: 'admin',
            joined_at: now,
        };
        members.push(memberRow);
        writeJson(GROUPS_KEY, groups);
        writeJson(MEMBERS_KEY, members);
        return rowToGroup(row, 1, creatorId, members);
    },

    joinGroup(groupId: string, lawyerId: string): ForumGroupMember | null {
        const groups = readJson<ForumGroupRow>(GROUPS_KEY);
        if (!groups.some((g) => g.id === groupId)) return null;
        const members = readJson<ForumGroupMemberRow>(MEMBERS_KEY);
        const existing = members.find((m) => m.group_id === groupId && m.lawyer_id === lawyerId);
        if (existing) {
            return {
                id: existing.id,
                groupId: existing.group_id,
                lawyerId: existing.lawyer_id,
                role: existing.role,
                joinedAt: existing.joined_at,
            };
        }
        const row: ForumGroupMemberRow = {
            id: createId(),
            group_id: groupId,
            lawyer_id: lawyerId,
            role: 'member',
            joined_at: new Date().toISOString(),
        };
        members.push(row);
        writeJson(MEMBERS_KEY, members);
        return {
            id: row.id,
            groupId: row.group_id,
            lawyerId: row.lawyer_id,
            role: row.role,
            joinedAt: row.joined_at,
        };
    },

    leaveGroup(groupId: string, lawyerId: string): boolean {
        const members = readJson<ForumGroupMemberRow>(MEMBERS_KEY);
        const next = members.filter((m) => !(m.group_id === groupId && m.lawyer_id === lawyerId));
        if (next.length === members.length) return false;
        writeJson(MEMBERS_KEY, next);
        return true;
    },

    isMember(groupId: string, lawyerId: string): boolean {
        return readJson<ForumGroupMemberRow>(MEMBERS_KEY).some(
            (m) => m.group_id === groupId && m.lawyer_id === lawyerId,
        );
    },

    listMemberIds(groupId: string): string[] {
        return readJson<ForumGroupMemberRow>(MEMBERS_KEY)
            .filter((m) => m.group_id === groupId)
            .map((m) => m.lawyer_id);
    },
};
