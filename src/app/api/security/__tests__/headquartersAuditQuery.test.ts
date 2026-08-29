import { describe, expect, it } from 'vitest';
import { listHeadquartersAudit } from '../headquartersAuditQuery.ts';

describe('listHeadquartersAudit', () => {
    it('يُسقط مفاتيح كلمة المرور والبصمة من التفاصيل', async () => {
        const admin = {
            from() {
                return {
                    select: () => ({
                        like: () => ({
                            order: () => ({
                                limit: async () => ({
                                    data: [
                                        {
                                            id: 'aud-1',
                                            user_id: '11111111-2222-4333-8444-555555555555',
                                            action: 'hq:user.set_password',
                                            created_at: '2026-08-01T00:00:00.000Z',
                                            details: {
                                                targetId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                                                password: 'HamiLaw9x',
                                                deviceFingerprint: 'secret-fingerprint-value',
                                                durationHours: 24,
                                            },
                                        },
                                    ],
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                };
            },
        };
        const rows = await listHeadquartersAudit(admin);
        expect(rows).toEqual([
            {
                id: 'aud-1',
                action: 'hq:user.set_password',
                actorId: '11111111-2222-4333-8444-555555555555',
                targetId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                createdAt: '2026-08-01T00:00:00.000Z',
                details: {
                    targetId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                    durationHours: 24,
                },
            },
        ]);
        expect(JSON.stringify(rows)).not.toContain('HamiLaw9x');
        expect(JSON.stringify(rows)).not.toContain('secret-fingerprint-value');
    });

    it('جدول مفقود لا يُعرض كسجل فارغ', async () => {
        const admin = {
            from() {
                return {
                    select: () => ({
                        like: () => ({
                            order: () => ({
                                limit: async () => ({
                                    data: null,
                                    error: { message: 'relation "audit_logs" does not exist' },
                                }),
                            }),
                        }),
                    }),
                };
            },
        };
        await expect(listHeadquartersAudit(admin)).rejects.toThrow('relation "audit_logs" does not exist');
    });
});
