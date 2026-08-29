import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ProfileAvatarImage } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileAvatarImage';

describe('ProfileAvatarImage', () => {
    it('مع reveal=fade يبقى الحرف ظاهراً والصورة مخفية حتى onLoad', () => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            configurable: true,
            value: (query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: () => undefined,
                removeListener: () => undefined,
                addEventListener: () => undefined,
                removeEventListener: () => undefined,
                dispatchEvent: () => false,
            }),
        });
        render(
            <ProfileAvatarImage
                src="https://cdn.example/avatar.jpg"
                alt="صورة شخصية"
                fallback={<span data-testid="avatar-fallback">أ</span>}
                reveal="fade"
            />,
        );
        const img = screen.getByAltText('صورة شخصية');
        expect(img.style.visibility).toBe('hidden');
        expect(img.style.opacity).toBe('0');
        expect(screen.getByTestId('avatar-fallback')).toBeTruthy();
        fireEvent.load(img);
        expect(img.style.visibility).toBe('visible');
        expect(img.style.opacity).toBe('1');
    });

    it('يرسم https بعد التنقية', () => {
        render(<ProfileAvatarImage src="https://cdn.example/avatar.jpg" alt="صورة شخصية" />);
        const img = screen.getByAltText('صورة شخصية');
        expect(img).toHaveAttribute('src', 'https://cdn.example/avatar.jpg');
        expect(img).toHaveAttribute('loading', 'eager');
        expect(img).toHaveAttribute('referrerPolicy', 'no-referrer');
    });

    it('lazy للمعرض وpriority للبلاطة', () => {
        const { rerender } = render(
            <ProfileAvatarImage src="https://cdn.example/g.jpg" alt="معرض" lazy />,
        );
        expect(screen.getByAltText('معرض')).toHaveAttribute('loading', 'lazy');
        rerender(
            <ProfileAvatarImage src="https://cdn.example/g.jpg" alt="معرض" priority />,
        );
        expect(screen.getByAltText('معرض')).toHaveAttribute('loading', 'eager');
        expect(screen.getByAltText('معرض')).toHaveAttribute('decoding', 'sync');
        expect(screen.getByAltText('معرض')).toHaveAttribute('fetchpriority', 'high');
    });

    it('بدون priority يفكّ بشكل غير متزامن', () => {
        render(<ProfileAvatarImage src="https://cdn.example/a.jpg" alt="شخص" />);
        expect(screen.getByAltText('شخص')).toHaveAttribute('decoding', 'async');
        expect(screen.getByAltText('شخص')).not.toHaveAttribute('fetchpriority');
    });

    it('يرفض javascript وblob الظاهر كمصدر مخزّن ويعرض الاحتياطي', () => {
        const { rerender } = render(
            <ProfileAvatarImage
                src="javascript:alert(1)"
                fallback={<span data-testid="avatar-fallback">احتياطي</span>}
            />,
        );
        expect(screen.getByTestId('avatar-fallback')).toBeTruthy();
        expect(document.querySelector('img')).toBeNull();

        rerender(
            <ProfileAvatarImage
                src="blob:http://localhost:8080/abc"
                fallback={<span data-testid="avatar-fallback">احتياطي</span>}
            />,
        );
        expect(screen.getByTestId('avatar-fallback')).toBeTruthy();
        expect(document.querySelector('img')).toBeNull();
    });

    it('عند onError يظهر الاحتياطي', () => {
        render(
            <ProfileAvatarImage
                src="https://cdn.example/broken.jpg"
                alt="شخص"
                fallback={<span data-testid="avatar-fallback">حرف</span>}
            />,
        );
        fireEvent.error(screen.getByAltText('شخص'));
        expect(screen.getByTestId('avatar-fallback')).toBeTruthy();
        expect(screen.queryByAltText('شخص')).toBeNull();
    });

    it('src فارغ لا يرمي ويظهر الاحتياطي', () => {
        render(
            <ProfileAvatarImage src="" fallback={<span data-testid="avatar-fallback">فارغ</span>} />,
        );
        expect(screen.getByTestId('avatar-fallback')).toBeTruthy();
    });
});
