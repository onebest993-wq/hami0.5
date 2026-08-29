import { afterEach, describe, expect, it, vi } from 'vitest';
import { HAMI_PLATFORM_ADMIN_UUID } from '@/app/constants/hamiPlatformAdminId';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';

vi.mock('@/app/services/auth/lawyerAccountStatus', () => ({
    canUseServerBackedNetworkFeatures: () => false,
}));

import {
    canReachProtectedServerNetwork,
    resolveDeniedNetworkFeatureResponse,
} from '@/app/services/secureApiNetworkFeatures';

describe('secureApiNetworkFeatures', () => {
    afterEach(() => {
        delete (window as Window & { __HAMI_E2E_FORUM__?: boolean }).__HAMI_E2E_FORUM__;
        setLiveAuthUserId(null);
    });

    it('يرفض مسار المنتدى عندما الميزات الشبكية مغلقة', () => {
        const res = resolveDeniedNetworkFeatureResponse('/api/forum/posts');
        expect(res).not.toBeNull();
        expect(res?.status).toBe(403);
    });

    it('يمرّر مسار المنتدى في DEV عند علم E2E فقط', () => {
        (window as Window & { __HAMI_E2E_FORUM__?: boolean }).__HAMI_E2E_FORUM__ = true;
        expect(resolveDeniedNetworkFeatureResponse('/api/forum/posts')).toBeNull();
    });

    it('لا يلمس مسارات غير محمية', () => {
        expect(resolveDeniedNetworkFeatureResponse('/api/health')).toBeNull();
    });

    it('يرفض kv-proxy عندما الميزات الشبكية مغلقة', () => {
        const res = resolveDeniedNetworkFeatureResponse('/api/kv-proxy');
        expect(res).not.toBeNull();
        expect(res?.status).toBe(403);
    });

    it('يرفض calendar/tombstones عندما الميزات الشبكية مغلقة', () => {
        const res = resolveDeniedNetworkFeatureResponse('/api/calendar/tombstones');
        expect(res).not.toBeNull();
        expect(res?.status).toBe(403);
    });

    it('يمرّر مسار المنتدى لمدير المنصّة حتى لو KYC مغلق', () => {
        setLiveAuthUserId(HAMI_PLATFORM_ADMIN_UUID);
        expect(resolveDeniedNetworkFeatureResponse('/api/forum/reports')).toBeNull();
        expect(resolveDeniedNetworkFeatureResponse('/api/forum/ban')).toBeNull();
        expect(resolveDeniedNetworkFeatureResponse('/api/forum/stats')).toBeNull();
    });

    it('canReachProtectedServerNetwork يعكس البوابة الموحّدة', () => {
        expect(canReachProtectedServerNetwork('lawyer-1')).toBe(false);
    });
});
