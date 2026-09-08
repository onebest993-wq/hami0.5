/** نص عادي من HTML للبحث والمقتطفات والحفظ — بلا DOM ولا DOMPurify. */
const REPOSITORY_DANGEROUS_BLOCK_TAGS = /<(script|iframe|object|embed|style|link|meta|base)\b[\s\S]*?<\/\1>/gi;
const REPOSITORY_STRIP_HTML_TAGS = /<[^>]+>/g;

export function stripRepositoryHtml(text: string): string {
    if (typeof text !== 'string') return '';
    return text
        .replace(REPOSITORY_DANGEROUS_BLOCK_TAGS, ' ')
        .replace(REPOSITORY_STRIP_HTML_TAGS, ' ')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();
}
