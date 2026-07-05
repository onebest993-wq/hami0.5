const pathToObjectUrl = new Map<string, string>();

/** رابط فوري للمعاينة/التحميل قبل اكتمال كتابة IndexedDB */
export function registerRepositoryBlobUrl(storagePath: string, blob: Blob): string {
    const existing = pathToObjectUrl.get(storagePath);
    if (existing) return existing;
    const url = URL.createObjectURL(blob);
    pathToObjectUrl.set(storagePath, url);
    return url;
}

export function peekRepositoryBlobUrl(storagePath: string | undefined | null): string | null {
    if (!storagePath?.trim()) return null;
    return pathToObjectUrl.get(storagePath) ?? null;
}

export function releaseRepositoryBlobUrl(storagePath: string | undefined | null): void {
    if (!storagePath?.trim()) return;
    const url = pathToObjectUrl.get(storagePath);
    if (!url) return;
    URL.revokeObjectURL(url);
    pathToObjectUrl.delete(storagePath);
}

export function resetRepositoryBlobRegistryForTests(): void {
    for (const url of pathToObjectUrl.values()) {
        URL.revokeObjectURL(url);
    }
    pathToObjectUrl.clear();
}
