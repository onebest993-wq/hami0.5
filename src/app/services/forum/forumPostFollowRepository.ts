import { getForumSupabaseAdmin } from './supabaseAdmin';

const LOCAL_KEY = 'hami:forum:post-sub:v1';

export type PostSubscription = {
    userId: string;
    postId: string;
    createdAt: string;
};

async function loadLocal(): Promise<PostSubscription[]> {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as PostSubscription[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function saveLocal(rows: PostSubscription[]): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
    } catch {
        /* silent */
    }
}

export const ForumPostFollowRepository = {
    async subscribe(userId: string, postId: string): Promise<PostSubscription> {
        const createdAt = new Date().toISOString();
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const rows = await loadLocal();
            const next = rows.filter((r) => !(r.userId === userId && r.postId === postId));
            next.unshift({ userId, postId, createdAt });
            await saveLocal(next);
            return { userId, postId, createdAt };
        }
        const { error } = await admin.from('forum_post_subscriptions').upsert(
            { user_id: userId, post_id: postId, created_at: createdAt },
            { onConflict: 'user_id,post_id' },
        );
        if (error) throw new Error(error.message);
        return { userId, postId, createdAt };
    },

    async unsubscribe(userId: string, postId: string): Promise<void> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const rows = await loadLocal();
            await saveLocal(rows.filter((r) => !(r.userId === userId && r.postId === postId)));
            return;
        }
        const { error } = await admin
            .from('forum_post_subscriptions')
            .delete()
            .eq('user_id', userId)
            .eq('post_id', postId);
        if (error) throw new Error(error.message);
    },

    async isSubscribed(userId: string, postId: string): Promise<boolean> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const rows = await loadLocal();
            return rows.some((r) => r.userId === userId && r.postId === postId);
        }
        const { data } = await admin
            .from('forum_post_subscriptions')
            .select('user_id')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .maybeSingle();
        return Boolean(data);
    },

    async listPostIdsForUser(userId: string): Promise<string[]> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            return (await loadLocal()).filter((r) => r.userId === userId).map((r) => r.postId);
        }
        const { data } = await admin
            .from('forum_post_subscriptions')
            .select('post_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (!data) return [];
        return (data as Array<{ post_id: string }>).map((r) => r.post_id);
    },

    async getSubscribers(postId: string): Promise<PostSubscription[]> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            return (await loadLocal()).filter((r) => r.postId === postId);
        }
        const { data } = await admin
            .from('forum_post_subscriptions')
            .select('*')
            .eq('post_id', postId);
        if (!data) return [];
        return (data as Array<Record<string, unknown>>).map((row) => ({
            userId: String(row.user_id),
            postId: String(row.post_id),
            createdAt: String(row.created_at ?? new Date().toISOString()),
        }));
    },
};
