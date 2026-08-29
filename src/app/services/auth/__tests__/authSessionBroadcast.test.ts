import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    AUTH_LOGOUT_BROADCAST,
    AUTH_SESSION_CHANNEL,
    isPublishingAuthLogout,
    publishAuthLogout,
    subscribeAuthLogout,
    subscribeSameTabAuthLogout,
} from '@/app/services/auth/authSessionBroadcast';

describe('authSessionBroadcast', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('no-ops when BroadcastChannel is unavailable', () => {
        vi.stubGlobal('BroadcastChannel', undefined);
        expect(() => publishAuthLogout()).not.toThrow();
        expect(subscribeAuthLogout(() => undefined)()).toBeUndefined();
        expect(isPublishingAuthLogout()).toBe(false);
    });

    it('يُبلِّغ نفس التبويب حتى دون BroadcastChannel', () => {
        vi.stubGlobal('BroadcastChannel', undefined);
        const onLogout = vi.fn();
        const unsub = subscribeSameTabAuthLogout(onLogout);
        publishAuthLogout();
        expect(onLogout).toHaveBeenCalledTimes(1);
        unsub();
    });

    it('posts a logout message on the session channel', () => {
        const posted: unknown[] = [];
        class FakeChannel {
            name: string;
            constructor(name: string) {
                this.name = name;
            }
            postMessage(data: unknown) {
                posted.push(data);
            }
            close() {
                /* no-op */
            }
            addEventListener() {
                /* no-op */
            }
            removeEventListener() {
                /* no-op */
            }
        }
        vi.stubGlobal('BroadcastChannel', FakeChannel);
        publishAuthLogout();
        expect(posted).toEqual([{ type: AUTH_LOGOUT_BROADCAST, at: expect.any(Number) }]);
        expect(AUTH_SESSION_CHANNEL).toBe('hami-auth-session');
        expect(isPublishingAuthLogout()).toBe(false);
    });
});
