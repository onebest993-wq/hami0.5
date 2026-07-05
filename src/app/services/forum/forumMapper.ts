import type { CommunityComment, CommunityPost } from '@/app/services/forum/forumTypes';

/** القيمة المجهولة الموحّدة عند النشر المجهول (للحماية من تسريب الهوية) */
export const ANONYMOUS_USER_ID = '__anonymous__';
export const ANONYMOUS_USER_NAME = 'زميل مجهول';

/** اسم العرض الآمن في الإشعارات والرسائل العامة */
export function forumAuthorDisplayName(post: Pick<CommunityPost, 'isAnonymous' | 'authorName'>): string {
    return post.isAnonymous ? ANONYMOUS_USER_NAME : post.authorName;
}

/**
 * يُخفي هوية المؤلف عند `isAnonymous=true` لكل من ليس المؤلف ولا أدمن.
 *
 * يُخفي أيضاً هوية المعلّقين الذين هم أنفسهم صاحب المنشور المجهول
 * (وإلا انكشف أن «الناشر المجهول» = «المعلّق ذو الاسم الفلاني»).
 *
 * استثناءات (لا يُخفى عنهم):
 * - صاحب المنشور نفسه (يحتاج معرفة هويته لزر التعديل/الحذف)
 * - الأدمن (للإشراف)
 *
 * يُستخدم في كل مكان يخرج فيه CommunityPost من الـ repo قبل وصوله للمشاهد.
 */
export function redactAnonymousAuthor(
    post: CommunityPost,
    viewerId: string | null,
    viewerIsAdmin: boolean,
): CommunityPost {
    if (!post.isAnonymous) return post;
    const realAuthorId = post.authorId;
    const isOwner = viewerId !== null && viewerId === realAuthorId;
    if (isOwner || viewerIsAdmin) return post;

    const redactedComments = post.comments.map((c) => {
        // التعليق من صاحب المنشور نفسه → يجب إخفاؤه لمنع كشف الهوية بالاستنتاج
        if (c.authorId === realAuthorId) {
            return {
                ...c,
                authorId: ANONYMOUS_USER_ID,
                authorName: ANONYMOUS_USER_NAME,
                author_id: ANONYMOUS_USER_ID,
            };
        }
        return c;
    });

    return {
        ...post,
        authorId: ANONYMOUS_USER_ID,
        authorName: ANONYMOUS_USER_NAME,
        author_id: ANONYMOUS_USER_ID,
        comments: redactedComments,
    };
}

export type ForumPostRow = {
    id: string;
    author_id: string;
    author_name: string;
    content: string;
    tags: string[] | null;
    attachment: unknown | null;
    upvoter_ids: string[] | null;
    best_comment_id: string | null;
    is_urgent: boolean;
    is_anonymous: boolean;
    is_edited: boolean;
    is_pinned: boolean;
    is_locked?: boolean | null;
    group_id?: string | null;
    created_at: string;
    updated_at: string;
};

export type ForumCommentRow = {
    id: string;
    post_id: string;
    author_id: string;
    author_name: string;
    content: string;
    parent_id: string | null;
    created_at: string;
};

/** خريطة upvotes للتعليقات: commentId → Set<userId> */
export type CommentUpvoteMap = Map<string, string[]>;

function parseAttachment(raw: unknown): CommunityPost['attachment'] {
    if (!raw || typeof raw !== 'object') return null;
    const a = raw as Record<string, unknown>;
    const type =
        a.type === 'image' ? 'image' : a.type === 'document' ? 'document' : a.type === 'audio' ? 'audio' : null;
    const url = typeof a.url === 'string' ? a.url : null;
    const name = typeof a.name === 'string' ? a.name : null;
    if (!type || !url || !name) return null;
    return {
        type,
        url,
        name,
        mimeType: typeof a.mimeType === 'string' ? a.mimeType : undefined,
        storagePath: typeof a.storagePath === 'string' ? a.storagePath : undefined,
    };
}

export function commentRowToCommunity(
    c: ForumCommentRow,
    upvoterIds: string[] = [],
): CommunityComment {
    return {
        id: c.id,
        postId: c.post_id,
        authorId: c.author_id,
        author_id: c.author_id,
        authorName: c.author_name,
        content: c.content,
        createdAt: c.created_at,
        parentId: c.parent_id ?? undefined,
        upvoterIds,
    };
}

export function postRowToCommunity(
    row: ForumPostRow,
    comments: ForumCommentRow[],
    commentUpvotes: CommentUpvoteMap = new Map(),
): CommunityPost {
    return {
        id: row.id,
        authorId: row.author_id,
        author_id: row.author_id,
        authorName: row.author_name,
        content: row.content,
        tags: Array.isArray(row.tags) ? row.tags : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        attachment: parseAttachment(row.attachment),
        upvoterIds: Array.isArray(row.upvoter_ids) ? row.upvoter_ids : [],
        comments: comments.map((c) => commentRowToCommunity(c, commentUpvotes.get(c.id) ?? [])),
        bestCommentId: row.best_comment_id,
        isUrgent: row.is_urgent || undefined,
        isAnonymous: row.is_anonymous || undefined,
        isEdited: row.is_edited || undefined,
        isPinned: row.is_pinned || undefined,
        isLocked: row.is_locked || undefined,
        groupId: row.group_id ?? undefined,
    };
}

export function communityPostToInsertRow(post: CommunityPost): Record<string, unknown> {
    return {
        id: post.id,
        author_id: post.authorId,
        author_name: post.authorName,
        content: post.content,
        tags: post.tags ?? [],
        attachment: post.attachment ?? null,
        upvoter_ids: post.upvoterIds ?? [],
        best_comment_id: post.bestCommentId ?? null,
        is_urgent: post.isUrgent === true,
        is_anonymous: post.isAnonymous === true,
        is_edited: post.isEdited === true,
        is_pinned: post.isPinned === true,
        is_locked: post.isLocked === true,
        group_id: post.groupId ?? null,
        created_at: post.createdAt,
        updated_at: post.updatedAt,
    };
}
