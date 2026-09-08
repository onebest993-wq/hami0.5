export const FORUM_POST_MAX_LENGTH = 10_000;
export const FORUM_TAGS_MAX_LENGTH = 200;
export const FORUM_ACTOR_LABEL_MAX = 80;
export const FORUM_REPORT_REASON_MAX = 500;

/**
 * المرحلة 0: إزالة dangerous tags بمحتواها كاملاً قبل أي معالجة أخرى.
 * يشمل: script / style / iframe / svg / object / embed / noscript / template
 */
const FORUM_DANGEROUS_BLOCK_TAGS =
    /<(script|style|iframe|svg|object|embed|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi;
/** المرحلة 1: إزالة جميع أقواس وسوم HTML المتبقية بما في ذلك self-closing. */
const STRIP_FORUM_HTML_TAGS = /<\/?[^>]+>/g;
const FORUM_C0_EXCEPT_WHITESPACE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function clampForumText(value: string, max: number): string {
    return value.slice(0, max);
}

/**
 * إزالة جميع وسوم HTML الصريحة (XSS الطبقة الأولى — مرحلتين).
 * المرحلة 0: dangerous blocks كاملة مع محتواها. المرحلة 1: باقي tags (نحتفظ بالنص الداخلي غير الخطير).
 */
export function stripForumHtml(raw: string): string {
    if (!raw) return '';
    return raw.replace(FORUM_DANGEROUS_BLOCK_TAGS, '').replace(STRIP_FORUM_HTML_TAGS, '');
}

export function sanitizeForumPostContent(content: string): string {
    /* XSS طبقة 1: إزالة وسوم HTML — نص المنشور يُعرض كنص React، لا نسمح بأي tags */
    const noHtml = stripForumHtml(content);
    /* XSS طبقة 2: إزالة null/C0 عدا الأسطر البيضاء الشائعة */
    const cleaned = noHtml.replace(FORUM_C0_EXCEPT_WHITESPACE, '');
    /* XSS طبقة 3: تقصير حجم النص + trim */
    return clampForumText(cleaned.trim(), FORUM_POST_MAX_LENGTH);
}

export function sanitizeForumTagsInput(tags: string): string {
    /* XSS طبقة 1: إزالة وسوم HTML كاملة */
    const noHtml = stripForumHtml(tags);
    /* XSS طبقة 2: C0 + دفاع مضاعف ضد أقواس الوسوم المتبقية */
    const cleaned = noHtml.replace(FORUM_C0_EXCEPT_WHITESPACE, '').replace(/[<>]/g, '');
    /* XSS طبقة 3: تقصير حجم الوسوم + trim */
    return clampForumText(cleaned.trim(), FORUM_TAGS_MAX_LENGTH);
}

/** اسم ظاهر في إشعار متابعة — بلا وسوم ولا محارف تحكم */
export function sanitizeForumActorLabel(name: string): string {
    return clampForumText(sanitizeForumTagsInput(name), FORUM_ACTOR_LABEL_MAX);
}

export function sanitizeForumReportReason(reason: string): string {
    return clampForumText(sanitizeForumPostContent(reason), FORUM_REPORT_REASON_MAX);
}
