/** أنواع المتابعة — منفصلة عن المستودع لتجنّب سحب كود الخادم في العميل */
export type ForumFollowPrefs = {
    notifyPosts: boolean;
    notifyComments: boolean;
    notifyReplies: boolean;
};

export type ForumFollowRecord = {
    followerId: string;
    followingId: string;
    createdAt: string;
} & ForumFollowPrefs;
