/**
 * دورة حقيقية: AES-GCM → POST المعالج → GET → فك → تطبيق.
 * ليست تجربة جهاز ثانٍ على الإنتاج — أقرب عقد تشغيل دون حساب محامٍ حي.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { requireWifeUserMock, rows } = vi.hoisted(() => ({
    requireWifeUserMock: vi.fn(),
    rows: [] as Array<{
        id: string;
        user_id: string;
        encrypted_data: string;
        data_signature: string;
        created_at: string;
        security_version: number;
    }>,
}));

vi.mock('@/app/api/security/bffAuth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/security/bffAuth')>();
    return {
        ...actual,
        requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
        requireWifeCloudWrite: (...args: unknown[]) => requireWifeUserMock(...args),
    };
});

vi.mock('@/app/api/security/supabaseAdminClient', () => ({
    getSupabaseAdminClient: () => ({
        from() {
            return {
                insert: async (row: {
                    user_id: string;
                    encrypted_data: string;
                    data_signature: string;
                    security_version: number;
                }) => {
                    rows.unshift({
                        ...row,
                        id: `cp-${rows.length + 1}`,
                        created_at: new Date().toISOString(),
                    });
                    return { error: null };
                },
                select() {
                    return {
                        eq(_col: string, userId: string) {
                            const matched = rows.filter((r) => r.user_id === userId);
                            const ordered = [...matched].sort((a, b) =>
                                a.created_at < b.created_at ? 1 : -1,
                            );
                            const result = {
                                data: ordered,
                                error: null,
                                limit(n: number) {
                                    return {
                                        maybeSingle: async () => ({
                                            data: ordered[0] ?? null,
                                            error: null,
                                        }),
                                    };
                                },
                            };
                            return {
                                order() {
                                    return Object.assign(Promise.resolve(result), result);
                                },
                            };
                        },
                    };
                },
                delete() {
                    return {
                        in: async (_col: string, ids: string[]) => {
                            const drop = new Set(ids);
                            for (let i = rows.length - 1; i >= 0; i -= 1) {
                                if (drop.has(rows[i].id)) rows.splice(i, 1);
                            }
                            return { error: null };
                        },
                    };
                },
            };
        },
    }),
}));

vi.mock('@/app/api/security/postgresUuidSubject', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/security/postgresUuidSubject')>();
    return {
        ...actual,
        rejectNonUuidCloudWrite: () => null,
    };
});

vi.mock('@/app/services/settings/lawyerWorkCloudGate', () => ({
    isLawyerWorkCloudLive: () => true,
}));

vi.mock('@/app/services/settings/cloudSyncBucket', () => ({
    isLiveCloudSyncBucketEnabled: () => true,
}));

vi.mock('@/app/utils/liveAuthUserId', () => ({
    resolveLiveAuthUserIdForStorage: () => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
}));

vi.mock('@/app/utils/executionFilesStorage', () => ({
    saveExecutionFilesRawImmediate: vi.fn(),
    resolveExecutionFilesStorageKey: () => 'hami:execution:v1:roundtrip',
}));

const applyMerge = vi.fn();
vi.mock('@/app/domain/lawsuit/lawsuitSegmentStorage', () => ({
    collectLawsuitLocalRowsForSync: () => [
        { id: 'ls-roundtrip', type: 'lawsuit', status: 'active', caseNo: '1' },
    ],
    applyLawsuitMonolithicMergeToSegments: (...args: unknown[]) => applyMerge(...args),
}));

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        loadAsync: vi.fn(async (key: string) => {
            if (String(key).includes('execution')) return [{ id: 'ex-roundtrip' }];
            if (String(key).toLowerCase().includes('note')) return [{ id: 'n-roundtrip' }];
            return [];
        }),
        save: vi.fn(),
    },
}));

import { CryptoService } from '@/app/services/CryptoService';
import { GET, POST } from '@/app/api/work-checkpoints/route';
import {
    pushWorkCloudCheckpointNow,
    restoreLastWorkCloudCheckpoint,
} from '@/app/services/cloud/workCloudCheckpoint';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';

describe('work checkpoint AES roundtrip through BFF handlers', () => {
    beforeEach(async () => {
        rows.splice(0, rows.length);
        applyMerge.mockReset();
        requireWifeUserMock.mockReset();
        requireWifeUserMock.mockResolvedValue({
            ok: true,
            userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        });
        await CryptoService.initialize('roundtrip-passphrase');
        vi.spyOn(SecureAPIClient, 'fetchSecure').mockImplementation(async (path, init) => {
            const method = String(init?.method ?? 'GET').toUpperCase();
            const req = new Request(`https://app.test${path}`, {
                method,
                headers: init?.headers as HeadersInit | undefined,
                body: typeof init?.body === 'string' ? init.body : undefined,
            });
            const res = method === 'POST' ? await POST(req) : await GET(req);
            return (await res.json()) as { ok?: boolean };
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        CryptoService.destroy();
    });

    it('يشفر ثم يخزّن ثم يسترجع نفس دعاوى/تنفيذ/ملاحظات', async () => {
        const pushed = await pushWorkCloudCheckpointNow();
        expect(pushed).toBe(true);
        expect(rows.length).toBe(1);
        expect(rows[0].encrypted_data.includes(':')).toBe(true);

        const restored = await restoreLastWorkCloudCheckpoint();
        expect(restored.applied).toBe(true);
        expect(restored.lawsuits).toBe(1);
        expect(restored.execution).toBe(1);
        expect(restored.notes).toBe(1);
        expect(applyMerge).toHaveBeenCalled();
        const merged = applyMerge.mock.calls[0]?.[0] as Array<{ id?: string }>;
        expect(merged.some((row) => row.id === 'ls-roundtrip')).toBe(true);
    });
});
