import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HAMI_PLATFORM_ADMIN_UUID } from '@/app/constants/hamiPlatformAdminId';
import type { AdminUser } from '@/app/domain/admin/AdminUser';

const refresh = vi.fn();
const freezeAccount = vi.fn(async () => true);
const unfreezeAccount = vi.fn(async () => true);
const changeRole = vi.fn(async () => true);

vi.mock('@/app/services/auth/lawyerVerificationRemote', () => ({
    fetchLawyerPersonnelDossier: vi.fn(async () => null),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/components/admin/useHeadquarters', () => ({
    useHeadquarters: () => ({
        users: [
            {
                id: HAMI_PLATFORM_ADMIN_UUID,
                email: 'hami.apps@proton.me',
                fullName: 'إدارة',
                familyName: '',
                phone: '',
                governorate: '',
                lawyerBarRoom: '',
                role: 'admin',
                status: 'active',
                createdAt: '2026-01-01T00:00:00.000Z',
                freezeUntil: null,
                verificationStatus: 'none',
            } satisfies AdminUser,
            {
                id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                email: 'lawyer@example.com',
                fullName: 'محام',
                familyName: 'تجريبي',
                phone: '07701234567',
                governorate: 'بغداد',
                lawyerBarRoom: '',
                role: 'lawyer',
                status: 'active',
                createdAt: '2026-01-01T00:00:00.000Z',
                freezeUntil: null,
                verificationStatus: 'active',
                publicVerifiedBadge: true,
            } satisfies AdminUser,
        ],
        loading: false,
        refreshing: false,
        error: null,
        mutatingUserId: null,
        mutating: false,
        capped: false,
        refresh,
        changeRole,
        freezeAccount,
        unfreezeAccount,
        revokeSessions: vi.fn(async () => true),
        setPassword: vi.fn(async () => true),
        sendSystemNotice: vi.fn(async () => ({ sent: 1, failed: 0, capped: false })),
        lockLogin: vi.fn(async () => true),
        unlockLogin: vi.fn(async () => true),
        softDeleteAccount: vi.fn(async () => true),
        restoreAccount: vi.fn(async () => true),
        banForum: vi.fn(async () => true),
        unbanForum: vi.fn(async () => true),
        setPublicVerifiedBadge: vi.fn(async () => true),
        fetchAccountActivity: vi.fn(async () => null),
    }),
}));

import { HeadquartersPanel } from '../HeadquartersPanel';

const LAWYER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('HeadquartersPanel', () => {
    it('لا يعرض تجميد أو تغيير دور لحساب الإدارة', () => {
        render(<HeadquartersPanel />);
        expect(screen.queryByRole('combobox')).toBeTruthy();
        expect(screen.getAllByRole('combobox')).toHaveLength(1);
        expect(screen.getByRole('button', { name: /تجميد/ })).toBeInTheDocument();
        expect(screen.getByTestId('accredited-lawyer-mark')).toBeInTheDocument();
        expect(screen.queryByLabelText(/ترقية صلاحية إدارة/)).toBeNull();
    });

    it('يعرض الدليل كبطاقات مجمّعة لا كجدول أفقي', () => {
        render(<HeadquartersPanel />);
        expect(document.querySelector('table')).toBeNull();
        expect(screen.getByTestId('hq-dir-filters')).toBeInTheDocument();
        expect(screen.getByText('تاريخ الإنشاء')).toBeInTheDocument();
        expect(screen.getByLabelText('دليل الحسابات')).toBeInTheDocument();
        expect(screen.getByText('بغداد')).toBeInTheDocument();
        expect(screen.getByTestId(`hq-user-open-${LAWYER_ID}`).closest('article')).toBeTruthy();
        expect(screen.getByText('معتمد')).toBeInTheDocument();
        expect(screen.getByText('بلا طلب')).toBeInTheDocument();
        expect(screen.getByText('قيد التدقيق')).toBeInTheDocument();
    });

    it('يبحث في البريد والاسم ويغلق الإضبارة بـ Escape', async () => {
        render(<HeadquartersPanel />);
        const search = screen.getByLabelText('بحث في المستخدمين');
        fireEvent.change(search, { target: { value: 'lawyer@example.com' } });
        expect(screen.getByTestId(`hq-user-open-${LAWYER_ID}`)).toBeInTheDocument();
        expect(screen.queryByTestId(`hq-user-open-${HAMI_PLATFORM_ADMIN_UUID}`)).toBeNull();

        fireEvent.change(search, { target: { value: 'بغداد' } });
        expect(screen.getByTestId(`hq-user-open-${LAWYER_ID}`)).toBeInTheDocument();
        expect(screen.getByTestId(`hq-system-notify-user-${LAWYER_ID}`)).toBeInTheDocument();

        fireEvent.click(screen.getByTestId(`hq-user-open-${LAWYER_ID}`));
        await waitFor(() => {
            expect(screen.getByTestId('hq-user-dossier')).toBeInTheDocument();
        });
        expect(
            screen.getByTestId(`hq-user-open-${LAWYER_ID}`).closest('.hq-dir-item')?.querySelector(
                '[data-testid="hq-user-dossier"]',
            ),
        ).toBeTruthy();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByTestId('hq-user-dossier')).not.toBeInTheDocument();
    });

    it('يفتح الإضبارة من تفاصيل البطاقة ويبقي بقية الدليل عند الانتقال لمعرّف', async () => {
        const { rerender } = render(<HeadquartersPanel />);
        fireEvent.click(screen.getByText('بغداد'));
        await waitFor(() => {
            expect(screen.getByTestId('hq-user-dossier')).toBeInTheDocument();
        });
        rerender(<HeadquartersPanel focusUserId={LAWYER_ID} />);
        await waitFor(() => {
            expect(screen.getByTestId(`hq-user-open-${HAMI_PLATFORM_ADMIN_UUID}`)).toBeInTheDocument();
        });
        expect(screen.getByLabelText('بحث في المستخدمين')).toHaveValue('');
    });

    it('يعرض مسح التصفية عندما لا يطابق أحد الحسابات المحمّلة', () => {
        render(<HeadquartersPanel />);
        const frozenChip = Array.from(
            screen.getByTestId('hq-dir-filters').querySelectorAll('button'),
        ).find((btn) => btn.textContent === 'موقوف');
        expect(frozenChip).toBeTruthy();
        fireEvent.click(frozenChip!);
        expect(screen.getByTestId('hq-dir-clear-filters')).toBeInTheDocument();
        expect(screen.getByText('لا يوجد مستخدمون مطابقون')).toBeInTheDocument();
    });
});
