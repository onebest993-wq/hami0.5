import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { redactAnonymousAuthor } from '../../../services/forum/forumMapper.ts';
import type { CommunityPost } from '../../../services/lawyer-cloud.ts';
import { requireForumAuth, requireForumAuthAndUnbanned, jsonResponse } from '../_auth.ts';
import { ForumGroupRepository } from '../../../services/forum/forumGroupRepository.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

export async function GET(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuth(request);
        if ('response' in auth) {
            return auth.response;
        }

        const url = new URL(request.url);
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '20') || 20));
        const offset = Math.max(0, Number(url.searchParams.get('offset') ?? '0') || 0);
        const groupId = url.searchParams.get('groupId')?.trim() || url.searchParams.get('group_id')?.trim() || '';

        const banned = await ForumRepository.isBanned(auth.userId);
        if (banned) {
            return jsonResponse(403, { ok: false, error: 'حسابك محظور من المنتدى' });
        }

        if (groupId) {
            const isMember = await ForumGroupRepository.isMember(groupId, auth.userId);
            if (!isMember && !auth.isAdmin) {
                return jsonResponse(403, { ok: false, error: 'يجب الانضمام للمجموعة لعرض منشوراتها' });
            }
        }

        const { posts, total } = await ForumRepository.listPosts(
            limit,
            offset,
            groupId ? { groupId } : { publicOnly: true },
        );
        // إخفاء الهوية للمنشورات المجهولة قبل إرسالها للعميل
        const redacted = posts.map((p) => redactAnonymousAuthor(p, auth.userId, auth.isAdmin));
        return jsonResponse(200, { ok: true, posts: redacted, total });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}

export async function POST(request: Request): Promise<Response> {
    try {
        const auth = await requireForumAuthAndUnbanned(request);
        if ('response' in auth) {
            return auth.response;
        }

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }
        if (!isRecord(payload) || typeof payload.action !== 'string') {
            return jsonResponse(400, { ok: false, error: 'action مطلوب' });
        }

        if (payload.action === 'create') {
            if (!checkForumActionRateLimit(auth.userId, 'post')) {
                return jsonResponse(429, { ok: false, error: 'تجاوزت حد النشر، انتظر قليلاً' });
            }
            const post = payload.post as CommunityPost | undefined;
            if (!post || post.authorId !== auth.userId) {
                return jsonResponse(403, { ok: false, error: 'معرّف الناشر لا يطابق الجلسة' });
            }
            const trimmedContent = post.content?.trim() ?? '';
            if (!trimmedContent || trimmedContent.length < 10) {
                return jsonResponse(400, { ok: false, error: 'المحتوى قصير جداً' });
            }
            // حماية ضد DoS: حد أعلى لطول المحتوى (10K حرف)
            if (trimmedContent.length > 10_000) {
                return jsonResponse(413, { ok: false, error: 'المحتوى طويل جداً (الحد 10000 حرف)' });
            }
            // حد أعلى لعدد الوسوم (لا أكثر من 12)
            if (Array.isArray(post.tags) && post.tags.length > 12) {
                return jsonResponse(400, { ok: false, error: 'عدد الوسوم تجاوز الحد (12 كحد أقصى)' });
            }
            const groupId = post.groupId?.trim() || null;
            if (groupId) {
                const isMember = await ForumGroupRepository.isMember(groupId, auth.userId);
                if (!isMember && !auth.isAdmin) {
                    return jsonResponse(403, { ok: false, error: 'يجب الانضمام للمجموعة قبل النشر فيها' });
                }
            }
            const saved = await ForumRepository.savePost({ ...post, groupId });
            return jsonResponse(200, {
                ok: true,
                action: 'create',
                post: redactAnonymousAuthor(saved, auth.userId, auth.isAdmin),
            });
        }

        if (payload.action === 'sync') {
            const post = payload.post as CommunityPost | undefined;
            if (!post?.id) {
                return jsonResponse(400, { ok: false, error: 'post مطلوب' });
            }
            const existing = await ForumRepository.getPostById(post.id);
            if (!existing) {
                return jsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
            }
            const isOwner = existing.authorId === auth.userId;
            const upvoteChanged =
                JSON.stringify(existing.upvoterIds) !== JSON.stringify(post.upvoterIds ?? []);
            const bestChanged = existing.bestCommentId !== (post.bestCommentId ?? null);

            if (upvoteChanged) {
                if (!checkForumActionRateLimit(auth.userId, 'upvote')) {
                    return jsonResponse(429, { ok: false, error: 'تجاوزت حد التصويت' });
                }
                if (post.upvoterIds?.includes(auth.userId) && existing.authorId === auth.userId) {
                    return jsonResponse(400, { ok: false, error: 'لا يمكنك التصويت على منشورك' });
                }
            }

            if (bestChanged && !isOwner && !auth.isAdmin) {
                return jsonResponse(403, { ok: false, error: 'فقط صاحب المنشور يحدد أفضل إجابة' });
            }

            if (!isOwner && !auth.isAdmin && !upvoteChanged) {
                return jsonResponse(403, { ok: false, error: 'غير مصرح بتعديل هذا المنشور' });
            }

            const merged: CommunityPost = {
                ...existing,
                upvoterIds: post.upvoterIds ?? existing.upvoterIds,
                bestCommentId: post.bestCommentId ?? null,
                updatedAt: new Date().toISOString(),
            };
            const saved = await ForumRepository.savePost(merged);
            return jsonResponse(200, {
                ok: true,
                action: 'sync',
                post: redactAnonymousAuthor(saved, auth.userId, auth.isAdmin),
            });
        }

        return jsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        return jsonResponse(500, { ok: false, error: message });
    }
}
