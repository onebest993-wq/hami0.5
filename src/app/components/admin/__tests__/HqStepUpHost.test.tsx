import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HqStepUpCancelledError, promptHqStepUp } from '@/app/components/admin/hqStepUpClient';

const requestAdminHeadquartersOtp = vi.fn();
const verifyAdminHeadquartersOtp = vi.fn();

vi.mock('@/app/services/admin/adminHeadquartersOtpClient', () => ({
    requestAdminHeadquartersOtp: (...a: unknown[]) => requestAdminHeadquartersOtp(...a),
    verifyAdminHeadquartersOtp: (...a: unknown[]) => verifyAdminHeadquartersOtp(...a),
}));

import { HqStepUpHost } from '../HqStepUpHost';

describe('HqStepUpHost', () => {
    beforeEach(() => {
        requestAdminHeadquartersOtp.mockReset();
        verifyAdminHeadquartersOtp.mockReset();
        requestAdminHeadquartersOtp.mockResolvedValue({ ok: true, delivered: true });
        verifyAdminHeadquartersOtp.mockResolvedValue({ ok: true });
    });

    it('يفتح غطاء الرمز عند الطلب ويلغي الانتظار عند الإلغاء', async () => {
        render(<HqStepUpHost />);
        let pending: Promise<void> | undefined;
        await act(async () => {
            pending = promptHqStepUp();
        });
        expect(await screen.findByTestId('hq-stepup-host')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('تم إرسال الرمز. صالح لدقائق معدودة.')).toBeInTheDocument();
        });
        const cancelled = expect(pending).rejects.toBeInstanceOf(HqStepUpCancelledError);
        await act(async () => {
            fireEvent.click(screen.getByTestId('hq-stepup-cancel'));
        });
        await cancelled;
        expect(screen.queryByTestId('hq-stepup-host')).not.toBeInTheDocument();
    });
});
