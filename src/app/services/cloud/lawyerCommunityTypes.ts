export type CommunityAttachment = {
    type: 'image' | 'document' | 'audio';
    url?: string;
    name: string;
    mimeType?: string;
    storagePath?: string;
};

export type ForumEditHistoryEntry = {
    content: string;
    editedAt: string;
};

export type CommunityComment = {
    id: string;
    postId: string;
    authorId: string;
    author_id?: string;
    authorName: string;
    content: string;
    createdAt: string;
    parentId?: string;
    upvoterIds?: string[];
};

export type CommunityPost = {
    id: string;
    authorId: string;
    author_id?: string;
    authorName: string;
    content: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    attachment: CommunityAttachment | null;
    upvoterIds: string[];
    comments: CommunityComment[];
    bestCommentId?: string | null;
    isUrgent?: boolean;
    isAnonymous?: boolean;
    isEdited?: boolean;
    editCount?: number;
    editHistory?: ForumEditHistoryEntry[];
    isPinned?: boolean;
    isLocked?: boolean;
    groupId?: string | null;
};

export type NotificationType =
    | 'comment'
    | 'reply'
    | 'upvote'
    | 'best_answer'
    | 'report_update'
    | 'system'
    | 'new_post'
    | 'new_document'
    | 'follow'
    | 'mention';

export type ForumNotification = {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    postId?: string;
    read: boolean;
    createdAt: string;
    dedupeKey?: string;
    activityCount?: number;
};

export type BanRecord = {
    userId: string;
    userName: string;
    reason: string;
    bannedBy: string;
    bannedAt: string;
    expiresAt?: string;
};

export type CommunityReport = {
    id: string;
    postId: string;
    reporterId: string;
    reason: string;
    createdAt: string;
    status: 'pending' | 'dismissed' | 'resolved';
    reviewedById?: string;
    reviewedAt?: string;
};

export type FollowRecord = {
    followerId: string;
    followingId: string;
    createdAt: string;
};
