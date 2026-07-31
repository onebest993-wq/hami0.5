import { UserRole } from '@/app/types/admin-types';
import SecureStoreService from '@/app/services/SecureStoreService';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { lawyerCloudKv as kv, uuidv4 } from '@/app/services/cloud/lawyerCloudKv';
import { ForumFollowRepository } from '@/app/services/forum/forumFollowRepository';
import type {
    BanRecord,
    CommunityComment,
    CommunityPost,
    CommunityReport,
    FollowRecord,
} from '@/app/services/cloud/lawyerCommunityTypes';
import {
    filterDeletedCommunityPosts,
    loadDeletedCommunityPostIds,
    loadLocalCommunityPosts,
    markCommunityPostDeleted,
    readCommunityPostsFromMirrors,
    removeStoragePathsBestEffort,
    saveLocalCommunityPosts,
    withCommunityPostsWriteLock,
} from '@/app/services/cloud/lawyerCommunityPostsStorage';
import {
    mergeCommunityPostsById,
    normalizeCommunityPost,
    sortCommunityPosts,
} from '@/app/services/cloud/lawyerCommunityPostsMerge';

const ANONYMOUS_FORUM_AUTHOR_ID = '__anonymous__';

function resolveCommunityPostOwnerId(
    stored: CommunityPost | undefined,
    authorHint?: string,
): string {
    const fromStored = stored?.author_id ?? stored?.authorId ?? '';
    if (fromStored && fromStored !== ANONYMOUS_FORUM_AUTHOR_ID) return fromStored;
    if (authorHint && authorHint !== ANONYMOUS_FORUM_AUTHOR_ID) return authorHint;
    return fromStored || authorHint || '';
}

function canActOnCommunityPost(
    requesterId: string | undefined,
    ownerId: string,
    authorHint: string | undefined,
    requesterRole?: UserRole,
): boolean {
    if (!requesterId) return false;
    const isAdmin =
        requesterRole === UserRole.SUPER_ADMIN || requesterRole === UserRole.MODERATOR;
    if (isAdmin) return true;
    if (ownerId && requesterId === ownerId) return true;
    if (authorHint && requesterId === authorHint) return true;
    return false;
}

function mergePostsById(localPosts: CommunityPost[], remotePosts: CommunityPost[]): CommunityPost[] {
    return mergeCommunityPostsById(localPosts, remotePosts);
}

let communityKvMergeInflight: Promise<void> | null = null;

async function mergeCommunityPostsFromKvInBackground(
    localBaseline: CommunityPost[],
    deletedIds: Set<string>,
): Promise<void> {
    if (!isKvProxyNetworkEnabled()) return;
    try {
        const res = await kv.getByPrefix('community:posts:');
        const remotePosts = Array.isArray(res)
            ? res.map((p) => normalizeCommunityPost(p)).filter((p): p is CommunityPost => p !== null)
            : [];
        const merged = sortCommunityPosts(
            filterDeletedCommunityPosts(mergePostsById(localBaseline, remotePosts), deletedIds),
        );
        await saveLocalCommunityPosts(merged);
    } catch {
        /* background sync — لا نُعطّل التفاعل */
    }
}

async function findLocalCommunityPostById(postId: string): Promise<CommunityPost | null> {
    const mirrored = readCommunityPostsFromMirrors();
    const rawPosts = mirrored !== null ? mirrored : await loadLocalCommunityPosts();
    const hit = rawPosts.find((p) => p?.id === postId);
    if (!hit) return null;
    return normalizeCommunityPost(hit);
}

export const CommunityDB = {
    async listPosts(): Promise<CommunityPost[]> {
        const deletedIds = await loadDeletedCommunityPostIds();
        const mirrored = readCommunityPostsFromMirrors();
        const rawPosts = mirrored !== null ? mirrored : await loadLocalCommunityPosts();
        const localPosts = rawPosts
            .map((p) => normalizeCommunityPost(p))
            .filter((p): p is CommunityPost => p !== null);
        const withoutDeleted = filterDeletedCommunityPosts(localPosts, deletedIds);
        const sorted = sortCommunityPosts(withoutDeleted);

        if (isKvProxyNetworkEnabled() && !communityKvMergeInflight) {
            communityKvMergeInflight = mergeCommunityPostsFromKvInBackground(withoutDeleted, deletedIds).finally(
                () => {
                    communityKvMergeInflight = null;
                },
            );
        }

        return sorted;
    },

    async savePost(post: CommunityPost): Promise<void> {
        return withCommunityPostsWriteLock(async () => {
            const normalized = normalizeCommunityPost(post);
            if (!normalized) throw new Error('بيانات المنشور غير صالحة');
            const mirrored = readCommunityPostsFromMirrors();
            const localPosts = mirrored !== null ? mirrored : await loadLocalCommunityPosts();
            const merged = mergePostsById(localPosts, [normalized]).sort((a, b) => {
                const aPin = a.isPinned ? 1 : 0;
                const bPin = b.isPinned ? 1 : 0;
                return bPin - aPin || Date.parse(b.createdAt) - Date.parse(a.createdAt);
            });
            await saveLocalCommunityPosts(merged);
            if (isKvProxyNetworkEnabled()) {
                void kv.set(`community:posts:${normalized.id}`, normalized).catch(() => undefined);
            }
        });
    },

    /** حفظ دفعي آمن — يمنع فقدان منشورات عند المزامنة */
    async persistPostsBatch(posts: CommunityPost[]): Promise<void> {
        return withCommunityPostsWriteLock(async () => {
            const deletedIds = await loadDeletedCommunityPostIds();
            const normalized = posts
                .map((p) => normalizeCommunityPost(p))
                .filter((p): p is CommunityPost => p !== null);
            const filtered = filterDeletedCommunityPosts(normalized, deletedIds);
            await saveLocalCommunityPosts(sortCommunityPosts(filtered));
        });
    },

    async deletePost(postId: string): Promise<void> {
        return withCommunityPostsWriteLock(async () => {
            const existing = await findLocalCommunityPostById(postId);
            const attachmentPath = existing?.attachment?.storagePath?.trim() || null;

            await markCommunityPostDeleted(postId);
            const mirrored = readCommunityPostsFromMirrors();
            const rawPosts = mirrored !== null ? mirrored : await loadLocalCommunityPosts();
            await saveLocalCommunityPosts(rawPosts.filter((p) => p?.id !== postId));

            if (attachmentPath && !attachmentPath.startsWith('idb:forum:')) {
                void removeStoragePathsBestEffort([attachmentPath]);
            }

            if (isKvProxyNetworkEnabled()) {
                void kv.del(`community:posts:${postId}`).catch(() => undefined);
            }
        });
    },

    async saveReport(report: CommunityReport): Promise<void> {
        if (!isKvProxyNetworkEnabled()) return;
        try {
            await kv.set(`community:reports:${report.id}`, report);
        } catch {
            /* ignore */
        }
    },
};

const FORUM_BOOKMARKS_KEY = 'hami:forum:bookmarks:v1';
const DEV_SERVER_BOOKMARKS = Symbol.for('HAMI_DEV_FORUM_BOOKMARKS_V1');

type ForumBookmarkStore = Record<string, string[]>;

function getServerBookmarkStore(): ForumBookmarkStore {
    const g = globalThis as unknown as Record<symbol, ForumBookmarkStore>;
    if (!g[DEV_SERVER_BOOKMARKS] || typeof g[DEV_SERVER_BOOKMARKS] !== 'object') {
        g[DEV_SERVER_BOOKMARKS] = {};
    }
    return g[DEV_SERVER_BOOKMARKS];
}

async function loadForumBookmarkStore(): Promise<ForumBookmarkStore> {
    if (typeof window === 'undefined') {
        return getServerBookmarkStore();
    }
    try {
        const raw = await SecureStoreService.getItem(FORUM_BOOKMARKS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed as ForumBookmarkStore;
    } catch {
        return {};
    }
}

async function saveForumBookmarkStore(store: ForumBookmarkStore): Promise<void> {
    if (typeof window === 'undefined') {
        const g = globalThis as unknown as Record<symbol, ForumBookmarkStore>;
        g[DEV_SERVER_BOOKMARKS] = store;
        return;
    }
    try {
        await SecureStoreService.setItem(FORUM_BOOKMARKS_KEY, JSON.stringify(store));
    } catch {
    }
}

/** حفظ المنشورات للقراءة لاحقاً — محلي per-user (يعمل بدون Supabase). */
export const ForumBookmarkDB = {
    async listPostIds(userId: string): Promise<string[]> {
        if (!userId) return [];
        const store = await loadForumBookmarkStore();
        const ids = store[userId];
        return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
    },

    async toggle(userId: string, postId: string): Promise<boolean> {
        if (!userId || !postId) throw new Error('معرّف المستخدم أو المنشور غير صالح');
        const store = await loadForumBookmarkStore();
        const current = new Set(
            Array.isArray(store[userId]) ? store[userId].filter((id) => typeof id === 'string') : [],
        );
        let bookmarked: boolean;
        if (current.has(postId)) {
            current.delete(postId);
            bookmarked = false;
        } else {
            current.add(postId);
            bookmarked = true;
        }
        store[userId] = [...current];
        await saveForumBookmarkStore(store);
        return bookmarked;
    },
};

export async function getCommunityPosts() {
    return await CommunityDB.listPosts();
}

export async function getCommunityPostsPaginated(limit: number, offset: number): Promise<{ posts: CommunityPost[]; total: number }> {
    const all = await CommunityDB.listPosts();
    return {
        posts: all.slice(offset, offset + limit),
        total: all.length,
    };
}

export async function getCommunityPostById(postId: string): Promise<CommunityPost | null> {
    const all = await CommunityDB.listPosts();
    return all.find((p) => p.id === postId) ?? null;
}

export async function addCommunityPost(post: CommunityPost) {
    await CommunityDB.savePost(post);
}

export async function addCommunityComment(postId: string, comment: CommunityComment): Promise<CommunityPost> {
    const post = await findLocalCommunityPostById(postId);
    if (!post) throw new Error('المنشور غير موجود');
    const updated: CommunityPost = { ...post, comments: [...post.comments, comment], updatedAt: new Date().toISOString() };
    await CommunityDB.savePost(updated);
    return updated;
}

export async function deleteCommunityComment(
    postId: string,
    commentId: string,
    requesterId: string,
    requesterRole?: UserRole,
): Promise<CommunityPost> {
    const post = await findLocalCommunityPostById(postId);
    if (!post) throw new Error('المنشور غير موجود');
    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('التعليق غير موجود');
    const isAdmin =
        requesterRole === UserRole.SUPER_ADMIN || requesterRole === UserRole.MODERATOR;
    if (comment.authorId !== requesterId && post.authorId !== requesterId && !isAdmin) {
        throw new Error('ليس لديك صلاحية لحذف هذا التعليق');
    }
    const updated: CommunityPost = {
        ...post,
        comments: post.comments.filter((c) => c.id !== commentId && c.parentId !== commentId),
        updatedAt: new Date().toISOString(),
    };
    await CommunityDB.savePost(updated);
    return updated;
}

export async function editCommunityComment(
    postId: string,
    commentId: string,
    newContent: string,
    requesterId: string,
): Promise<CommunityPost> {
    const post = await findLocalCommunityPostById(postId);
    if (!post) throw new Error('المنشور غير موجود');
    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('التعليق غير موجود');
    if (comment.authorId !== requesterId) {
        throw new Error('ليس لديك صلاحية لتعديل هذا التعليق');
    }
    const trimmed = newContent.trim();
    if (trimmed.length < 2) throw new Error('نص التعليق قصير جداً');
    const updated: CommunityPost = {
        ...post,
        comments: post.comments.map((c) => (c.id === commentId ? { ...c, content: trimmed } : c)),
        updatedAt: new Date().toISOString(),
    };
    await CommunityDB.savePost(updated);
    return updated;
}

export async function deleteCommunityPost(
    postId: string,
    requesterId?: string,
    requesterRole?: UserRole,
    authorId?: string,
): Promise<void> {
    const stored = await findLocalCommunityPostById(postId);
    const ownerId = resolveCommunityPostOwnerId(stored ?? undefined, authorId);
    if (!canActOnCommunityPost(requesterId, ownerId, authorId, requesterRole)) {
        throw new Error('ليس لديك صلاحية لحذف هذا المنشور');
    }
    await CommunityDB.deletePost(postId);
}

export async function updateCommunityPost(postId: string, newContent: string, requesterId?: string) {
    const post = await findLocalCommunityPostById(postId);
    if (!post) throw new Error('المنشور غير موجود');
    const postAuthorId = post.author_id ?? post.authorId ?? '';
    if (requesterId && requesterId !== postAuthorId) {
        throw new Error('ليس لديك صلاحية لتعديل هذا المنشور');
    }
    const { buildForumEditPatch } = await import('@/app/services/forum/forumEditUtils');
    const updated: CommunityPost = {
        ...post,
        ...buildForumEditPatch(post, newContent),
    };
    await CommunityDB.savePost(updated);
    return updated;
}

export async function toggleLockCommunityPost(
    postId: string,
    locked: boolean,
    requesterId: string,
    requesterIsAdmin: boolean,
    authorHint?: string,
): Promise<CommunityPost> {
    const post = await findLocalCommunityPostById(postId);
    if (!post) throw new Error('المنشور غير موجود');
    const ownerId = resolveCommunityPostOwnerId(post, authorHint);
    const adminRole = requesterIsAdmin ? UserRole.SUPER_ADMIN : undefined;
    if (!canActOnCommunityPost(requesterId, ownerId, authorHint, adminRole)) {
        throw new Error('ليس لديك صلاحية لقفل النقاش');
    }
    const updated: CommunityPost = {
        ...post,
        isLocked: locked || undefined,
        updatedAt: new Date().toISOString(),
    };
    await CommunityDB.savePost(updated);
    return updated;
}

export async function togglePinCommunityPost(
    postId: string,
    pinned: boolean,
    requesterRole?: UserRole,
): Promise<CommunityPost> {
    if (
        requesterRole !== UserRole.SUPER_ADMIN &&
        requesterRole !== UserRole.MODERATOR
    ) {
        throw new Error('ليس لديك صلاحية تثبيت المنشورات');
    }
    const post = await findLocalCommunityPostById(postId);
    if (!post) throw new Error('المنشور غير موجود');
    const updated: CommunityPost = {
        ...post,
        isPinned: pinned || undefined,
        updatedAt: new Date().toISOString(),
    };
    await CommunityDB.savePost(updated);
    return updated;
}

// --- COMMUNITY REPORT TYPES ---

export async function reportCommunityPost(
    postId: string,
    reason: string,
    requesterId?: string,
): Promise<{ ok: boolean; postId: string; reason: string; duplicate?: boolean }> {
    if (!requesterId) {
        return { ok: true, postId, reason };
    }
    const existing = await getCommunityReports();
    if (
        existing.some(
            (r) =>
                r.postId === postId &&
                r.reporterId === requesterId &&
                r.status === 'pending',
        )
    ) {
        return { ok: false, postId, reason, duplicate: true };
    }
    const reportId = uuidv4();
    const report: CommunityReport = {
        id: reportId,
        postId,
        reporterId: requesterId,
        reason,
        createdAt: new Date().toISOString(),
        status: 'pending',
    };
    try {
        await CommunityDB.saveReport(report);
    } catch {
        // silent — الأفضل أن نكمل حتى لو فشل التخزين
    }
    return { ok: true, postId, reason };
}

export async function getCommunityReports(): Promise<CommunityReport[]> {
    try {
        const res = await kv.getByPrefix('community:reports:');
        return Array.isArray(res) ? res.filter((r): r is CommunityReport => {
            if (!r || typeof r !== 'object') return false;
            const o = r as Record<string, unknown>;
            return typeof o.id === 'string' && typeof o.postId === 'string' && typeof o.reason === 'string' && typeof o.status === 'string';
        }) : [];
    } catch {
        return [];
    }
}

export async function dismissCommunityReport(reportId: string, reviewerId: string): Promise<void> {
    try {
        const raw = await kv.get(`community:reports:${reportId}`);
        if (!raw) return;
        const report = raw as CommunityReport;
        report.status = 'dismissed';
        report.reviewedById = reviewerId;
        report.reviewedAt = new Date().toISOString();
        await kv.set(`community:reports:${reportId}`, report);
    } catch {
        // silent
    }
}

// --- BAN SYSTEM ---

export const BanDB = {
    async banUser(record: BanRecord): Promise<void> {
        await kv.set(`banned:users:${record.userId}`, record);
    },

    async unbanUser(userId: string): Promise<void> {
        await kv.del(`banned:users:${userId}`);
    },

    async isBanned(userId: string): Promise<BanRecord | null> {
        try {
            const raw = await kv.get(`banned:users:${userId}`);
            if (!raw || typeof raw !== 'object') return null;
            const r = raw as BanRecord;
            if (r.expiresAt && Date.now() > Date.parse(r.expiresAt)) {
                await kv.del(`banned:users:${userId}`);
                return null;
            }
            return r.userId ? (raw as BanRecord) : null;
        } catch {
            return null;
        }
    },

    async listBannedUsers(): Promise<BanRecord[]> {
        try {
            const res = await kv.getByPrefix('banned:users:');
            return Array.isArray(res) ? res.filter((r): r is BanRecord => {
                if (!r || typeof r !== 'object') return false;
                const o = r as Record<string, unknown>;
                return typeof o.userId === 'string';
            }) : [];
        } catch {
            return [];
        }
    },
};

// --- FOLLOW SYSTEM ---

export const FollowDB = {
    async follow(followerId: string, followingId: string): Promise<void> {
        if (followerId === followingId) return;
        const record: FollowRecord = { followerId, followingId, createdAt: new Date().toISOString() };
        await kv.set(`follow:${followerId}:${followingId}`, record);
    },

    async unfollow(followerId: string, followingId: string): Promise<void> {
        await kv.del(`follow:${followerId}:${followingId}`);
    },

    async isFollowing(followerId: string, followingId: string): Promise<boolean> {
        try {
            const raw = await kv.get(`follow:${followerId}:${followingId}`);
            return !!raw && typeof raw === 'object' && !!(raw as FollowRecord).followerId;
        } catch {
            return false;
        }
    },

    async getFollowers(userId: string): Promise<FollowRecord[]> {
        try {
            const all = await kv.getByPrefix('follow:');
            if (!Array.isArray(all)) return [];
            return all.filter((r): r is FollowRecord => {
                if (!r || typeof r !== 'object') return false;
                const o = r as Record<string, unknown>;
                return typeof o.followerId === 'string' && typeof o.followingId === 'string' && o.followingId === userId;
            }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        } catch {
            return [];
        }
    },

    async getFollowing(userId: string): Promise<FollowRecord[]> {
        try {
            const all = await kv.getByPrefix('follow:');
            if (!Array.isArray(all)) return [];
            return all.filter((r): r is FollowRecord => {
                if (!r || typeof r !== 'object') return false;
                const o = r as Record<string, unknown>;
                return typeof o.followerId === 'string' && typeof o.followingId === 'string' && o.followerId === userId;
            }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        } catch {
            return [];
        }
    },

    async getFollowerCount(userId: string): Promise<number> {
        const followers = await this.getFollowers(userId);
        return followers.length;
    },

    async getFollowingCount(userId: string): Promise<number> {
        const following = await this.getFollowing(userId);
        return following.length;
    },
};

export async function getUserPostCount(userId: string): Promise<number> {
    try {
        const posts = await CommunityDB.listPosts();
        return posts.filter((p) => (p.author_id ?? p.authorId ?? '') === userId).length;
    } catch {
        return 0;
    }
}

export async function notifyFollowers(userId: string, type: 'new_post' | 'new_document', title: string, message: string, postId?: string): Promise<void> {
    try {
        if (type === 'new_document') {
            const { dispatchFollowedUserNewDocument } = await import('@/app/services/forum/forumNotificationDispatch');
            await dispatchFollowedUserNewDocument({ authorId: userId, title, message, docId: postId });
            return;
        }
        const followers = await ForumFollowRepository.getFollowers(userId);
        for (const f of followers) {
            if (!f.notifyPosts) continue;
            const { NotificationDB } = await import('@/app/services/notifications/notificationForumStorage');
            await NotificationDB.addNotification({
                id: uuidv4(),
                userId: f.followerId,
                type,
                title,
                message,
                postId,
                read: false,
                createdAt: new Date().toISOString(),
                dedupeKey: postId ? `forum:legacy-post:${postId}:${f.followerId}` : undefined,
            });
        }
    } catch {
        // silent
    }
}
