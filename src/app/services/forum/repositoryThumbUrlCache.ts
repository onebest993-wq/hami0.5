const resolvedByPath = new Map<string, string>();

function isRepositoryImage(doc: { mimeType?: string; fileName?: string }): boolean {
    const mime = doc.mimeType ?? '';
    const name = doc.fileName ?? '';
    return mime.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(name);
}

async function resolveRepositoryThumbUrl(storagePath: string): Promise<string | null> {
    const { getForumBlobObjectUrl, parseForumIdbPath } = await import('@/app/services/forumBlobStore');
    const { LawyerStorage } = await import('@/app/services/lawyer-cloud');

    const idbKey = parseForumIdbPath(storagePath);
    if (idbKey && !idbKey.startsWith('inline:')) {
        const fromIdb = await getForumBlobObjectUrl(idbKey);
        if (fromIdb) return fromIdb;
    }
    if (!storagePath.startsWith('idb:forum:')) {
        try {
            return await LawyerStorage.getSignedUrl(storagePath);
        } catch {
            return null;
        }
    }
    return null;
}

/** تسخين مصغرات الصور في الكاش — يُستدعى بعد hydrate المستندات */
export async function warmRepositoryThumbnailUrls(
    docs: import('@/app/services/vault/vaultTypes').RepositoryDocument[],
): Promise<void> {
    if (!docs?.length) return;
    const tasks = docs
        .filter((d) => d.storagePath?.trim() && isRepositoryImage(d))
        .filter((d) => !peekRepositoryThumbUrl(d.storagePath))
        .map(async (d) => {
            const url = await resolveRepositoryThumbUrl(d.storagePath);
            if (url) cacheRepositoryThumbUrl(d.storagePath, url);
        });
    await Promise.all(tasks);
}

export function peekRepositoryThumbUrl(storagePath: string | undefined | null): string | null {
    if (!storagePath?.trim()) return null;
    return resolvedByPath.get(storagePath) ?? null;
}

export function cacheRepositoryThumbUrl(storagePath: string, url: string | null): void {
    if (!storagePath.trim() || !url) return;
    resolvedByPath.set(storagePath, url);
}

export function clearRepositoryThumbUrl(storagePath: string | undefined | null): void {
    if (!storagePath?.trim()) return;
    resolvedByPath.delete(storagePath);
}

export function resetRepositoryThumbUrlCacheForTests(): void {
    resolvedByPath.clear();
}
