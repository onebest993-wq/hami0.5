import { describe, expect, it, vi } from 'vitest';

const getUserById = vi.fn();

vi.mock('../supabaseAdminClient.ts', () => ({
    getGoTrueAdminApi: () => ({ getUserById }),
}));

import { loadHeadquartersAccountActivity } from '../headquartersAccountActivity.ts';

function chain(result: { data: unknown; error: unknown; count?: number | null }) {
    const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: async () => result,
        then: (resolve: (value: typeof result) => unknown) => resolve(result),
    };
    return query;
}

describe('loadHeadquartersAccountActivity', () => {
    it('يضع فجوات صادقة ولا يخترع أصفاراً عند فشل المصادر', async () => {
        getUserById.mockResolvedValue({ data: null, error: { message: 'nope' } });
        const admin = {
            from: (table: string) => {
                if (table === 'hq_account_sessions') {
                    return chain({ data: null, error: { message: 'no sessions' }, count: null });
                }
                if (table === 'forum_bans') {
                    return chain({ data: null, error: { message: 'no bans' } });
                }
                return chain({ data: null, error: { message: `no ${table}` }, count: null });
            },
        };
        const activity = await loadHeadquartersAccountActivity(
            admin as never,
            'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            '2026-01-01T00:00:00.000Z',
        );
        expect(activity.createdAt).toBe('2026-01-01T00:00:00.000Z');
        expect(activity.lastSignInAt).toBeNull();
        expect(activity.sessionCount).toBeNull();
        expect(activity.forumPosts).toBeNull();
        expect(activity.forumComments).toBeNull();
        expect(activity.forumBanned).toBeNull();
        expect(activity.gaps).toEqual(
            expect.arrayContaining(['auth', 'sessions', 'forum_posts', 'forum_comments', 'forum_bans', 'audit', 'connections']),
        );
        expect(activity.timeline.some((item) => item.kind === 'account')).toBe(true);
    });

    it('يعدّ المنشورات من العدّ الحيّ لا من التخمين', async () => {
        getUserById.mockResolvedValue({
            data: {
                user: {
                    created_at: '2026-01-01T00:00:00.000Z',
                    last_sign_in_at: '2026-08-01T00:00:00.000Z',
                    email_confirmed_at: '2026-01-02T00:00:00.000Z',
                },
            },
            error: null,
        });
        const admin = {
            from: (table: string) => {
                if (table === 'hq_account_sessions') {
                    return chain({
                        data: [{ created_at: '2026-08-01T00:00:00.000Z', updated_at: '2026-08-02T00:00:00.000Z' }],
                        error: null,
                        count: 2,
                    });
                }
                if (table === 'forum_posts') {
                    return chain({
                        data: [{ content: 'مرحبا', created_at: '2026-08-03T00:00:00.000Z' }],
                        error: null,
                        count: 4,
                    });
                }
                if (table === 'forum_comments') {
                    return chain({ data: [], error: null, count: 0 });
                }
                if (table === 'forum_bans') {
                    return chain({ data: null, error: null });
                }
                return chain({ data: [], error: null });
            },
        };
        const activity = await loadHeadquartersAccountActivity(
            admin as never,
            'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            '2026-01-01T00:00:00.000Z',
        );
        expect(activity.gaps).toEqual([]);
        expect(activity.sessionCount).toBe(2);
        expect(activity.forumPosts).toBe(4);
        expect(activity.forumComments).toBe(0);
        expect(activity.forumBanned).toBe(false);
        expect(activity.lastSignInAt).toBe('2026-08-01T00:00:00.000Z');
        expect(activity.lastDevice).toBeNull();
        expect(activity.connections).toEqual([]);
    });

    it('يعرض نوع الجهاز وعنوان الشبكة دون وكيل المستخدم الخام', async () => {
        getUserById.mockResolvedValue({
            data: { user: { created_at: '2026-01-01T00:00:00.000Z' } },
            error: null,
        });
        const admin = {
            from: (table: string) => {
                if (table === 'hq_account_sessions') {
                    return chain({
                        data: [
                            {
                                created_at: '2026-08-01T00:00:00.000Z',
                                updated_at: '2026-08-01T00:00:00.000Z',
                                ip: '203.0.113.10',
                                user_agent:
                                    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36',
                            },
                        ],
                        error: null,
                        count: 1,
                    });
                }
                if (table === 'hq_connection_signals') {
                    return chain({
                        data: [
                            {
                                seen_at: '2026-08-01T01:00:00.000Z',
                                ip: '203.0.113.10',
                                device_label: 'هاتف أندرويد — حامٍ',
                                country_code: 'IQ',
                                city: 'Baghdad',
                                source: 'login',
                            },
                        ],
                        error: null,
                    });
                }
                if (table === 'forum_bans') {
                    return chain({ data: null, error: null });
                }
                return chain({ data: [], error: null, count: 0 });
            },
        };
        const activity = await loadHeadquartersAccountActivity(
            admin as never,
            'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            '2026-01-01T00:00:00.000Z',
        );
        expect(activity.lastDevice).toBe('هاتف أندرويد — حامٍ');
        expect(activity.lastIp).toBe('203.0.113.10');
        expect(activity.lastPlace).toBe('بغداد، العراق');
        expect(JSON.stringify(activity)).not.toContain('AppleWebKit');
        expect(activity.connections[0]?.place).toBe('بغداد، العراق');
    });

    it('يظهر تصحيح الاسم من/إلى في سجل الإضبارة', async () => {
        getUserById.mockResolvedValue({
            data: { user: { created_at: '2026-01-01T00:00:00.000Z' } },
            error: null,
        });
        const admin = {
            from: (table: string) => {
                if (table === 'audit_logs') {
                    return chain({
                        data: [
                            {
                                id: 'aud-name',
                                action: 'hq:user.display_name_correct',
                                created_at: '2026-08-20T00:00:00.000Z',
                                details: {
                                    targetId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                                    from: 'علي محمد حسن',
                                    to: 'علي حسن محمد',
                                },
                            },
                        ],
                        error: null,
                    });
                }
                if (table === 'forum_bans') {
                    return chain({ data: null, error: null });
                }
                return chain({ data: [], error: null, count: 0 });
            },
        };
        const activity = await loadHeadquartersAccountActivity(
            admin as never,
            'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            '2026-01-01T00:00:00.000Z',
        );
        const named = activity.timeline.find((item) => item.kind === 'audit');
        expect(named?.label).toBe('تصحيح الاسم الثلاثي');
        expect(named?.detail).toBe('من «علي محمد حسن» إلى «علي حسن محمد»');
        expect(activity.gaps).not.toContain('audit');
    });
});
