/** نص عادي من HTML للبحث والمقتطفات والحفظ — بلا DOM. */
export function stripRepositoryHtml(text: string): string {
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
