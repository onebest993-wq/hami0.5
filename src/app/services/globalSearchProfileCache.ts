import { ProfileDB } from '@/app/services/cloud/lawyerProfileCloud';

const profileLineCache = new Map<string, string>();

function formatProfileLine(
    profile: Awaited<ReturnType<typeof ProfileDB.getProfile>> | null,
): string {
    if (!profile) return '';
    return [
        profile.header.name,
        profile.header.title,
        profile.header.workplace,
        profile.header.specialization,
        profile.header.city,
    ]
        .filter(Boolean)
        .join(' — ');
}

export function getCachedProfileLine(userId: string | null): string {
    if (!userId) return '';
    return profileLineCache.get(userId) ?? '';
}

export async function resolveProfileLine(userId: string | null): Promise<string> {
    if (!userId) return '';
    const cached = profileLineCache.get(userId);
    if (cached) return cached;
    const profile = await ProfileDB.getProfile(userId).catch(() => null);
    const line = formatProfileLine(profile);
    if (line) profileLineCache.set(userId, line);
    return line;
}

export function invalidateProfileLineCache(userId?: string | null): void {
    if (!userId) {
        profileLineCache.clear();
        return;
    }
    profileLineCache.delete(userId);
}
