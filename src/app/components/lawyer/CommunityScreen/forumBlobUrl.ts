export function revokeForumBlobUrl(url: string | null | undefined): void {
    if (!url?.startsWith('blob:')) return;
    try {
        URL.revokeObjectURL(url);
    } catch {
        /* ignore */
    }
}
