import { resolveLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';

const DISPLAY_NAME_CACHE_TTL_MS = 60_000;
const displayNameCache = new Map<string, { name: string; expiresAt: number }>();

/** للاختبارات فقط */
export function resetForumAuthorResolverCacheForTests(): void {
    displayNameCache.clear();
}

function readCachedName(userId: string): string | undefined {
    const cached = displayNameCache.get(userId);
    if (!cached) return undefined;
    if (Date.now() >= cached.expiresAt) {
        displayNameCache.delete(userId);
        return undefined;
    }
    return cached.name;
}

function writeCachedName(userId: string, name: string): void {
    displayNameCache.set(userId, { name, expiresAt: Date.now() + DISPLAY_NAME_CACHE_TTL_MS });
}

async function readProfileNameFromKv(userId: string): Promise<string> {
    if (typeof window !== 'undefined') return '';
    try {
        const spec = '@/app/api/security/kvStoreAdmin.ts';
        const { kvGet } = await import(/* @vite-ignore */ spec);
        const raw = await kvGet(`profile:${userId}`);
        if (!raw || typeof raw !== 'object') return '';
        const header = (raw as { header?: { name?: unknown } }).header;
        const name = typeof header?.name === 'string' ? header.name.trim() : '';
        return name;
    } catch {
        return '';
    }
}

/** اسم العرض الموثوق من السيرفر — لا نثق بـ authorName القادم من العميل. */
export async function resolveForumAuthorDisplayName(userId: string): Promise<string> {
    if (!userId.trim()) return 'المحامي';

    const cached = readCachedName(userId);
    if (cached) return cached;

    const profileName = await readProfileNameFromKv(userId);
    const resolved = resolveLawyerDisplayName(profileName, userId);
    writeCachedName(userId, resolved);
    return resolved;
}
