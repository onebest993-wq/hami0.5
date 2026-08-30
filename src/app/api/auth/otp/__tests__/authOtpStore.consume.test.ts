import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

const adminHolder: { client: unknown } = { client: null };

vi.mock('../../../security/adminMailerEnv.ts', () => ({
    applyHqMailerEnvFromFiles: () => undefined,
}));

vi.mock('../../../security/supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: () => adminHolder.client,
}));

import { consumeAuthOtpChallenge } from '../authOtpStore.ts';

const PEPPER = 'auth-otp-test-pepper-0123456789';

function hashCode(code: string): string {
    return createHash('sha256').update(`${PEPPER}:${code}`, 'utf8').digest('hex');
}

type ChallengeRow = {
    id: string;
    code_hash: string;
    expires_at: string;
    attempts: number;
    consumed_at: string | null;
};

/**
 * جدول واحد في الذاكرة يحكي سلوك PostgREST المهم هنا:
 * `update ... where consumed_at is null` لا يُرجع صفاً إن سبقه طلب آخر.
 */
function buildFakeAdmin(row: ChallengeRow) {
    const updates: Record<string, unknown>[] = [];

    const from = () => {
        const state: {
            patch: Record<string, unknown> | null;
            requireUnconsumed: boolean;
            expectedAttempts: number | null;
        } = { patch: null, requireUnconsumed: false, expectedAttempts: null };

        const builder = {
            select: () => builder,
            eq: (col?: string, val?: unknown) => {
                if (col === 'attempts' && typeof val === 'number') {
                    state.expectedAttempts = val;
                }
                return builder;
            },
            is: () => {
                state.requireUnconsumed = true;
                return builder;
            },
            order: () => builder,
            limit: () => builder,
            update: (patch: Record<string, unknown>) => {
                state.patch = patch;
                return builder;
            },
            maybeSingle: async () => {
                if (!state.patch) {
                    return { data: { ...row }, error: null };
                }
                if (state.requireUnconsumed && row.consumed_at) {
                    return { data: null, error: null };
                }
                if (state.expectedAttempts != null && row.attempts !== state.expectedAttempts) {
                    return { data: null, error: null };
                }
                updates.push(state.patch);
                Object.assign(row, state.patch);
                return { data: { id: row.id }, error: null };
            },
            then: (resolve: (value: { data: null; error: null }) => unknown) => {
                if (state.patch) {
                    if (state.requireUnconsumed && row.consumed_at) {
                        return resolve({ data: null, error: null });
                    }
                    updates.push(state.patch);
                    Object.assign(row, state.patch);
                }
                return resolve({ data: null, error: null });
            },
        };
        return builder;
    };

    return { admin: { from }, updates, row };
}

describe('consumeAuthOtpChallenge', () => {
    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        process.env.AUTH_OTP_PEPPER = PEPPER;
    });

    it('يقبل الرمز الصحيح مرة واحدة', async () => {
        const fake = buildFakeAdmin({
            id: 'chal-1',
            code_hash: hashCode('123456'),
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            attempts: 0,
            consumed_at: null,
        });
        adminHolder.client = fake.admin;

        await expect(
            consumeAuthOtpChallenge({ userId: 'u1', purpose: 'password_reset', code: '123456' }),
        ).resolves.toEqual({ ok: true });
        expect(fake.row.consumed_at).toBeTruthy();
    });

    it('يرفض إعادة استخدام الرمز نفسه بعد استهلاكه', async () => {
        const fake = buildFakeAdmin({
            id: 'chal-2',
            code_hash: hashCode('654321'),
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            attempts: 0,
            consumed_at: null,
        });
        adminHolder.client = fake.admin;

        await expect(
            consumeAuthOtpChallenge({ userId: 'u1', purpose: 'password_reset', code: '654321' }),
        ).resolves.toEqual({ ok: true });

        /* الطلب الثاني يجد الصف مستهلكاً فلا يمنح موافقة ثانية */
        await expect(
            consumeAuthOtpChallenge({ userId: 'u1', purpose: 'password_reset', code: '654321' }),
        ).resolves.toEqual({ ok: false, error: 'invalid' });
    });

    it('يرفض رمزاً خاطئاً ويزيد المحاولات', async () => {
        const fake = buildFakeAdmin({
            id: 'chal-3',
            code_hash: hashCode('111111'),
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            attempts: 0,
            consumed_at: null,
        });
        adminHolder.client = fake.admin;

        await expect(
            consumeAuthOtpChallenge({ userId: 'u1', purpose: 'password_reset', code: '222222' }),
        ).resolves.toEqual({ ok: false, error: 'invalid' });
        expect(fake.row.attempts).toBe(1);
        expect(fake.row.consumed_at).toBeNull();
    });

    it('يقفل التحدي عند استنفاد المحاولات', async () => {
        const fake = buildFakeAdmin({
            id: 'chal-4',
            code_hash: hashCode('333333'),
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            attempts: 4,
            consumed_at: null,
        });
        adminHolder.client = fake.admin;

        await expect(
            consumeAuthOtpChallenge({ userId: 'u1', purpose: 'password_reset', code: '999999' }),
        ).resolves.toEqual({ ok: false, error: 'locked' });
        expect(fake.row.consumed_at).toBeTruthy();
    });
});
