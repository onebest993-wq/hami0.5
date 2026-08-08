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
        fireEvent.click(screen.getByTestId('forum-access-back'));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('لا يعرض زر الرجوع بدون onBack', () => {
        render(
            <CommunityScreenAccessGate showLoadingShell={false} canAccessLawyerForum={false} />,
        );
        expect(screen.queryByTestId('forum-access-back')).not.toBeInTheDocument();
    });
});
