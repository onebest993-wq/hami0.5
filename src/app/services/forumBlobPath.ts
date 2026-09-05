/** بادئة مسار IndexedDB للمرفقات — بلا فتح قاعدة ولا تشفير */

export const FORUM_IDB_PREFIX = 'idb:forum:';

export function buildForumIdbPath(cacheKey: string): string {
    return `${FORUM_IDB_PREFIX}${cacheKey.trim()}`;
}

export function parseForumIdbPath(path: string | undefined | null): string | null {
    if (!path?.startsWith(FORUM_IDB_PREFIX)) return null;
    const key = path.slice(FORUM_IDB_PREFIX.length).trim();
    return key || null;
}
