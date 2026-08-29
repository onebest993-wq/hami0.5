import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchLawyerVerifications, fetchLawyerPersonnelDossier, patchLawyerVerificationStatus } = vi.hoisted(() => ({
    fetchLawyerVerifications: vi.fn(),
    fetchLawyerPersonnelDossier: vi.fn(),
    patchLawyerVerificationStatus: vi.fn(),
}));

vi.mock('@/app/services/auth/lawyerVerificationRemote', () => ({
    fetchLawyerVerifications: (...a: unknown[]) => fetchLawyerVerifications(...a),
    fetchLawyerPersonnelDossier: (...a: unknown[]) => fetchLawyerPersonnelDossier(...a),
    patchLawyerVerificationStatus: (...a: unknown[]) => patchLawyerVerificationStatus(...a),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/security/ensureCsrfSessionReady', () => ({
    ensureCsrfSessionReady: vi.fn(async () => undefined),
}));

import { AdminLawyerVerificationRequests } from '../AdminLawyerVerificationRequests';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { HQ_STATUS_REFRESH_EVENT, HQ_VERIFICATION_CHANGED_EVENT } from '@/app/components/admin/hqStatusEvents';

const preview = `data:image/jpeg;base64,${'A'.repeat(80)}`;

describe('AdminLawyerVerificationRequests', () => {
    beforeEach(() => {
        fetchLawyerVerifications.mockReset();
        fetchLawyerPersonnelDossier.mockReset();
        patchLawyerVerificationStatus.mockReset();
        patchLawyerVerificationStatus.mockResolvedValue({ ok: true });
        fetchLawyerVerifications.mockResolvedValue(
            Object.assign(
                [
                    { userId: 'u-pending', status: 'pending', fullName: 'معلّق', hasIdFront: true, hasIdBack: true },
                    { userId: 'u-active', status: 'active', fullName: 'معتمد' },
                    { userId: 'u-rejected', status: 'rejected', fullName: 'مرفوض', rejectionReason: 'سبب كافٍ' },
                ],
                { capped: false },
            ),
        );
        fetchLawyerPersonnelDossier.mockResolvedValue({
            idFrontPreview: preview,
            idBackPreview: preview,
            faceSelfiePreview: null,
        });
    });

    it('يطبق تصفية التوثيق الابتدائية من قفزة الإحصائيات', async () => {
        render(<AdminLawyerVerificationRequests initialStatusFilter="active" />);
        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 3, name: /معتمد/ })).toBeInTheDocument();
        });
        expect(screen.queryByRole('heading', { level: 3, name: /معلّق/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 3, name: /مرفوض/ })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'معتمد (1)' })).toHaveClass('hq-chip-active');
    });

    it('لا يعرض صور الهوية في البطاقة ويفتح معاينة مضبوطة عند الطلب', async () => {
        render(<AdminLawyerVerificationRequests initialStatusFilter="pending" />);
        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 3, name: /معلّق/ })).toBeInTheDocument();
        });
        expect(screen.queryByAltText('وجه هوية النقابة')).not.toBeInTheDocument();
        expect(screen.queryByTestId('hq-verify-peek')).not.toBeInTheDocument();
        expect(document.querySelector('img')).toBeNull();

        fireEvent.click(screen.getByTestId('hq-verify-peek-open'));
        await waitFor(() => {
            expect(screen.getByTestId('hq-verify-peek')).toBeInTheDocument();
        });
        expect(fetchLawyerPersonnelDossier).toHaveBeenCalledWith('u-pending', expect.any(AbortSignal));
        const img = screen.getByAltText('وجه الهوية');
        expect(img).toHaveClass('hq-verify-frame-img');
        expect(img).not.toHaveClass('object-cover');
        expect(screen.getByTestId('hq-verify-stage')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('hq-verify-zoom-in'));
        expect(screen.getByLabelText('إعادة الحجم')).toHaveTextContent('150٪');
        fireEvent.click(screen.getByTestId('hq-verify-immersive'));
        expect(screen.getByTestId('hq-verify-peek')).toHaveClass('hq-verify-peek-immersive');
    });

    it('يمنع قبول طلب بلا وجه وظهر هوية النقابة', async () => {
        fetchLawyerVerifications.mockResolvedValue([
            { userId: 'u-incomplete', status: 'pending', fullName: 'ناقص', hasIdFront: true, hasIdBack: false },
        ]);
        render(<AdminLawyerVerificationRequests initialStatusFilter="pending" />);
        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 3, name: /ناقص/ })).toBeInTheDocument();
        });
        const approve = screen.getByRole('button', { name: 'القبول يحتاج وجه وظهر هوية النقابة' });
        expect(approve).toBeDisabled();
        fireEvent.click(approve);
        expect(patchLawyerVerificationStatus).not.toHaveBeenCalled();
    });

    it('بعد الاعتماد يحدّث الصف من الخادم دون كتابة تخزين المحامي المحلي', async () => {
        render(<AdminLawyerVerificationRequests initialStatusFilter="pending" />);
        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 3, name: /معلّق/ })).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: 'قبول' }));
        await waitFor(() => {
            expect(patchLawyerVerificationStatus).toHaveBeenCalledWith({
                userId: 'u-pending',
                status: 'active',
                rejectionReason: undefined,
            });
        });
        expect(SmartToast.success).toHaveBeenCalled();
        expect(fetchLawyerVerifications.mock.calls.length).toBeGreaterThan(1);
    });

    it('بعد الاعتماد يبث حالة التوثيق لدليل المستخدمين', async () => {
        const spy = vi.fn();
        window.addEventListener(HQ_VERIFICATION_CHANGED_EVENT, spy);
        try {
            render(<AdminLawyerVerificationRequests initialStatusFilter="pending" />);
            await waitFor(() => {
                expect(screen.getByRole('heading', { level: 3, name: /معلّق/ })).toBeInTheDocument();
            });
            fireEvent.click(screen.getByRole('button', { name: 'قبول' }));
            await waitFor(() => {
                expect(spy).toHaveBeenCalled();
            });
            const event = spy.mock.calls[0]?.[0] as CustomEvent;
            expect(event.detail).toEqual({ userId: 'u-pending', status: 'active' });
        } finally {
            window.removeEventListener(HQ_VERIFICATION_CHANGED_EVENT, spy);
        }
    });

    it('يعيد جلب الطابور بعد طفرة من تبويب آخر في المقر', async () => {
        render(<AdminLawyerVerificationRequests initialStatusFilter="pending" />);
        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 3, name: /معلّق/ })).toBeInTheDocument();
        });
        const before = fetchLawyerVerifications.mock.calls.length;
        await act(async () => {
            window.dispatchEvent(new Event(HQ_STATUS_REFRESH_EVENT));
        });
        await waitFor(() => {
            expect(fetchLawyerVerifications.mock.calls.length).toBeGreaterThan(before);
        });
    });
});
