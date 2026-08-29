import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { CommunityScreenAccessGate } from '../components/CommunityScreenAccessGate';

describe('CommunityScreenAccessGate', () => {
    it('يعرض زر الرجوع أثناء التحميل عند توفر onBack', () => {
        const onBack = vi.fn();
        render(
            <CommunityScreenAccessGate showLoadingShell canAccessLawyerForum={false} onBack={onBack} />,
        );
        fireEvent.click(screen.getByTestId('forum-access-back'));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('يعرض زر الرجوع عند رفض الوصول', () => {
        const onBack = vi.fn();
        render(
            <CommunityScreenAccessGate
                showLoadingShell={false}
                canAccessLawyerForum={false}
                onBack={onBack}
            />,
        );
        expect(screen.getByTestId('forum-access-denied')).toBeInTheDocument();
        expect(screen.getByText('المنتدى مغلق')).toBeInTheDocument();
        expect(screen.getByText(/لفتح المنتدى يلزم تسجيل الدخول/)).toBeInTheDocument();
        expect(screen.getByTestId('forum-access-go-login')).toBeInTheDocument();
        expect(screen.getByTestId('forum-access-go-register')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('forum-access-back'));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('يعرض رسالة تجميد الحساب دون أزرار الدخول', () => {
        const onBack = vi.fn();
        render(
            <CommunityScreenAccessGate
                showLoadingShell={false}
                canAccessLawyerForum
                accountFrozen
                frozenMessage="تم تجميد حسابك من مقر القيادة."
                onBack={onBack}
            />,
        );
        expect(screen.getByTestId('forum-access-frozen')).toBeInTheDocument();
        expect(screen.getByText('تم تجميد حسابك')).toBeInTheDocument();
        expect(screen.queryByTestId('forum-access-go-login')).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId('forum-access-back'));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('يميّز قفل الدخول والحذف عن تجميد الشبكة', () => {
        const { rerender } = render(
            <CommunityScreenAccessGate
                showLoadingShell={false}
                canAccessLawyerForum
                accountFrozen
                frozenMessage="تم قفل الدخول إلى حسابك حتى ١ أيلول."
            />,
        );
        expect(screen.getByText('قُفل الدخول إلى حسابك')).toBeInTheDocument();

        rerender(
            <CommunityScreenAccessGate
                showLoadingShell={false}
                canAccessLawyerForum
                accountFrozen
                frozenMessage="أُقفل الحساب وأُخفي من الدليل. الدعاوى والمعاملات لم تُحذف."
            />,
        );
        expect(screen.getByText('قُفل الدخول إلى حسابك')).toBeInTheDocument();
        expect(screen.getByText(/أُخفي من الدليل/)).toBeInTheDocument();
    });

    it('يعرض قيد التدقيق للمحامي غير المعتمد دون أزرار الدخول', () => {
        const onBack = vi.fn();
        render(
            <CommunityScreenAccessGate
                showLoadingShell={false}
                canAccessLawyerForum={false}
                forumDenial="pending"
                onBack={onBack}
            />,
        );
        expect(screen.getByTestId('forum-access-pending')).toBeInTheDocument();
        expect(screen.getByText('حسابك قيد التدقيق')).toBeInTheDocument();
        expect(screen.queryByTestId('forum-access-go-login')).not.toBeInTheDocument();
        expect(screen.queryByTestId('forum-access-denied')).not.toBeInTheDocument();
    });

    it('يعرض الرفض دون أزرار الدخول', () => {
        render(
            <CommunityScreenAccessGate
                showLoadingShell={false}
                canAccessLawyerForum={false}
                forumDenial="rejected"
            />,
        );
        expect(screen.getByTestId('forum-access-rejected')).toBeInTheDocument();
        expect(screen.getByText('لم يُعتمد الحساب')).toBeInTheDocument();
        expect(screen.queryByTestId('forum-access-go-register')).not.toBeInTheDocument();
    });

    it('لا يعرض زر الرجوع بدون onBack', () => {
        render(
            <CommunityScreenAccessGate showLoadingShell={false} canAccessLawyerForum={false} />,
        );
        expect(screen.queryByTestId('forum-access-back')).not.toBeInTheDocument();
    });
});
