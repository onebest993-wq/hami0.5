import { describe, expect, it, vi, beforeEach } from 'vitest';
import { openHubArchiveFromHomeTile, resolveHubArchiveRouteId } from '../hubHomeOpen';

const toastError = vi.fn();
vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: (...args: unknown[]) => toastError(...args) },
}));

const prefetchHubArchiveIntentImmediate = vi.fn();
vi.mock('@/app/hooks/lawyerDashboard/hubArchivePrefetchGate', () => ({
    prefetchHubArchiveIntentImmediate: (...args: unknown[]) => prefetchHubArchiveIntentImmediate(...args),
}));

describe('hubHomeOpen', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('resolveHubArchiveRouteId accepts known routes only', () => {
        expect(resolveHubArchiveRouteId('execution')).toBe('execution');
        expect(resolveHubArchiveRouteId('lawsuit')).toBe('lawsuit');
        expect(resolveHubArchiveRouteId('transaction')).toBe('transaction');
        expect(resolveHubArchiveRouteId('evil')).toBeNull();
    });

    it('rejects unknown archive id without opening', () => {
        const onOpen = vi.fn();
        expect(openHubArchiveFromHomeTile('injection', 'user-1', onOpen)).toBe(false);
        expect(onOpen).not.toHaveBeenCalled();
        expect(prefetchHubArchiveIntentImmediate).not.toHaveBeenCalled();
    });

    it('blocks signed-out users from opening execution', async () => {
        const onOpen = vi.fn();
        expect(openHubArchiveFromHomeTile('execution', null, onOpen)).toBe(false);
        expect(onOpen).not.toHaveBeenCalled();
        expect(prefetchHubArchiveIntentImmediate).not.toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(toastError).toHaveBeenCalled();
        });
    });

    it('opens lawsuit for signed-in user', async () => {
        const onOpen = vi.fn();
        expect(openHubArchiveFromHomeTile('lawsuit', 'lawyer-1', onOpen)).toBe(true);
        expect(onOpen).toHaveBeenCalledWith('lawsuit');
        await vi.waitFor(() => {
            expect(prefetchHubArchiveIntentImmediate).toHaveBeenCalledWith('lawsuit', 'lawyer-1');
        });
    });

    it('blocks signed-out users from opening lawsuit', () => {
        const onOpen = vi.fn();
        expect(openHubArchiveFromHomeTile('lawsuit', null, onOpen)).toBe(false);
        expect(onOpen).not.toHaveBeenCalled();
        expect(prefetchHubArchiveIntentImmediate).not.toHaveBeenCalled();
    });

    it('opens transaction for signed-in user', async () => {
        const onOpen = vi.fn();
        expect(openHubArchiveFromHomeTile('transaction', 'lawyer-1', onOpen)).toBe(true);
        expect(onOpen).toHaveBeenCalledWith('transaction');
        await vi.waitFor(() => {
            expect(prefetchHubArchiveIntentImmediate).toHaveBeenCalledWith('transaction', 'lawyer-1');
        });
    });

    it('blocks signed-out users from opening transaction', async () => {
        const onOpen = vi.fn();
        expect(openHubArchiveFromHomeTile('transaction', null, onOpen)).toBe(false);
        expect(onOpen).not.toHaveBeenCalled();
        expect(prefetchHubArchiveIntentImmediate).not.toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(toastError).toHaveBeenCalled();
        });
    });
});
