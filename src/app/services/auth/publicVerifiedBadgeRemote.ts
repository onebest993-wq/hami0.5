import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { isPublicVerifiedBadgeSubject } from '@/app/services/auth/publicVerifiedBadgeStore';

const MAX_IDS = 40;

export async function fetchPublicVerifiedBadges(userIds: string[]): Promise<Record<string, boolean>> {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const raw of userIds) {
        const id = String(raw ?? '').trim();
        if (!id || seen.has(id) || !isPublicVerifiedBadgeSubject(id)) continue;
        seen.add(id);
        ids.push(id);
        if (ids.length >= MAX_IDS) break;
    }
    if (ids.length === 0) return {};
    const data = await SecureAPIClient.fetchSecure<{
        ok?: boolean;
        badges?: Record<string, unknown>;
        shown?: unknown;
        userId?: unknown;
    }>(`/api/auth/public-verified-badge?ids=${encodeURIComponent(ids.join(','))}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });
    const out: Record<string, boolean> = {};
    for (const id of ids) out[id] = false;
    const badges = data?.badges;
    if (badges && typeof badges === 'object') {
        for (const id of ids) {
            out[id] = badges[id] === true;
        }
    } else if (ids.length === 1 && data?.shown === true) {
        out[ids[0]!] = true;
    }
    return out;
}
