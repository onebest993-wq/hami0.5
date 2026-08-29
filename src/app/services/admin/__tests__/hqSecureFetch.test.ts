import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HQ_AUDIT_MISS_MESSAGE, HQ_STEP_UP_CODE } from '@/app/domain/admin/hqStepUp';
import { SecureFetchError } from '@/app/services/SecureFetchError';

const { fetchSecure, promptHqStepUp, toastWarning } = vi.hoisted(() => ({
    fetchSecure: vi.fn(),
    promptHqStepUp: vi.fn(),
    toastWarning: vi.fn(),
}));

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: (...a: unknown[]) => fetchSecure(...a) },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        warning: (...a: unknown[]) => toastWarning(...a),
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/app/components/admin/hqStepUpClient', async () => {
    const actual = await vi.importActual<typeof import('@/app/components/admin/hqStepUpClient')>(
        '@/app/components/admin/hqStepUpClient',
    );
    return {
        ...actual,
        promptHqStepUp: (...a: unknown[]) => promptHqStepUp(...a),
    };
});

import { hqMutatingFetch } from '../hqSecureFetch';

describe('hqMutatingFetch', () => {
    beforeEach(() => {
        fetchSecure.mockReset();
        promptHqStepUp.mockReset();
        toastWarning.mockReset();
        promptHqStepUp.mockResolvedValue(undefined);
    });

    it('يعيد المحاولة بعد تأكيد رمز التحقق', async () => {
        fetchSecure
            .mockRejectedValueOnce(
                new SecureFetchError(
                    'HTTP 403',
                    403,
                    JSON.stringify({ ok: false, code: HQ_STEP_UP_CODE }),
                    '/api/admin/account',
                ),
            )
            .mockResolvedValueOnce({ ok: true });
        await expect(hqMutatingFetch('/api/admin/account', { method: 'POST' })).resolves.toEqual({
            ok: true,
        });
        expect(promptHqStepUp).toHaveBeenCalledTimes(1);
        expect(fetchSecure).toHaveBeenCalledTimes(2);
        expect(toastWarning).not.toHaveBeenCalled();
    });

    it('ينبّه إذا صرّح الخادم أن السجل لم يُكتب', async () => {
        fetchSecure.mockResolvedValueOnce({ ok: true, auditRecorded: false });
        await expect(hqMutatingFetch('/api/admin/account', { method: 'POST' })).resolves.toEqual({
            ok: true,
            auditRecorded: false,
        });
        expect(toastWarning).toHaveBeenCalledWith(HQ_AUDIT_MISS_MESSAGE);
    });
});
