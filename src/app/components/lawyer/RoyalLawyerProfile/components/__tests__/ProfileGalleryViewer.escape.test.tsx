import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { ProfileGalleryViewer } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileGalleryViewer';

vi.mock('@/app/utils/bodyScrollLock', () => ({
    useBodyScrollLock: vi.fn(),
}));

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileAvatarImage', () => ({
    ProfileAvatarImage: () => <img alt="" data-testid="gallery-img" />,
}));

const item = {
    url: 'https://cdn.example/a.jpg',
    focusX: 50,
    focusY: 50,
    zoom: 100,
};

describe('ProfileGalleryViewer Escape', () => {
    it('Escape من ضبط قادم من العرض يعود للعرض ولا يغلق العارض', () => {
        const onClose = vi.fn();
        render(
            <ProfileGalleryViewer
                item={item}
                open
                canAdjust
                initialMode="view"
                onClose={onClose}
                onSaveAdjust={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByTestId('profile-gallery-adjust-open'));
        expect(screen.getByText('إلغاء')).toBeTruthy();

        act(() => {
            window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
            );
        });

        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByTestId('profile-gallery-adjust-open')).toBeTruthy();
    });

    it('Escape في وضع adjust الابتدائي يغلق العارض', () => {
        const onClose = vi.fn();
        render(
            <ProfileGalleryViewer
                item={item}
                open
                canAdjust
                initialMode="adjust"
                onClose={onClose}
                onSaveAdjust={vi.fn()}
            />,
        );

        act(() => {
            window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
            );
        });

        expect(onClose).toHaveBeenCalled();
    });

    it('وضع العرض يدعم تكبير معاينة مؤقتاً دون حفظ', () => {
        const onSaveAdjust = vi.fn();
        render(
            <ProfileGalleryViewer
                item={item}
                open
                canAdjust
                initialMode="view"
                onClose={vi.fn()}
                onSaveAdjust={onSaveAdjust}
            />,
        );

        expect(screen.getByTestId('profile-gallery-view-zoom-in')).toBeTruthy();
        fireEvent.click(screen.getByTestId('profile-gallery-view-zoom-in'));
        expect(screen.getByText('110%')).toBeTruthy();
        expect(onSaveAdjust).not.toHaveBeenCalled();
    });
});
