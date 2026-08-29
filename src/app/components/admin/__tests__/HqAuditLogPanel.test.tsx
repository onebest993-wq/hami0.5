import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HQ_FOLD_STORAGE_KEY } from '@/app/components/admin/useHqFold';
import { clearPrimedHeadquartersStatus, primeHeadquartersAudit } from '@/app/services/admin/hqDevSessionPrime';

const fetchSecure = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: (...a: unknown[]) => fetchSecure(...a) },
}));

vi.mock('@/app/security/ensureCsrfSessionReady', () => ({
    ensureCsrfSessionReady: vi.fn(async () => undefined),
}));

import { HqAuditLogPanel } from '../HqAuditLogPanel';

describe('HqAuditLogPanel', () => {
    beforeEach(() => {
        sessionStorage.removeItem(HQ_FOLD_STORAGE_KEY);
        clearPrimedHeadquartersStatus();
        fetchSecure.mockReset();
    });

    it('يرسم السجل المُجهَّز دون جلب إضافي', async () => {
        primeHeadquartersAudit([
            {
                id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                action: 'hq:user.freeze',
                actorId: 'actor',
                targetId: 'target',
                createdAt: '2026-08-27T18:44:00.000Z',
            },
        ]);
        render(<HqAuditLogPanel />);
        expect(await screen.findByText('تجميد حساب')).toBeInTheDocument();
        await waitFor(() => expect(fetchSecure).not.toHaveBeenCalled());
    });

    it('يعرض تصحيح الاسم السابق واللاحق في السجل', async () => {
        primeHeadquartersAudit([
            {
                id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
                action: 'hq:user.display_name_correct',
                actorId: 'actor',
                targetId: 'target',
                createdAt: '2026-08-20T00:00:00.000Z',
                details: { from: 'علي محمد حسن', to: 'علي حسن محمد' },
            },
        ]);
        render(<HqAuditLogPanel />);
        expect(await screen.findByText('تصحيح الاسم الثلاثي')).toBeInTheDocument();
        expect(screen.getByText('من «علي محمد حسن» إلى «علي حسن محمد»')).toBeInTheDocument();
        await waitFor(() => expect(fetchSecure).not.toHaveBeenCalled());
    });

    it('يصرّح أن السجل الفارغ قد يعني أن الكتابة لم تتم', async () => {
        fetchSecure.mockResolvedValue({ ok: true, entries: [] });
        render(<HqAuditLogPanel />);
        expect(await screen.findByText('لا عمليات مسجّلة بعد.')).toBeInTheDocument();
        expect(
            screen.getByText('إن نفّذت إجراء مقر ولم يظهر هنا فكتابة السجل لم تتم.'),
        ).toBeInTheDocument();
    });
});
