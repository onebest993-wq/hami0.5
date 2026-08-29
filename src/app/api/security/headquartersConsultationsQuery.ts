import type { SupabaseClient } from '@supabase/supabase-js';
import {
    HEADQUARTERS_CONSULTATION_REPLY_SCAN_CAP,
    HEADQUARTERS_CONSULTATIONS_CAP,
    mapHeadquartersConsultation,
    type HeadquartersConsultation,
} from './headquartersConsultationsMap.ts';
import { isPostgresUuidSubject } from './postgresUuidSubject.ts';

type PostRow = {
    id?: unknown;
    author_name?: unknown;
    is_anonymous?: unknown;
    content?: unknown;
    created_at?: unknown;
    is_pinned?: unknown;
    is_locked?: unknown;
};

type CommentCountRow = {
    post_id?: unknown;
};

function isMissingRelation(message: string): boolean {
    const hay = message.toLowerCase();
    return hay.includes('does not exist') || hay.includes('schema cache') || hay.includes('relation');
}

function isPublicForumPost(row: { group_id?: unknown } | null): boolean {
    if (!row) return false;
    const groupId = row.group_id;
    return groupId == null || String(groupId).trim() === '';
}

async function loadPublicForumPost(
    admin: SupabaseClient,
    postId: string,
): Promise<{ id: string; authorId: string } | null> {
    const id = postId.trim();
    if (!isPostgresUuidSubject(id)) return null;
    const { data, error } = await admin
        .from('forum_posts')
        .select('id, group_id, author_id')
        .eq('id', id)
        .maybeSingle();
    if (error) throw new Error(error.message || 'Failed to load consultation');
    if (!data || !isPublicForumPost(data as { group_id?: unknown })) return null;
    const authorRaw = String((data as { author_id?: unknown }).author_id ?? '').trim();
    return {
        id,
        authorId: isPostgresUuidSubject(authorRaw) ? authorRaw : '',
    };
}

/**
 * قائمة استشارات المقر من Postgres مباشرة —
 * بلا ForumRepository / CommunityDB / ترحيل KV / توقيع مرفقات.
 * عدّ الردود بلا أسماء المعلّقين.
 */
export async function listHeadquartersConsultations(
    admin: SupabaseClient,
): Promise<HeadquartersConsultation[]> {
    const { data: posts, error } = await admin
        .from('forum_posts')
        .select('id, author_name, is_anonymous, content, created_at, is_pinned, is_locked')
        .is('group_id', null)
        .order('created_at', { ascending: false })
        .limit(HEADQUARTERS_CONSULTATIONS_CAP);
    if (error) {
        const detail = typeof error.message === 'string' ? error.message : '';
        if (isMissingRelation(detail)) return [];
        throw new Error(detail || 'Failed to list consultations');
    }
    const rows = Array.isArray(posts) ? (posts as PostRow[]) : [];
    const ids = rows.map((row) => String(row.id ?? '').trim()).filter((id) => isPostgresUuidSubject(id));

    const replyCountByPost = new Map<string, number>();
    if (ids.length > 0) {
        const { data: comments, error: commentError } = await admin
            .from('forum_comments')
            .select('post_id')
            .in('post_id', ids)
            .limit(HEADQUARTERS_CONSULTATION_REPLY_SCAN_CAP);
        if (commentError) {
            const detail = typeof commentError.message === 'string' ? commentError.message : '';
            if (!isMissingRelation(detail)) {
                throw new Error(detail || 'Failed to list consultation replies');
            }
        } else if (Array.isArray(comments)) {
            for (const raw of comments as CommentCountRow[]) {
                const postId = String(raw.post_id ?? '').trim();
                if (!postId) continue;
                replyCountByPost.set(postId, (replyCountByPost.get(postId) ?? 0) + 1);
            }
        }
    }

    const consultations: HeadquartersConsultation[] = [];
    for (const row of rows) {
        const mapped = mapHeadquartersConsultation({
            id: row.id,
            authorName: row.author_name,
            isAnonymous: row.is_anonymous === true,
            content: row.content,
            createdAt: row.created_at,
            pinned: row.is_pinned === true,
            locked: row.is_locked === true,
            replyCount: replyCountByPost.get(String(row.id ?? '').trim()) ?? 0,
        });
        if (mapped) consultations.push(mapped);
    }
    return consultations;
}

export type HqConsultationMutationResult = 'missing' | { ok: true; authorId: string };

export async function deleteHeadquartersConsultation(
    admin: SupabaseClient,
    postId: string,
): Promise<HqConsultationMutationResult> {
    const post = await loadPublicForumPost(admin, postId);
    if (!post) return 'missing';
    const { error: commentsError } = await admin.from('forum_comments').delete().eq('post_id', post.id);
    if (commentsError) throw new Error(commentsError.message || 'Failed to delete consultation replies');
    const { error: postError } = await admin.from('forum_posts').delete().eq('id', post.id);
    if (postError) throw new Error(postError.message || 'Failed to delete consultation');
    return { ok: true, authorId: post.authorId };
}

export async function setHeadquartersPostFlags(
    admin: SupabaseClient,
    postId: string,
    flags: { pinned?: boolean; locked?: boolean },
): Promise<HqConsultationMutationResult> {
    const post = await loadPublicForumPost(admin, postId);
    if (!post) return 'missing';
    const patch: Record<string, boolean | string> = {
        updated_at: new Date().toISOString(),
    };
    if (typeof flags.pinned === 'boolean') patch.is_pinned = flags.pinned;
    if (typeof flags.locked === 'boolean') patch.is_locked = flags.locked;
    if (Object.keys(patch).length <= 1) return 'missing';

    const { error: updateError } = await admin.from('forum_posts').update(patch).eq('id', post.id);
    if (updateError) throw new Error(updateError.message || 'Failed to update post flags');
    return { ok: true, authorId: post.authorId };
}
