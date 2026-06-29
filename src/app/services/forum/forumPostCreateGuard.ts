import type { CommunityAttachment, CommunityPost } from '@/app/services/lawyer-cloud';

const BLOCKED_URL_SCHEMES = /^(javascript|data:text\/html|vbscript):/i;

function isSafeExternalUrl(url: string): boolean {
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('data:')) return trimmed.startsWith('data:image/') || trimmed.startsWith('data:audio/');
    if (trimmed.startsWith('blob:')) return true;
    if (BLOCKED_URL_SCHEMES.test(trimmed)) return false;
    return true;
}

function sanitizeAttachment(raw: CommunityPost['attachment']): CommunityAttachment | null {
    if (!raw || typeof raw !== 'object') return null;
    const type =
        raw.type === 'image' ? 'image' : raw.type === 'document' ? 'document' : raw.type === 'audio' ? 'audio' : null;
    const url = typeof raw.url === 'string' ? raw.url.trim() : '';
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!type || !url || !name || !isSafeExternalUrl(url)) return null;
    return {
        type,
        url,
        name,
        mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : undefined,
        storagePath: typeof raw.storagePath === 'string' ? raw.storagePath : undefined,
    };
}

/**
 * يبني منشوراً آمناً للإنشاء — يزيل حقول الصلاحيات/التصويت/التعليقات المحقونة من العميل.
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
        id: typeof post.id === 'string' && post.id.trim() ? post.id.trim() : now,
        authorId,
        author_id: authorId,
        authorName: typeof post.authorName === 'string' ? post.authorName.trim() : '',
        content: typeof post.content === 'string' ? post.content.trim() : '',
        tags,
        createdAt: typeof post.createdAt === 'string' && post.createdAt.trim() ? post.createdAt : now,
        updatedAt: typeof post.updatedAt === 'string' && post.updatedAt.trim() ? post.updatedAt : now,
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
