/**
 * كتم المستخدمين — مسار fallback المحلي: تكرار آمن (idempotent)،
 * إزالة صحيحة، ومنع كتم النفس.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../loadForumSupabaseAdmin', () => ({
    loadForumSupabaseAdmin: async () => null,
    isForumSupabaseConfigured: () => false,
}));

import { ForumMuteRepository } from '../forumMuteRepository';

const MUTER = 'muter-1';

beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
});

describe('ForumMuteRepository (fallback محلي)', () => {
    it('كتم متكرر لنفس المستخدم لا يُنشئ تكراراً', async () => {
        await ForumMuteRepository.mute(MUTER, 'target');
        await ForumMuteRepository.mute(MUTER, 'target');
        const list = await ForumMuteRepository.listMuted(MUTER);
        expect(list.filter((id) => id === 'target')).toHaveLength(1);
    });

    it('isMutedBy يعكس الحالة بدقة', async () => {
        expect(await ForumMuteRepository.isMutedBy(MUTER, 'target')).toBe(false);
        await ForumMuteRepository.mute(MUTER, 'target');
        expect(await ForumMuteRepository.isMutedBy(MUTER, 'target')).toBe(true);
    });

    it('unmute يزيل المستخدم دون التأثير على غيره', async () => {
        await ForumMuteRepository.mute(MUTER, 'a');
        await ForumMuteRepository.mute(MUTER, 'b');
        await ForumMuteRepository.unmute(MUTER, 'a');
        const list = await ForumMuteRepository.listMuted(MUTER);
        expect(list).toContain('b');
        expect(list).not.toContain('a');
    });

    it('يتجاهل كتم النفس', async () => {
        await ForumMuteRepository.mute(MUTER, MUTER);
        expect(await ForumMuteRepository.listMuted(MUTER)).toHaveLength(0);
    });

    it('unmute لغير مكتوم لا يرمي خطأ', async () => {
        await expect(ForumMuteRepository.unmute(MUTER, 'never-muted')).resolves.toBeUndefined();
    });
});
