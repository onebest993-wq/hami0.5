import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HeadquartersUserRow } from '@/app/components/admin/HeadquartersUserRow';
import type { AdminUser } from '@/app/domain/admin/AdminUser';

const base: AdminUser = {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    email: 'ahmedm.abdullah@yahoo.com',
    fullName: 'محمد عبد الحسين',
    familyName: 'وجدان المياحي',
    phone: '',
    governorate: 'بغداد',
    lawyerBarRoom: '',
    role: 'lawyer',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    freezeUntil: null,
    verificationStatus: 'pending',
};

describe('HeadquartersUserRow — اعتماد', () => {
    const noop = vi.fn();

    it('لا يظهر علامة الاعتماد من حالة الهوية وحدها', () => {
        render(
            <HeadquartersUserRow
                user={{ ...base, verificationStatus: 'active' }}
                busy={false}
                locked={false}
                pickingFreeze={false}
                onOpen={noop}
                onRoleChange={noop}
                onFreeze={noop}
                onUnfreeze={noop}
                onToggleFreezePicker={noop}
                onTogglePublicBadge={noop}
            />,
        );
        expect(screen.getByText('معتمد')).toBeInTheDocument();
        expect(screen.queryByTestId('accredited-lawyer-mark')).toBeNull();
        expect(screen.getByTestId(`hq-public-badge-${base.id}`)).toHaveAttribute('aria-pressed', 'false');
    });

    it('يظهر علامة صح على الصورة بعد وضع المقر لها', () => {
        render(
            <HeadquartersUserRow
                user={{ ...base, verificationStatus: 'pending', publicVerifiedBadge: true }}
                busy={false}
                locked={false}
                pickingFreeze={false}
                onOpen={noop}
                onRoleChange={noop}
                onFreeze={noop}
                onUnfreeze={noop}
                onToggleFreezePicker={noop}
                onTogglePublicBadge={noop}
            />,
        );
        expect(screen.getByText('قيد التدقيق')).toBeInTheDocument();
        expect(screen.getByTestId('accredited-lawyer-mark')).toHaveAttribute('aria-label', 'محامٍ معتمد');
        expect(screen.getByTestId(`hq-public-badge-${base.id}`)).toHaveAttribute('aria-pressed', 'true');
    });

    it('المحامي بلا صف KV يظهر بلا طلب لا قيد التدقيق', () => {
        render(
            <HeadquartersUserRow
                user={{ ...base, verificationStatus: 'none' }}
                busy={false}
                locked={false}
                pickingFreeze={false}
                onOpen={noop}
                onRoleChange={noop}
                onFreeze={noop}
                onUnfreeze={noop}
                onToggleFreezePicker={noop}
                onTogglePublicBadge={noop}
            />,
        );
        expect(screen.getByText('بلا طلب')).toBeInTheDocument();
        expect(screen.queryByText('قيد التدقيق')).toBeNull();
    });

    it('يظهر الاسم السابق على بطاقة الدليل بعد التصحيح', () => {
        render(
            <HeadquartersUserRow
                user={{
                    ...base,
                    fullName: 'علي حسن محمد',
                    previousLegalDisplayName: 'علي محمد حسن',
                    legalDisplayNameCorrectedAt: '2026-08-20T00:00:00.000Z',
                    legalDisplayNameCorrections: 1,
                }}
                busy={false}
                locked={false}
                pickingFreeze={false}
                onOpen={noop}
                onRoleChange={noop}
                onFreeze={noop}
                onUnfreeze={noop}
                onToggleFreezePicker={noop}
                onTogglePublicBadge={noop}
            />,
        );
        expect(screen.getByText('علي حسن محمد وجدان المياحي')).toBeInTheDocument();
        expect(screen.getByTestId(`hq-user-previous-name-${base.id}`).textContent).toContain('علي محمد حسن');
    });

    it('ينبّه عند اختلاف الاسم الحي عن اسم طلب التوثيق', () => {
        render(
            <HeadquartersUserRow
                user={{
                    ...base,
                    fullName: 'علي حسن محمد',
                    kycSubmittedName: 'علي محمد حسن',
                }}
                busy={false}
                locked={false}
                pickingFreeze={false}
                onOpen={noop}
                onRoleChange={noop}
                onFreeze={noop}
                onUnfreeze={noop}
                onToggleFreezePicker={noop}
                onTogglePublicBadge={noop}
            />,
        );
        expect(screen.getByTestId('hq-name-mismatch').textContent).toContain('علي حسن محمد');
        expect(screen.getByTestId('hq-name-mismatch').textContent).toContain('علي محمد حسن');
    });

    it('يفتح الإضبارة عند الضغط على تفاصيل البطاقة لا الأزرار', () => {
        const onOpen = vi.fn();
        const onFreeze = vi.fn();
        render(
            <HeadquartersUserRow
                user={base}
                busy={false}
                locked={false}
                pickingFreeze={false}
                onOpen={onOpen}
                onRoleChange={noop}
                onFreeze={onFreeze}
                onUnfreeze={noop}
                onToggleFreezePicker={noop}
                onTogglePublicBadge={noop}
            />,
        );
        fireEvent.click(screen.getByText('بغداد'));
        expect(onOpen).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByRole('button', { name: /تجميد/ }));
        expect(onOpen).toHaveBeenCalledTimes(1);
    });
});
