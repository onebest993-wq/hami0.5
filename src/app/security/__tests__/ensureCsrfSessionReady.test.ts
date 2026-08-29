import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CSRF_META_NAME } from '@/app/security/csrfSession';

const getCurrentAccessToken = vi.fn();
const fetchSecure = vi.fn();

vi.mock('@/app/utils/authStorage', () => ({
    shouldUseServerSignedAuth: () => true,
}));

vi.mock('@/app/services/SecureAPIClient', () => ({
    getCurrentAccessToken: (...args: unknown[]) => getCurrentAccessToken(...args),
    SecureAPIClient: {
        fetchSecure: (...args: unknown[]) => fetchSecure(...args),
    },
}));

import {
    CSRF_ACCESS_TOKEN_BUDGET_MS,
    ensureCsrfSessionReady,
    invalidateCsrfSessionReady,
    markCsrfSessionReadyFromServer,
    wasCsrfServerSessionEstablished,
} from '@/app/security/ensureCsrfSessionReady';

describe('ensureCsrfSessionReady', () => {
    beforeEach(() => {
        invalidateCsrfSessionReady();
        fetchSecure.mockReset();
        getCurrentAccessToken.mockReset();
        getCurrentAccessToken.mockResolvedValue('access-token-for-csrf-test');
        fetchSecure.mockResolvedValue({ ok: true, csrfToken: 'A'.repeat(32) });
        document.head.querySelectorAll(`meta[name="${CSRF_META_NAME}"]`).forEach((node) => node.remove());
    });

    it('markCsrfSessionReadyFromServer يتخطى GET CSRF عند توكن صالح', async () => {
        expect(markCsrfSessionReadyFromServer('A'.repeat(32))).toBe(true);
        await ensureCsrfSessionReady();
        expect(fetchSecure).not.toHaveBeenCalled();
    });

    it('لا يعيد طلب CSRF بعد نجاح أول تهيئة', async () => {
        await ensureCsrfSessionReady();
        await ensureCsrfSessionReady();
        expect(fetchSecure).toHaveBeenCalledTimes(1);
    });

    it('force يعيد التهيئة من الخادم', async () => {
        await ensureCsrfSessionReady();
        await ensureCsrfSessionReady({ force: true });
        expect(fetchSecure).toHaveBeenCalledTimes(2);
    });

    it('يجمع النداءات المتزامنة في طلب واحد', async () => {
        let release: (() => void) | undefined;
        fetchSecure.mockImplementation(
            () =>
                new Promise((resolve) => {
                    release = () => resolve({ ok: true, csrfToken: 'B'.repeat(32) });
                }),
        );
        const a = ensureCsrfSessionReady();
        const b = ensureCsrfSessionReady();
        await vi.waitFor(() => expect(typeof release).toBe('function'));
        release?.();
        await Promise.all([a, b]);
        expect(fetchSecure).toHaveBeenCalledTimes(1);
    });

    it('لا يعلّق التهيئة إذا تأخرت جلسة الوصول', async () => {
        vi.useFakeTimers();
        try {
            getCurrentAccessToken.mockReturnValue(new Promise(() => {}));
            const pending = ensureCsrfSessionReady();
            await vi.advanceTimersByTimeAsync(CSRF_ACCESS_TOKEN_BUDGET_MS);
            await pending;
            expect(fetchSecure).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('يعد جلسة الخادم بعد نجاح GET فقط', async () => {
        expect(wasCsrfServerSessionEstablished()).toBe(false);
        await ensureCsrfSessionReady();
        expect(wasCsrfServerSessionEstablished()).toBe(true);
    });

    it('البديل المحلي لا يعد جلسة خادم — لا DELETE لاحق', async () => {
        getCurrentAccessToken.mockResolvedValue(null);
        await ensureCsrfSessionReady();
        expect(fetchSecure).not.toHaveBeenCalled();
        expect(wasCsrfServerSessionEstablished()).toBe(false);
    });
});
