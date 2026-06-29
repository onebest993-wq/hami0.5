/** حدود وقيم افتراضية لشاشة المنتدى — خارج المكوّن لتفادي إعادة الإنشاء */
export const COMMUNITY_POSTS_PAGE_SIZE = 20;

/** أقصى منشورات محتفَظ بها في الذاكرة بعد التمرير (يمنع نمو غير محدود) */
export const COMMUNITY_POSTS_MAX_RETAINED = 120;

export const COMMUNITY_GROUP_POSTS_MAX_RETAINED = 80;

/** استطلاع منشورات المنتدى — أطول على الأجهزة الخفيفة */
export const COMMUNITY_FORUM_POLL_MS_DEFAULT = 90_000;
export const COMMUNITY_FORUM_POLL_MS_LITE = 180_000;

/** دفعات إحصاءات المستخدمين الظاهرين فقط */
export const COMMUNITY_USER_STATS_VISIBLE_LIMIT = 40;
export const COMMUNITY_USER_STATS_COMMENTS_PER_POST = 5;
export const COMMUNITY_USER_STATS_DEBOUNCE_MS = 450;
export const COMMUNITY_USER_STATS_BATCH_LIMIT = 36;

export const FORUM_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export const VOICE_POST_DEFAULT_CONTENT = 'استشارة صوتية — استمع للمقطع المرفق.';

export const VOICE_RECORD_MAX_SEC = 180;
