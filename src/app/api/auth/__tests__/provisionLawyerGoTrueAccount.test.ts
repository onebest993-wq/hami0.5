import { afterEach, describe, expect, it, vi } from 'vitest';
import { provisionLawyerGoTrueAccount } from '../provisionLawyerGoTrueAccount.ts';

describe('provisionLawyerGoTrueAccount', () => {
    afterEach(() => {
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it('uses Admin createUser with email_confirm and does not call public signup', async () => {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_test_service_role_key';
        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = String(input);
            if (url.includes('/auth/v1/admin/users')) {
                const body = JSON.parse(String(init?.body ?? '{}')) as { email_confirm?: boolean };
                expect(body.email_confirm).toBe(true);
                return new Response(JSON.stringify({ id: 'u-1', email: 'ok@gmail.com' }), {
                    status: 200,
                });
            }
            if (url.includes('/auth/v1/token')) {
                return new Response(
                    JSON.stringify({
                        access_token: 'a',
                        refresh_token: 'r',
                        expires_in: 3600,
                        user: { id: 'u-1' },
                    }),
                    { status: 200 },
                );
            }
            return new Response('{}', { status: 500 });
        });
        vi.stubGlobal('fetch', fetchMock);

        const result = await provisionLawyerGoTrueAccount({
            url: 'https://project.supabase.co',
            anonKey: 'anon-key',
            email: 'ok@gmail.com',
            password: 'SecureLaw9',
            meta: { accountType: 'lawyer' },
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.user.id).toBe('u-1');
        expect(result.access_token).toBe('a');
        expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/auth/v1/signup'))).toBe(
            false,
        );
    });

    it('maps public signup mail rate-limit without leaking GoTrue English', async () => {
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                new Response(
                    JSON.stringify({
                        error_code: 'over_email_send_rate_limit',
                        msg: 'email rate limit exceeded',
                    }),
                    { status: 429 },
                ),
            ),
        );
        const result = await provisionLawyerGoTrueAccount({
            url: 'https://project.supabase.co',
            anonKey: 'anon-key',
            email: 'ok@gmail.com',
            password: 'SecureLaw9',
            meta: {},
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.code).toBe('EMAIL_RATE_LIMIT');
        expect(result.error).toMatch(/حد رسائل/);
        expect(result.error).not.toMatch(/rate limit exceeded/i);
    });
});
