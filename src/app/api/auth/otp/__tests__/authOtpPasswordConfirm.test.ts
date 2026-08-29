import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../security/sessionCookie.ts', () => ({
    getSupabaseAuthConfigFromEnv: () => ({ url: 'https://auth.test', key: 'anon' }),
}));

const revoke = vi.fn(async () => undefined);

vi.mock('../../goTrueSession.ts', () => ({
    revokeGoTrueSession: (...args: unknown[]) => revoke(...args),
}));

import { confirmGoTruePasswordIsLive } from '../authOtpPasswordConfirm.ts';

describe('confirmGoTruePasswordIsLive', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        revoke.mockReset();
    });

    it('يعتبر الكلمة حيّة بعد منح ناجح ثم يلغي الجلسة', async () => {
        const fetchMock = vi.fn(
            async () => new Response(JSON.stringify({ access_token: 'tok-1' }), { status: 200 }),
        );
        vi.stubGlobal('fetch', fetchMock);
        await expect(confirmGoTruePasswordIsLive('a@b.co', 'Abcd1234!')).resolves.toBe('live');
        expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
            email: 'a@b.co',
            password: 'Abcd1234!',
        });
        expect(revoke).toHaveBeenCalledWith('tok-1', { scope: 'global' });
    });

    it('يفشل إن رفض GoTrue المنح', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(JSON.stringify({ error: 'invalid' }), { status: 400 })),
        );
        await expect(confirmGoTruePasswordIsLive('a@b.co', 'wrong')).resolves.toBe('failed');
        expect(revoke).not.toHaveBeenCalled();
    });
});
