import { describe, expect, it, vi } from 'vitest';
import {
    buildPhoneBodyLiveScopeHandler,
    readPhoneBodyLiveScopeValue,
} from '../buildPhoneBodyLiveScopeHandler';

describe('buildPhoneBodyLiveScopeHandler', () => {
    it('invokes handler from scopeRef at call time', () => {
        const live = vi.fn();
        const scopeRef = { current: { toggleEvictionGracePinned: live } };
        const handler = buildPhoneBodyLiveScopeHandler(
            scopeRef,
            {},
            'toggleEvictionGracePinned',
        );
        handler();
        expect(live).toHaveBeenCalledTimes(1);
    });

    it('reads live boolean from scopeRef', () => {
        const scopeRef = { current: { evictionGracePinned: false } };
        expect(
            readPhoneBodyLiveScopeValue(scopeRef, { evictionGracePinned: true }, 'evictionGracePinned', true),
        ).toBe(false);
    });
});
