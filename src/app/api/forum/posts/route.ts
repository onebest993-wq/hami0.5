import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import { checkForumActionRateLimit } from '../../../services/forum/forumRateLimitServer.ts';
import { forumAuthorDisplayName, redactAnonymousAuthor } from '../../../services/forum/forumMapper.ts';
import { sanitizeCommunityPostForCreate } from '../../../services/forum/forumPostCreateGuard.ts';
import { computeAllowedUpvoterIds, resolveSyncBestCommentId } from '../../../services/forum/forumPostSyncGuard.ts';
import { resolveForumAuthorDisplayName } from '../../../services/forum/forumAuthorResolver.ts';
import type { CommunityPost } from '../../../services/lawyer-cloud.ts';
import { requireForumAuth, requireForumAuthAndUnbanned, jsonResponse } from '../_auth.ts';
import { canViewForumGroupPost } from '../../../services/forum/forumBffAccessPolicy.ts';
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
        const postIdParam = url.searchParams.get('postId')?.trim() || url.searchParams.get('id')?.trim() || '';
        if (postIdParam) {
            const banned = await ForumRepository.isBanned(auth.userId);
            if (banned) {
                return jsonResponse(403, { ok: false, error: 'حسابك محظور من المنتدى' });
            }
            const post = await ForumRepository.getPostById(postIdParam);
            if (!post) {
                return jsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
            }
            if (post.groupId) {
                const isMember = await ForumGroupRepository.isMember(post.groupId, auth.userId);
                if (!canViewForumGroupPost(post, isMember, auth.isAdmin)) {
                    return jsonResponse(403, { ok: false, error: 'يجب الانضمام للمجموعة لعرض منشوراتها' });
                }
            }
            return jsonResponse(200, {
                ok: true,
                post: redactAnonymousAuthor(post, auth.userId, auth.isAdmin),
            });
        }

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
            if (!(await checkForumActionRateLimit(auth.userId, 'post'))) {
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
            const safePost = sanitizeCommunityPostForCreate(
                {
                    ...post,
                    groupId: groupId ?? undefined,
                    authorName: await resolveForumAuthorDisplayName(auth.userId),
                },
                auth.userId,
            );
            const saved = await ForumRepository.savePost(safePost);
            void import('../../../services/forum/forumNotificationDispatch').then(({ dispatchFollowedUserNewPost }) =>
                dispatchFollowedUserNewPost({
                    authorId: auth.userId,
                    authorName: forumAuthorDisplayName(saved),
                    post: saved,
                }),
            );
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
            const upvoteResult = computeAllowedUpvoterIds(
                existing.upvoterIds ?? [],
                post.upvoterIds,
                auth.userId,
            );
            if (!upvoteResult.ok) {
                return jsonResponse(403, { ok: false, error: upvoteResult.ok === false ? upvoteResult.error : 'forbidden' });
            }
            const bestResult = resolveSyncBestCommentId(
                existing.bestCommentId,
                post.bestCommentId,
                isOwner,
                auth.isAdmin,
            );
            if (!bestResult.ok) {
                return jsonResponse(403, { ok: false, error: bestResult.ok === false ? bestResult.error : 'forbidden' });
            }

            if (upvoteResult.changed) {
                if (!(await checkForumActionRateLimit(auth.userId, 'upvote'))) {
                    return jsonResponse(429, { ok: false, error: 'تجاوزت حد التصويت' });
                }
                if (upvoteResult.upvoterIds.includes(auth.userId) && existing.authorId === auth.userId) {
                    return jsonResponse(400, { ok: false, error: 'لا يمكنك التصويت على منشورك' });
                }
            }

            if (!isOwner && !auth.isAdmin && !upvoteResult.changed) {
                return jsonResponse(403, { ok: false, error: 'غير مصرح بتعديل هذا المنشور' });
            }

            const merged: CommunityPost = {
                ...existing,
                upvoterIds: upvoteResult.upvoterIds,
                bestCommentId: bestResult.bestCommentId,
                updatedAt: new Date().toISOString(),
            };
            const saved = await ForumRepository.savePost(merged);

            if (upvoteResult.changed && upvoteResult.upvoterIds.includes(auth.userId)) {
                void import('../../../services/forum/forumNotificationDispatch').then(({ dispatchPostUpvoteNotification }) =>
                    dispatchPostUpvoteNotification({ post: saved, voterId: auth.userId }),
                );
            }
            if (bestResult.changed && saved.bestCommentId) {
                const bestComment = saved.comments.find((c) => c.id === saved.bestCommentId);
                if (bestComment) {
                    void import('../../../services/forum/forumNotificationDispatch').then(({ dispatchBestAnswerNotification }) =>
                        dispatchBestAnswerNotification({ post: saved, comment: bestComment }),
                    );
                }
            }

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
