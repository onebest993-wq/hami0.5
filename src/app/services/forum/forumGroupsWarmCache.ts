import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import { ForumApiService } from '@/app/services/forumApiService';

let cached: ForumGroup[] | null = null;
let inflight: Promise<ForumGroup[]> | null = null;

export function peekForumGroupsCache(): ForumGroup[] | null {
    return cached;
}

export function setForumGroupsCache(rows: ForumGroup[]): void {
    cached = rows;
}

/** تسخين قائمة المجموعات للفتح الفوري عند تبويب المجموعات المحفوظ */
export function warmForumGroupsCache(query = ''): void {
    if (typeof window === 'undefined') return;
    if (inflight) return;
    inflight = ForumApiService.listGroups(query)
        .then((rows) => {
            if (!query.trim()) cached = rows;
            return rows;
        })
        .catch(() => cached ?? [])
        .finally(() => {
            inflight = null;
        });
}
