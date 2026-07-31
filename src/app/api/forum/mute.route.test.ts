import { beforeEach, describe, expect, it, vi } from 'vitest';

const muteMock = vi.fn();
const unmuteMock = vi.fn();
const isMutedByMock = vi.fn();
const listMutedMock = vi.fn();

vi.mock('../../services/forum/forumMuteRepository.ts', () => ({
    ForumMuteRepository: {
        mute: (...args: unknown[]) => muteMock(...args),
        unmute: (...args: unknown[]) => unmuteMock(...args),
        isMutedBy: (...args: unknown[]) => isMutedByMock(...args),
        listMuted: (...args: unknown[]) => listMutedMock(...args),
    },
}));

const rateLimitMock = vi.fn();
vi.mock('../../services/forum/forumRateLimitServer.ts', () => ({
    checkForumActionRateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));

vi.mock('../security/sanitizer.ts', () => ({
    sanitizePayload: (v: unknown) => v,
}));

const requireForumAuthMock = vi.fn();
vi.mock('./_auth.ts', () => ({
    requireForumAuth: (...args: unknown[]) => requireForumAuthMock(...args),
    assertForumWriteAllowed: () => ({ ok: true }),
    jsonResponse: (status: number, body: Record<string, unknown>) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
}));

import { GET as muteGet, POST as mutePost } from './mute/route.ts';

function postRequest(body: Record<string, unknown>): Request {
    return new Request('http://localhost/api/forum/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('forum mute route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireForumAuthMock.mockResolvedValue({
            ok: true,
            userId: 'user-1',
            token: 'tok',
            isAdmin: false,
        });
        rateLimitMock.mockResolvedValue(true);
        listMutedMock.mockResolvedValue(['muted-1']);
        isMutedByMock.mockResolvedValue(false);
    });

    it('GET يعيد قائمة المكتومين للمستخدم الحالي', async () => {
        const res = await muteGet(new Request('http://localhost/api/forum/mute'));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.mutedIds).toEqual(['muted-1']);
        expect(listMutedMock).toHaveBeenCalledWith('user-1');
    });

    it('POST يكتم مستخدماً', async () => {
        const res = await mutePost(postRequest({ targetUserId: 'target-1', action: 'mute' }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.muted).toBe(true);
        expect(muteMock).toHaveBeenCalledWith('user-1', 'target-1');
    });

    it('POST يلغي الكتم', async () => {
        const res = await mutePost(postRequest({ targetUserId: 'target-1', action: 'unmute' }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.muted).toBe(false);
        expect(unmuteMock).toHaveBeenCalledWith('user-1', 'target-1');
    });

    it('toggle يعتمد على الحالة الحالية', async () => {
        isMutedByMock.mockResolvedValue(true);
        const res = await mutePost(postRequest({ targetUserId: 'target-1' }));
        const body = await res.json();
        expect(body.muted).toBe(false);
        expect(unmuteMock).toHaveBeenCalledWith('user-1', 'target-1');
    });

    it('يرفض كتم النفس', async () => {
        const res = await mutePost(postRequest({ targetUserId: 'user-1', action: 'mute' }));
        expect(res.status).toBe(400);
        expect(muteMock).not.toHaveBeenCalled();
    });

    it('يرفض targetUserId مفقود', async () => {
        const res = await mutePost(postRequest({}));
        expect(res.status).toBe(400);
    });

    it('يحترم حد المعدل', async () => {
        rateLimitMock.mockResolvedValue(false);
        const res = await mutePost(postRequest({ targetUserId: 'target-1', action: 'mute' }));
        expect(res.status).toBe(429);
        expect(muteMock).not.toHaveBeenCalled();
    });
});
