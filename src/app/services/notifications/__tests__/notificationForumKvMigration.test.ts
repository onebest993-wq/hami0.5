import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
const fetchSecureMock = vi.fn();
const canUseServerBackedNetwork = vi.hoisted(() => ({ value: true }));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: (key: string) => store.get(key) ?? null,
        setItemSync: (key: string, value: string) => {
            store.set(key, value);
        },
    },
}));

vi.mock('@/app/services/kvProxyConfig', () => ({
    isKvProxyNetworkEnabled: () => true,
}));

vi.mock('@/app/services/auth/lawyerAccountStatus', () => ({
    canUseServerBackedNetworkFeatures: () => canUseServerBackedNetwork.value,
}));

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: (...args: unknown[]) => fetchSecureMock(...args),
    },
}));

import {
    migrateLegacyForumKvToBlobIfNeeded,
    retryLegacyPrefixCleanupIfPartial,
} from '@/app/services/notifications/notificationForumKvMigration';

describe('notificationForumKvMigration', () => {
    beforeEach(() => {
        store.clear();
        fetchSecureMock.mockReset();
        canUseServerBackedNetwork.value = true;
    });

    it('يُعلّم partial عند فشل حذف prefix بعد الدمج', async () => {
        const legacy = {
            id: 'legacy-1',
            userId: 'u1',
            type: 'comment',
            title: 't',
            message: 'm',
            read: false,
            createdAt: '2024-01-01T00:00:00.000Z',
        };

        fetchSecureMock.mockImplementation(async (_url: string, init?: RequestInit) => {
            const body = JSON.parse(String(init?.body ?? '{}')) as { action?: string };
            if (body.action === 'getByPrefix') {
                return { values: [legacy] };
            }
            if (body.action === 'delByPrefix') {
                return { ok: true };
            }
            return {};
        });

        const loadBlob = vi.fn().mockResolvedValue([]);
        const saveBlob = vi.fn().mockResolvedValue(undefined);

        await migrateLegacyForumKvToBlobIfNeeded('u1', loadBlob, saveBlob);

        expect(saveBlob).toHaveBeenCalledTimes(1);
        expect(store.get('hami:notifications:kv-unified:u1:v1')).toBe('partial');
    });

    it('لا يلمس blob إن كانت شبكة الخادم مغلقة (حساب غير موثّق)', async () => {
        canUseServerBackedNetwork.value = false;
        fetchSecureMock.mockResolvedValue({ values: [{ id: 'legacy-1', userId: 'u1' }] });
        const saveBlob = vi.fn().mockResolvedValue(undefined);

        const migrated = await migrateLegacyForumKvToBlobIfNeeded(
            'u1',
            vi.fn().mockResolvedValue([]),
            saveBlob,
        );

        expect(migrated).toBe(false);
        expect(saveBlob).not.toHaveBeenCalled();
        expect(fetchSecureMock).not.toHaveBeenCalled();
    });

    it('retryLegacyPrefixCleanupIfPartial يُكمّل عند نجاح الحذف', async () => {
        store.set('hami:notifications:kv-unified:u1:v1', 'partial');

        fetchSecureMock.mockImplementation(async (_url: string, init?: RequestInit) => {
            const body = JSON.parse(String(init?.body ?? '{}')) as { action?: string };
            if (body.action === 'getByPrefix') return { values: [] };
            if (body.action === 'delByPrefix') return { ok: true };
            return {};
        });

        const ok = await retryLegacyPrefixCleanupIfPartial('u1');
        expect(ok).toBe(true);
        expect(store.get('hami:notifications:kv-unified:u1:v1')).toBe('1');
    });
});
