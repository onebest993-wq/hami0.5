/**
 * مفاتيح عدّ المقر التي إن فشلت لا تُعرض صفراً كواقع.
 * قائمة واحدة للخادم والواجهة.
 */
export const HQ_STATUS_CONTENT_GAP_KEYS = [
    'usersTotal',
    'usersFrozen',
    'usersLocked',
    'usersActive',
    'usersLawyer',
    'usersModerator',
    'usersAdmin',
    'usersNew24h',
    'usersNew7d',
    'pendingVerification',
    'pendingReports',
    'pendingCommentReports',
    'forumPosts',
    'forumComments',
    'forumBans',
    'forumBansActive',
    'forumDocuments',
    'forumPinned',
    'forumLocked',
] as const;

export type HqStatusContentGapKey = (typeof HQ_STATUS_CONTENT_GAP_KEYS)[number];
