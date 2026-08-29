import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HQ_FOLD_STORAGE_KEY } from '@/app/components/admin/useHqFold';
import { clearPrimedHeadquartersStatus } from '@/app/services/admin/hqDevSessionPrime';

const fetchSecure = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: (...a: unknown[]) => fetchSecure(...a) },
}));

vi.mock('@/app/security/ensureCsrfSessionReady', () => ({
    ensureCsrfSessionReady: vi.fn(async () => undefined),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/app/domain/admin/deviceTrust', () => ({
    DeviceTrustService: { revokeDeviceTrust: vi.fn() },
}));

import { HqTrustedDevicesPanel } from '../HqTrustedDevicesPanel';

describe('HqTrustedDevicesPanel', () => {
    beforeEach(() => {
        sessionStorage.removeItem(HQ_FOLD_STORAGE_KEY);
        clearPrimedHeadquartersStatus();
        fetchSecure.mockReset();
    });

    it('يعرض تاريخ التوثيق وآخر الدخول وانتهاء الثقة للجهاز الحالي', async () => {
        fetchSecure.mockResolvedValueOnce({
            ok: true,
            devices: [
                {
                    id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
                    hint: '6952…1a9f',
                    label: null,
                    trustedAt: '2026-08-27T18:44:00.000Z',
                    expiresAt: '2026-09-26T18:44:00.000Z',
                    lastSeenAt: '2026-08-27T18:44:00.000Z',
                    current: true,
                    expired: false,
                },
            ],
        });
        render(<HqTrustedDevicesPanel />);
        await waitFor(() => {
            expect(screen.getByTestId('hq-trusted-device-current')).toBeInTheDocument();
        });
        expect(screen.getByText('هذا الجهاز — المتصفح الحالي')).toBeInTheDocument();
        expect(screen.getByText('وُثّق في')).toBeInTheDocument();
        expect(screen.getByText('آخر دخول للمقر')).toBeInTheDocument();
        expect(screen.getByText('تنتهي الثقة')).toBeInTheDocument();
        expect(screen.getByText('رمز تفريق مختصر')).toBeInTheDocument();
        expect(screen.getByText('الحالي')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'سحب الثقة' })).toBeInTheDocument();
    });

    it('يرسم الأجهزة المُجهَّزة دون جلب إضافي', async () => {
        const { primeHeadquartersDevices } = await import('@/app/services/admin/hqDevSessionPrime');
        primeHeadquartersDevices([
            {
                id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
                hint: '6952…1a9f',
                label: null,
                trustedAt: '2026-08-27T18:44:00.000Z',
                expiresAt: '2026-09-26T18:44:00.000Z',
                lastSeenAt: '2026-08-27T18:44:00.000Z',
                current: true,
                expired: false,
            },
        ]);
        render(<HqTrustedDevicesPanel />);
        expect(await screen.findByTestId('hq-trusted-device-current')).toBeInTheDocument();
        await waitFor(() => expect(fetchSecure).not.toHaveBeenCalled());
    });
});
