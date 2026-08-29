import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminUser } from '@/app/domain/admin/AdminUser';

const fetchLawyerPersonnelDossier = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('@/app/services/auth/lawyerVerificationRemote', () => ({
    fetchLawyerPersonnelDossier: (...a: unknown[]) => fetchLawyerPersonnelDossier(...a),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        success: (...a: unknown[]) => toastSuccess(...a),
        error: (...a: unknown[]) => toastError(...a),
        warning: vi.fn(),
    },
}));

import { HeadquartersUserDossier } from '../HeadquartersUserDossier';

const lawyer: AdminUser = {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    email: 'lawyer@example.com',
    fullName: 'محام',
    familyName: 'تجريبي',
    phone: '07701234567',
    governorate: 'بغداد',
    lawyerBarRoom: 'غرفة',
    role: 'lawyer',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    freezeUntil: null,
    verificationStatus: 'active',
    previousLegalDisplayName: 'محام قديم كامل',
    legalDisplayNameCorrectedAt: '2026-08-20T00:00:00.000Z',
    legalDisplayNameCorrections: 1,
};

describe('HeadquartersUserDossier', () => {
    beforeEach(() => {
        fetchLawyerPersonnelDossier.mockReset();
        toastError.mockReset();
        toastSuccess.mockReset();
        fetchLawyerPersonnelDossier.mockResolvedValue({
            idFrontPreview: 'data:image/svg+xml;base64,PHN2Zz4=',
            idBackPreview: `data:image/jpeg;base64,${'A'.repeat(80)}`,
            faceSelfiePreview: null,
            fullName: 'اسم قديم من التوثيق',
        });
    });

    it('يرفض صورة SVG ويعرض jpeg، ويمنع حفظ كلمة مرور غير متطابقة', async () => {
        render(
            <HeadquartersUserDossier
                user={lawyer}
                onClose={vi.fn()}
                onSetPassword={vi.fn(async () => true)}
            />,
        );
        await waitFor(() => {
            expect(fetchLawyerPersonnelDossier).toHaveBeenCalled();
        });
        expect(screen.queryByAltText('وجه الهوية')).toBeNull();
        expect(screen.getByAltText('ظهر الهوية')).toBeInTheDocument();
        expect(screen.getByText('تجميد الشبكة')).toBeInTheDocument();
        expect(screen.getByText('قفل الدخول')).toBeInTheDocument();
        expect(screen.getByText('حظر المنتدى')).toBeInTheDocument();
        expect(screen.getByText('حذف نهائي من الدليل')).toBeInTheDocument();
        expect(screen.getByTestId('hq-user-previous-name').textContent).toContain('محام قديم كامل');
        expect(screen.getByTestId('hq-name-mismatch').textContent).toContain('اسم قديم من التوثيق');
        expect(screen.queryByRole('heading', { name: 'اسم قديم من التوثيق' })).not.toBeInTheDocument();
        expect(screen.queryByText(/لا تُوضَع تلقائياً/)).not.toBeInTheDocument();
        expect(screen.queryByText(/يوقف المنتدى والخدمات الشبكية/)).not.toBeInTheDocument();
        expect(screen.queryByText(/يمنع تسجيل الدخول ويُنهي الجلسات/)).not.toBeInTheDocument();
        expect(screen.queryByText(/يمنع المشاركة في المنتدى فقط/)).not.toBeInTheDocument();
        expect(screen.queryByText(/يُقفل الدخول ويُخفى الحساب/)).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('كلمة مرور جديدة'), { target: { value: 'HamiLaw9x' } });
        fireEvent.change(screen.getByLabelText('تأكيد كلمة المرور'), { target: { value: 'HamiLaw9y' } });
        fireEvent.click(screen.getByRole('button', { name: 'حفظ كلمة المرور' }));
        expect(toastError).toHaveBeenCalledWith('تأكيد كلمة المرور غير متطابق');
    });
});
