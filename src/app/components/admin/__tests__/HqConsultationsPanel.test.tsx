import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecure = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: (...a: unknown[]) => fetchSecure(...a) },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/security/ensureCsrfSessionReady', () => ({
    ensureCsrfSessionReady: vi.fn(async () => undefined),
}));

import { HqConsultationsPanel } from '../HqConsultationsPanel';

describe('HqConsultationsPanel', () => {
    beforeEach(() => {
        fetchSecure.mockReset();
    });

    it('يظهر ختم القص عندما تعيد المنشورات capped', async () => {
        fetchSecure.mockResolvedValue({
            ok: true,
            consultations: [],
            capped: true,
        });
        render(<HqConsultationsPanel />);
        expect(
            await screen.findByText('القائمة مقصوصة عند سقف المقر — الأقدم قد لا يظهر.'),
        ).toBeInTheDocument();
    });
});
