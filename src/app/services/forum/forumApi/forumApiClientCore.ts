import { SecureAPIClient, SecureFetchError } from '@/app/services/SecureAPIClient';
import { supabase } from '@/app/lib/supabase-client';
import { BanDB, CommunityDB } from '@/app/services/forum/forumCommunityRuntime';
import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { canReachProtectedServerNetwork } from '@/app/services/secureApiNetworkFeatures';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';
import { humanizeUnknownError, isSilentOfflineError } from '@/app/utils/humanizeAppError';
import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';
import { getLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { isShellDemoUserId } from '@/app/services/auth/shellAuth';

export type ForumApiOk<T> = { ok: true } & T;
export type ForumApiErr = { ok: false; error?: string };

export async function forumApiPostJson<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const res = await SecureAPIClient.fetchSecure<T & ForumApiErr>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (res && typeof res === 'object' && (res as ForumApiErr).ok === false) {
        const message = (res as ForumApiErr).error?.trim() || 'تعذّر تنفيذ العملية';
        throw new SecureFetchError(message, 400, JSON.stringify(res), endpoint);
    }
    return res as T;
}

export async function persistForumPostLocally(post: CommunityPost): Promise<void> {
    await CommunityDB.savePost(post);
}

export async function removeForumPostLocally(postId: string): Promise<void> {
    await CommunityDB.deletePost(postId);
}

function liveNetworkUserId(): string | null {
    const id = getLiveAuthUserId()?.trim() || null;
    if (!id || isShellDemoUserId(id)) return null;
    return id;
}

export async function getForumSessionUserId(explicitUserId?: string | null): Promise<string | null> {
    if (explicitUserId) return explicitUserId;
    if (isBffAuthEnabled()) {
        const live = liveNetworkUserId();
        if (live) return live;
    }
    const { data } = await supabase.auth.getSession();
    const fromSession = data.session?.user?.id ?? null;
    if (fromSession) return fromSession;
    return readPersistedSupabaseAuth().user?.id ?? null;
}

export async function hasForumRemoteSession(): Promise<boolean> {
    const explicit = liveNetworkUserId();
    if (explicit) {
        const persisted = readPersistedSupabaseAuth();
        const meta = (persisted.user?.user_metadata ?? null) as Record<string, unknown> | null;
        return canReachProtectedServerNetwork(explicit, meta);
    }
    if (isBffAuthEnabled()) {
        return false;
    }
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id ?? readPersistedSupabaseAuth().user?.id ?? null;
    const meta = (data.session?.user?.user_metadata ??
        readPersistedSupabaseAuth().user?.user_metadata ??
        null) as Record<string, unknown> | null;
    return canReachProtectedServerNetwork(userId, meta);
}

export function parseForumApiError(err: unknown): string {
    if (isSilentOfflineError(err)) return '';
    const humanized = humanizeUnknownError(err);
    if (humanized) return humanized;
    if (err instanceof SecureFetchError) {
        try {
            const body = JSON.parse(err.bodyText) as { error?: string; code?: string };
            if (body.code === 'FORUM_AUTH_REQUIRED' && body.error?.trim()) {
                return body.error.trim();
            }
            if (typeof body.error === 'string' && body.error.trim()) return body.error.trim();
        } catch {
            /* ignore */
        }
        if (err.status === 403) return 'تعذّر تنفيذ العملية — تحقق من الصلاحيات أو أعد المحاولة';
        if (err.status === 401) return 'يجب تسجيل الدخول بحساب حقيقي للمشاركة في المنتدى';
    }
    return 'تعذّر تنفيذ العملية';
}

export function shouldRethrowForumMutationError(err: unknown): boolean {
    if (!(err instanceof SecureFetchError)) return false;
    if (err.status === 401) return true;
    if (err.status === 403) return true;
    if (err.status === 429) return true;
    return false;
}

export function sliceForumPostsPage(
    posts: CommunityPost[],
    limit: number,
    offset: number,
): { posts: CommunityPost[]; total: number } {
    return { posts: posts.slice(offset, offset + limit), total: posts.length };
}

export async function withForumReadFallback<T>(
    apiCall: () => Promise<T>,
    fallback: () => Promise<T>,
): Promise<T> {
    try {
        return await apiCall();
    } catch (err) {
        if (err instanceof SecureFetchError && err.status === 401) {
            return await fallback();
        }
        if (err instanceof SecureFetchError && err.status === 403) {
            throw err;
        }
        return await fallback();
    }
}

export async function withForumMutationFallback<T>(
    apiCall: () => Promise<T>,
    fallback: () => Promise<T>,
    options?: { userId?: string | null },
): Promise<T> {
    try {
        return await apiCall();
    } catch (err) {
        if (shouldRethrowForumMutationError(err)) throw err;
        if (options?.userId) {
            const record = await BanDB.isBanned(options.userId);
            if (record) {
                throw new SecureFetchError('حسابك محظور من المنتدى', 403, '', '');
            }
        }
        try {
            return await fallback();
        } catch {
            throw new Error(parseForumApiError(err));
        }
    }
}
