import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, StrictMode, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecure = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: (...a: unknown[]) => fetchSecure(...a) },
}));

vi.mock('@/app/security/ensureCsrfSessionReady', () => ({
    ensureCsrfSessionReady: vi.fn(async () => undefined),
}));

import { primeHeadquartersLiveStatus, clearPrimedHeadquartersStatus } from '@/app/services/admin/hqDevSessionPrime';
import { markHqStatusFetched, parseHeadquartersLiveStatus } from '../hqLiveOverview';
import { useHeadquartersStatus } from '../useHeadquartersStatus';

const CONNECTED = {
    ok: true,
    system: 'connected' as const,
    db: true,
    kvOk: true,
    usersTotal: 4,
    usersFrozen: 0,
    mail: { configured: true, channel: 'resend', mailboxMasked: 'ha***@proton.me' },
};

function abortAwareStatus() {
    return (_path: string, opts?: { signal?: AbortSignal }) =>
        new Promise((resolve, reject) => {
            const signal = opts?.signal;
            const finish = () => resolve({ ...CONNECTED, usersTotal: 4 });
            if (signal?.aborted) {
                const err = new Error('aborted');
                err.name = 'AbortError';
                reject(err);
                return;
            }
            const timer = setTimeout(finish, 30);
            signal?.addEventListener(
                'abort',
                () => {
                    clearTimeout(timer);
                    const err = new Error('aborted');
                    err.name = 'AbortError';
                    reject(err);
                },
                { once: true },
            );
        });
}

describe('useHeadquartersStatus', () => {
    beforeEach(() => {
        clearPrimedHeadquartersStatus();
        fetchSecure.mockReset();
    });

    it('يرسم النبض المُجهَّز فور الفتح دون جلب فوري', async () => {
        fetchSecure.mockResolvedValue(CONNECTED);
        primeHeadquartersLiveStatus(
            markHqStatusFetched(parseHeadquartersLiveStatus(CONNECTED), '2026-01-01T00:00:00.000Z'),
        );
        const { result } = renderHook(() => useHeadquartersStatus());
        expect(result.current.system).toBe('connected');
        expect(result.current.sessionRequired).toBe(false);
        expect(result.current.fetchedAt).toBe('2026-01-01T00:00:00.000Z');
        await act(async () => {
            await Promise.resolve();
        });
        expect(fetchSecure).not.toHaveBeenCalled();
        await act(async () => {
            window.dispatchEvent(new Event('hami-hq-status-refresh'));
        });
        await waitFor(() => expect(fetchSecure).toHaveBeenCalled());
        expect(fetchSecure).toHaveBeenCalledWith(
            '/api/admin/status?fresh=1',
            expect.objectContaining({ method: 'GET' }),
        );
    });
    it('لا يصفرّ الأرقام إذا فشل التحديث بعد نجاح', async () => {
        let failNext = false;
        fetchSecure.mockImplementation(async () => {
            if (failNext) throw new Error('network');
            return {
                ok: true,
                system: 'connected',
                db: true,
                kvOk: true,
                usersTotal: 9,
                usersFrozen: 1,
            };
        });

        const { result } = renderHook(() => useHeadquartersStatus());
        await waitFor(() => expect(result.current.usersTotal).toBe(9));
        expect(result.current.stale).toBe(false);
        expect(result.current.fetchedAt).toBeTruthy();

        failNext = true;
        await act(async () => {
            window.dispatchEvent(new Event('hami-hq-status-refresh'));
        });
        await waitFor(() => expect(result.current.stale).toBe(true));
        expect(result.current.usersTotal).toBe(9);
        expect(result.current.system).toBe('down');
        expect(fetchSecure).toHaveBeenCalledWith(
            '/api/admin/status?fresh=1',
            expect.objectContaining({ method: 'GET' }),
        );
    });

    it('لا يبقى جاري التحقق بعد إلغاء الطلب الأول في StrictMode', async () => {
        fetchSecure.mockImplementation(abortAwareStatus());
        const { result } = renderHook(() => useHeadquartersStatus(), {
            wrapper: ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children),
        });
        await waitFor(() => expect(result.current.system).toBe('connected'));
        expect(result.current.mail?.configured).toBe(true);
        expect(result.current.mail?.channel).toBe('resend');
        expect(result.current.usersTotal).toBe(4);
    });

    it('401 يُسجَّل كغياب جلسة لا كتوقف للقاعدة', async () => {
        const { SecureFetchError } = await import('@/app/services/SecureFetchError');
        fetchSecure.mockRejectedValue(new SecureFetchError('HTTP 401', 401, '', '/api/admin/status'));
        const { result } = renderHook(() => useHeadquartersStatus());
        await waitFor(() => expect(result.current.sessionRequired).toBe(true));
        expect(result.current.db).toBe(false);
        expect(result.current.system).toBe('down');
        expect(result.current.fetchedAt).toBeNull();
    });

    it('بعد 401 لا يعيد الاستطلاع كل 30 ثانية', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            const { SecureFetchError } = await import('@/app/services/SecureFetchError');
            fetchSecure.mockRejectedValue(new SecureFetchError('HTTP 401', 401, '', '/api/admin/status'));
            const { result } = renderHook(() => useHeadquartersStatus());
            await waitFor(() => expect(result.current.sessionRequired).toBe(true));
            const calls = fetchSecure.mock.calls.length;
            await act(async () => {
                await vi.advanceTimersByTimeAsync(60_000);
            });
            expect(fetchSecure.mock.calls.length).toBe(calls);
        } finally {
            vi.useRealTimers();
        }
    });

    it('skipFetch لا يطلب النبض', async () => {
        fetchSecure.mockClear();
        const { result } = renderHook(() => useHeadquartersStatus({ skipFetch: true }));
        expect(result.current.sessionRequired).toBe(false);
        expect(result.current.system).toBe('checking');
        await act(async () => {
            await Promise.resolve();
        });
        expect(fetchSecure).not.toHaveBeenCalled();
    });

    it('جواب 200 بلا قاعدة لا يصفرّ آخر أرقام ناجحة', async () => {
        fetchSecure
            .mockResolvedValueOnce({
                ok: true,
                system: 'connected',
                db: true,
                kvOk: true,
                usersTotal: 9,
                usersFrozen: 1,
            })
            .mockResolvedValueOnce({
                ok: true,
                system: 'down',
                db: false,
                kvOk: false,
                usersTotal: 0,
                contentGaps: ['usersTotal'],
            });
        const { result } = renderHook(() => useHeadquartersStatus());
        await waitFor(() => expect(result.current.usersTotal).toBe(9));
        await act(async () => {
            window.dispatchEvent(new Event('hami-hq-status-refresh'));
        });
        await waitFor(() => expect(result.current.stale).toBe(true));
        expect(result.current.usersTotal).toBe(9);
        expect(result.current.system).toBe('down');
    });
});
