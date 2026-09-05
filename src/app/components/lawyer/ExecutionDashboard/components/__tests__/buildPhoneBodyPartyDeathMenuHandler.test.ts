import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    resetExecutionHandlerStubNotifierForTests,
} from '../../hooks/executionHandlerClusterStubs';
import { buildPhoneBodyPartyDeathMenuHandler } from '../buildPhoneBodyPartyDeathMenuHandler';

vi.mock('../../executionDashboardHandlerClusterBridgeLazy', () => ({
    prefetchExecutionHandlerClusterPartyDeathBridge: vi.fn(),
}));

import { prefetchExecutionHandlerClusterPartyDeathBridge } from '../../executionDashboardHandlerClusterBridgeLazy';

describe('buildPhoneBodyPartyDeathMenuHandler', () => {
    beforeEach(() => {
        resetExecutionHandlerStubNotifierForTests();
        vi.useFakeTimers();
    });

    afterEach(() => {
        resetExecutionHandlerStubNotifierForTests();
        vi.useRealTimers();
    });

    it('invokes nested partyDeathHandlers opener when flat key is missing', () => {
        const opener = vi.fn();
        const scopeRef = {
            current: {
                partyDeathHandlers: {
                    handleDebtorDeathMenuAction: opener,
                },
            },
        };
        const handler = buildPhoneBodyPartyDeathMenuHandler(scopeRef, {}, 'handleDebtorDeathMenuAction');
        handler();
        expect(opener).toHaveBeenCalledTimes(1);
    });

    it('يسخّن الجسر وينتظر المعالج الحي بدل توست فوري', async () => {
        const showToast = vi.fn();
        const opener = vi.fn();
        const scopeRef = { current: { showToast } as Record<string, unknown> };
        const handler = buildPhoneBodyPartyDeathMenuHandler(
            scopeRef,
            {},
            'handleCreditorDeathMenuAction',
        );
        handler();
        expect(showToast).not.toHaveBeenCalled();
        expect(prefetchExecutionHandlerClusterPartyDeathBridge).toHaveBeenCalled();

        scopeRef.current = {
            showToast,
            partyDeathHandlers: { handleCreditorDeathMenuAction: opener },
        };
        await vi.advanceTimersByTimeAsync(40);
        expect(opener).toHaveBeenCalledTimes(1);
        expect(showToast).not.toHaveBeenCalled();
    });
});
