import type { CommunityAttachment, CommunityComment, CommunityPost } from '@/app/services/forum/forumTypes';
import { isSafeForumAttachmentUrl } from '@/app/services/forum/forumUrlSafety';

/** معرّف خادم فقط — لا يُقبل معرّف من العميل في مسارات الإنشاء. */
export function mintForumEntityId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `forum_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function sanitizeAttachment(raw: CommunityPost['attachment']): CommunityAttachment | null {
    if (!raw || typeof raw !== 'object') return null;
    const type =
        raw.type === 'image' ? 'image' : raw.type === 'document' ? 'document' : raw.type === 'audio' ? 'audio' : null;
    const url = typeof raw.url === 'string' ? raw.url.trim() : '';
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    const storagePath = typeof raw.storagePath === 'string' ? raw.storagePath.trim() : '';
    const hasDurableStorage = storagePath.length > 0;
    if (!type || !name || (!url && !hasDurableStorage) || (url && !isSafeForumAttachmentUrl(url))) {
        return null;
    }
    return {
        type,
        ...(url ? { url } : {}),
        name,
        mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : undefined,
        storagePath: storagePath || undefined,
    };
}

/**
 * يبني منشوراً آمناً للإنشاء — يزيل حقول الصلاحيات/التصويت/التعليقات المحقونة من العميل،
 * ويولّد معرّفاً جديداً دائماً (يمنع overwrite عبر upsert بمعرّف مهاجم).
 */
export function sanitizeCommunityPostForCreate(post: CommunityPost, authorId: string): CommunityPost {
    const now = new Date().toISOString();
    const tags = Array.isArray(post.tags)
        ? post.tags
              .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
              .map((tag) => tag.trim())
              .slice(0, 12)
        : [];

    return {
        id: mintForumEntityId(),
        authorId,
        author_id: authorId,
        authorName: typeof post.authorName === 'string' ? post.authorName.trim() : '',
        content: typeof post.content === 'string' ? post.content.trim() : '',
        tags,
        createdAt: now,
        updatedAt: now,
        attachment: sanitizeAttachment(post.attachment),
        upvoterIds: [],
        comments: [],
        bestCommentId: null,
        isUrgent: post.isUrgent === true ? true : undefined,
        isAnonymous: post.isAnonymous === true ? true : undefined,
        isEdited: undefined,
        isPinned: undefined,
        isLocked: undefined,
        groupId: typeof post.groupId === 'string' && post.groupId.trim() ? post.groupId.trim() : undefined,
    };
}

/**
 * يبني تعليقاً آمناً — معرّف خادم + طوابع زمنية خادم، يتجاهل id/createdAt من العميل.
 */
export function sanitizeCommunityCommentForCreate(input: {
    postId: string;
    authorId: string;
    authorName: string;
    content: string;
    parentId?: string;
}): CommunityComment {
    const content = input.content.trim();
    return {
        id: mintForumEntityId(),
        postId: input.postId,
        authorId: input.authorId,
        authorName: input.authorName.trim(),
        content,
        createdAt: new Date().toISOString(),
        parentId: input.parentId?.trim() || undefined,
    };
}
