import { afterEach, describe, expect, it, vi } from 'vitest';

const getState = vi.fn(() => 'available' as const);

vi.mock('@/app/runtime/sameOriginApiProbe', () => ({
    getSameOriginApiState: () => getState(),
}));

import { isKvProxyNetworkEnabled } from '../kvProxyConfig';

describe('isKvProxyNetworkEnabled', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        getState.mockReturnValue('available');
    });

    it('يبقى مغلقاً في التطوير بلا اختيار صريح', () => {
        vi.stubEnv('VITE_ENABLE_KV_PROXY', '');
        expect(isKvProxyNetworkEnabled()).toBe(false);
    });

    it('يفتح عند VITE_ENABLE_KV_PROXY=true و/api متاح', () => {
        vi.stubEnv('VITE_ENABLE_KV_PROXY', 'true');
        expect(isKvProxyNetworkEnabled()).toBe(true);
    });

    it('يبقى مغلقاً إذا المسبار لم يؤكد /api', () => {
        vi.stubEnv('VITE_ENABLE_KV_PROXY', 'true');
        getState.mockReturnValue('pending');
        expect(isKvProxyNetworkEnabled()).toBe(false);
    });
});
