import type { CommunityPost } from '@/app/services/lawyer-cloud';

const UUID_MENTION =
    /@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type ForumParticipant = { id: string; name: string };

/** مشاركون في النقاش — للربط بين @الاسم والمعرّف */
export function collectForumParticipants(post: CommunityPost): ForumParticipant[] {
    const byId = new Map<string, string>();
    if (post.authorId && post.authorName && post.authorId !== '__anonymous__') {
        byId.set(post.authorId, post.authorName);
    }
    for (const c of post.comments) {
        if (c.authorId && c.authorName && c.authorId !== '__anonymous__') {
            byId.set(c.authorId, c.authorName);
        }
    }
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
}

/**
 * يستخرج معرّفات المذكورين:
 * - @uuid
 * - @اسم المحامي (يطابق مشاركي النقاش فقط)
 */
export function extractForumMentionIds(content: string, participants: ForumParticipant[]): string[] {
    const ids = new Set<string>();
    const trimmed = content.trim();
    if (!trimmed) return [];

    for (const match of trimmed.matchAll(UUID_MENTION)) {
        const id = match[1]?.toLowerCase();
        if (id) ids.add(id);
    }

    const sorted = [...participants].sort((a, b) => b.name.trim().length - a.name.trim().length);
    for (const p of sorted) {
        const name = p.name.trim();
        if (!name || name.length < 2) continue;
        const re = new RegExp(`@${escapeRegExp(name)}(?=\\s|$|[.,!?،؛])`, 'u');
        if (re.test(trimmed)) ids.add(p.id);
    }

    return [...ids];
}
