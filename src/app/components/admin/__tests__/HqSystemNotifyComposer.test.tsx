import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HAMI_PLATFORM_ADMIN_UUID } from '@/app/constants/hamiPlatformAdminId';
import type { AdminUser } from '@/app/domain/admin/AdminUser';
import { HqSystemNotifyComposer } from '../HqSystemNotifyComposer';

const lawyer: AdminUser = {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    email: 'lawyer@example.com',
    fullName: 'محام',
    familyName: 'تجريبي',
    phone: '',
    governorate: '',
    lawyerBarRoom: '',
    role: 'lawyer',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    freezeUntil: null,
    verificationStatus: 'active',
};

const admin: AdminUser = {
    ...lawyer,
    id: HAMI_PLATFORM_ADMIN_UUID,
    email: 'hami.apps@proton.me',
    fullName: 'إدارة',
    familyName: '',
    role: 'admin',
    verificationStatus: 'none',
};

describe('HqSystemNotifyComposer', () => {
    it('يستبعد حسابات الإدارة من التحديد', () => {
        render(<HqSystemNotifyComposer users={[admin, lawyer]} onSend={vi.fn(async () => true)} />);
        expect(screen.getByTestId(`hq-system-notify-user-${lawyer.id}`)).toBeInTheDocument();
        expect(screen.queryByTestId(`hq-system-notify-user-${admin.id}`)).toBeNull();
    });

    it('يرسل للمحددين بعد العنوان والنص', async () => {
        const onSend = vi.fn(async () => true);
        render(<HqSystemNotifyComposer users={[lawyer]} onSend={onSend} />);
        fireEvent.change(screen.getByTestId('hq-system-notify-title'), { target: { value: 'صيانة' } });
        fireEvent.change(screen.getByTestId('hq-system-notify-message'), { target: { value: 'نص كافٍ للإشعار' } });
        fireEvent.click(screen.getByTestId(`hq-system-notify-user-${lawyer.id}`));
        fireEvent.click(screen.getByTestId('hq-system-notify-send'));
        await waitFor(() => {
            expect(onSend).toHaveBeenCalledWith(
                expect.objectContaining({
                    scope: 'users',
                    userIds: [lawyer.id],
                    title: 'صيانة',
                }),
            );
        });
    });
});
