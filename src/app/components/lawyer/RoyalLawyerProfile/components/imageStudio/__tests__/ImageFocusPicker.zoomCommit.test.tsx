import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { ImageFocusPicker } from '@/app/components/lawyer/RoyalLawyerProfile/components/imageStudio/ImageFocusPicker';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileMediaFrame', () => ({
    ProfileMediaFrame: () => <div data-testid="media-frame" />,
}));

const block: ProfileCustomBlock = {
    id: 'img-1',
    type: 'image',
    kind: 'image',
    imageUrl: 'https://cdn.example/a.jpg',
    imageZoom: 120,
    imageFocusX: 50,
    imageFocusY: 50,
};

describe('ImageFocusPicker zoom commit', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('زر التصغير يلغي pending العجلة ولا يُستبدل بعدها', () => {
        const onChange = vi.fn();
        render(<ImageFocusPicker block={block} src="https://cdn.example/a.jpg" onChange={onChange} />);

        const picker = screen.getByTestId('image-focus-picker');
        fireEvent.wheel(picker, { deltaY: -40 }); // +8 → 128 live
        fireEvent.click(screen.getByLabelText('تصغير')); // 128-10 → 118

        expect(onChange).toHaveBeenCalledWith({ imageZoom: 118 });

        act(() => {
            vi.advanceTimersByTime(200);
        });

        const zoomCalls = onChange.mock.calls.filter((c) => c[0]?.imageZoom != null);
        expect(zoomCalls.at(-1)?.[0]).toEqual({ imageZoom: 118 });
        expect(zoomCalls.some((c) => c[0]?.imageZoom === 128)).toBe(false);
    });
});
