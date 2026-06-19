export type ForumGroupRole = 'admin' | 'member';

export type ForumGroup = {
    id: string;
    name: string;
    description: string;
    coverImage?: string | null;
    creatorId: string;
    isOfficial: boolean;
    createdAt: string;
    memberCount: number;
    isMember: boolean;
    viewerRole?: ForumGroupRole | null;
};

export type ForumGroupMember = {
    id: string;
    groupId: string;
    lawyerId: string;
    role: ForumGroupRole;
    joinedAt: string;
};

export type ForumGroupRow = {
    id: string;
    name: string;
    description: string | null;
    cover_image: string | null;
    creator_id: string;
    is_official: boolean;
    created_at: string;
};

export type ForumGroupMemberRow = {
    id: string;
    group_id: string;
    lawyer_id: string;
    role: ForumGroupRole;
    joined_at: string;
};

export type CreateForumGroupInput = {
    name: string;
    description: string;
    coverImage?: string | null;
    isOfficial?: boolean;
};
