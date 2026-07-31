import { loadForumSupabaseAdmin } from './loadForumSupabaseAdmin';

const LOCAL_KEY_PREFIX = 'hami:forum:muted-users:v1';

function localKey(muterId: string): string {
    return `${LOCAL_KEY_PREFIX}:${muterId}`;
}

function loadLocalMutes(muterId: string): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(localKey(muterId));
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

function saveLocalMutes(muterId: string, ids: string[]): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(localKey(muterId), JSON.stringify([...new Set(ids)]));
    } catch {
        /* quota */
    }
}

/**
 * كتم المستخدمين على الخادم — يُخفي إشعارات المكتومين ويُزامن عبر الأجهزة.
 * fallback محلي (localStorage) عند غياب Supabase admin (تطوير/أوفلاين).
 */
export const ForumMuteRepository = {
    async listMuted(muterId: string): Promise<string[]> {
        if (!muterId) return [];
        const admin = await loadForumSupabaseAdmin();
        if (!admin) return loadLocalMutes(muterId);
        const { data, error } = await admin
            .from('forum_mutes')
            .select('muted_id')
            .eq('muter_id', muterId);
        if (error || !data) return [];
        return (data as { muted_id: string }[]).map((r) => r.muted_id);
    },

    async mute(muterId: string, mutedId: string): Promise<void> {
        if (!muterId || !mutedId || muterId === mutedId) return;
        const admin = await loadForumSupabaseAdmin();
        if (!admin) {
            const next = [...loadLocalMutes(muterId), mutedId];
            saveLocalMutes(muterId, next);
            return;
        }
        const { error } = await admin
            .from('forum_mutes')
            .upsert({ muter_id: muterId, muted_id: mutedId }, { onConflict: 'muter_id,muted_id' });
        if (error) throw new Error(error.message);
    },

    async unmute(muterId: string, mutedId: string): Promise<void> {
        if (!muterId || !mutedId) return;
        const admin = await loadForumSupabaseAdmin();
        if (!admin) {
            saveLocalMutes(
                muterId,
                loadLocalMutes(muterId).filter((id) => id !== mutedId),
            );
            return;
        }
        const { error } = await admin
            .from('forum_mutes')
            .delete()
            .eq('muter_id', muterId)
            .eq('muted_id', mutedId);
        if (error) throw new Error(error.message);
    },

    async isMutedBy(muterId: string, mutedId: string): Promise<boolean> {
        if (!muterId || !mutedId || muterId === mutedId) return false;
        const admin = await loadForumSupabaseAdmin();
        if (!admin) return loadLocalMutes(muterId).includes(mutedId);
        const { data } = await admin
            .from('forum_mutes')
            .select('muted_id')
            .eq('muter_id', muterId)
            .eq('muted_id', mutedId)
            .maybeSingle();
        return Boolean(data);
    },
};
