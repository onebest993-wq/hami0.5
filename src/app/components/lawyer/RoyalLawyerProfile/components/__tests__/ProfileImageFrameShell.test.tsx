import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { ProfileImageFrameShell } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileImageFrameShell';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';

const block: ProfileCustomBlock = {
    id: 'img-1',
    type: 'image',
    imageUrl: 'https://cdn.example/a.jpg',
    mediaTemplate: 'circle',
    imageFrameStyle: { interaction: 'tilt', rimStyle: 'gold' },
};

describe('ProfileImageFrameShell', () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
    });
    it('يرسم الإطار دون ReferenceError على onTiltEnd', () => {
        const { container } = render(
            <ProfileImageFrameShell
                block={block}
                src="https://cdn.example/a.jpg"
                previewInteractive
            />,
        );
        expect(container.querySelector('[data-profile-media-shell]')).toBeTruthy();
    });

    it('يميل باللمس رغم data-profile-reduce-motion لأندرويد', () => {
        window.matchMedia = vi.fn().mockReturnValue({
            matches: false,
            media: '(prefers-reduced-motion: reduce)',
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        });
        const { container } = render(
            <div data-lawyer-profile-root="" data-profile-reduce-motion="true">
                <ProfileImageFrameShell
                    block={block}
                    src="https://cdn.example/a.jpg"
                    previewInteractive
                />
            </div>,
        );
        const shell = container.querySelector('[data-profile-media-shell]') as HTMLDivElement;
        expect(shell.className).toContain('profile-image-frame-wrap--tilt');
        Object.defineProperty(shell, 'getBoundingClientRect', {
            value: () => ({
                width: 100,
                height: 100,
                top: 0,
                left: 0,
                right: 100,
                bottom: 100,
                x: 0,
                y: 0,
                toJSON() {},
            }),
        });
        fireEvent.pointerDown(shell, {
            pointerId: 2,
            clientX: 80,
            clientY: 20,
            button: -1,
            pointerType: 'touch',
        });
        expect(shell.style.transform).toMatch(/rotateX\(/);
        expect(shell.style.transform).toMatch(/rotateY\(/);
    });
});
