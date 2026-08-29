/**
 * بديل خادمي لـ isomorphic-dompurify داخل حزمة Vercel فقط.
 * isomorphic-dompurify يسحب jsdom فيُسقط الدالة (ENOENT / ERR_REQUIRE_ESM).
 * السلوك مطابق لإعداد المقر: ALLOWED_TAGS فارغ مع KEEP_CONTENT — نزع الوسوم والإبقاء على النص.
 */
function stripTags(value: string): string {
    return value.replace(/<[^>]*>/g, '');
}

const nodeDomPurifyStub = {
    sanitize(dirty: string): string {
        return stripTags(String(dirty ?? ''));
    },
};

export default nodeDomPurifyStub;
