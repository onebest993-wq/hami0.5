import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
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
});
