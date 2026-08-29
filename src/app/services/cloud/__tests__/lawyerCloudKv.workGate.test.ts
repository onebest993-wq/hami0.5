import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KvLocalOnlyError } from '@/app/services/cloud/lawyerCloudKv';

const fetchSecure = vi.fn();
const isKvProxyNetworkEnabled = vi.fn(() => true);
const canUseServerBackedNetworkFeatures = vi.fn(() => true);
const isLawyerWorkCloudLive = vi.fn(() => false);

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: (...args: unknown[]) => fetchSecure(...args),
    },
}));

vi.mock('@/app/services/kvProxyConfig', () => ({
    isKvProxyNetworkEnabled: () => isKvProxyNetworkEnabled(),
}));

vi.mock('@/app/services/auth/lawyerAccountStatus', () => ({
    canUseServerBackedNetworkFeatures: () => canUseServerBackedNetworkFeatures(),
}));

vi.mock('@/app/services/settings/lawyerWorkCloudGate', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/settings/lawyerWorkCloudGate')>();
    return {
        ...actual,
        isLawyerWorkCloudLive: () => isLawyerWorkCloudLive(),
    };
});

vi.mock('@/app/utils/liveAuthUserId', () => ({
    getLiveAuthUserId: () => 'lawyer-kv-1',
}));

describe('lawyerCloudKv work-cloud gate', () => {
    beforeEach(async () => {
        fetchSecure.mockReset();
        isKvProxyNetworkEnabled.mockReturnValue(true);
        canUseServerBackedNetworkFeatures.mockReturnValue(true);
        isLawyerWorkCloudLive.mockReturnValue(false);
        fetchSecure.mockResolvedValue({ ok: true, value: { id: 'p' }, values: [] });
    });

    it('يرفض تقويم/معاملات/مخزن بلا مزامنة عمل ولا يلمس /api', async () => {
        const { lawyerCloudKv } = await import('@/app/services/cloud/lawyerCloudKv');
        await expect(lawyerCloudKv.get('calendar:u1:e1')).rejects.toBeInstanceOf(KvLocalOnlyError);
        await expect(lawyerCloudKv.getByPrefix('transactions:u1:')).rejects.toBeInstanceOf(KvLocalOnlyError);
        await expect(lawyerCloudKv.getByPrefix('user:u1:')).rejects.toBeInstanceOf(KvLocalOnlyError);
        await expect(lawyerCloudKv.set('vault:docs:u1:d1', {})).rejects.toBeInstanceOf(KvLocalOnlyError);
        expect(fetchSecure).not.toHaveBeenCalled();
    });

    it('يسمح لملف المحامي المهني حتى والمزامنة المحلية مطفأة', async () => {
        const { lawyerCloudKv } = await import('@/app/services/cloud/lawyerCloudKv');
        await expect(lawyerCloudKv.get('profile:u1')).resolves.toEqual({ id: 'p' });
        expect(fetchSecure).toHaveBeenCalledTimes(1);
        expect(String(fetchSecure.mock.calls[0]?.[0])).toContain('/api/kv-proxy');
    });

    it('يمرّر مفاتيح العمل عند تفعيل المزامنة', async () => {
        isLawyerWorkCloudLive.mockReturnValue(true);
        const { lawyerCloudKv } = await import('@/app/services/cloud/lawyerCloudKv');
        await lawyerCloudKv.get('calendar:u1:e1');
        expect(fetchSecure).toHaveBeenCalledTimes(1);
    });
});
