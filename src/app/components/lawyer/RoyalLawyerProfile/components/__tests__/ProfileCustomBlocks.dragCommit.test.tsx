import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { ProfileCustomBlocks } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileCustomBlocks';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileCustomBlockView', () => ({
    ProfileCustomBlockView: () => <div data-testid="block-view" />,
}));

const blocks: ProfileCustomBlock[] = [
    {
        id: 'a',
        kind: 'text',
        title: 'أ',
        body: 'نص',
        order: 0,
        posX: 10,
        posY: 10,
        blockWidthPct: 40,
    },
    {
        id: 'b',
        kind: 'text',
        title: 'ب',
        body: 'نص',
        order: 1,
        posX: 50,
        posY: 20,
        blockWidthPct: 40,
    },
];

describe('ProfileCustomBlocks drag commit', () => {
    it('يلتزم مرة واحدة عند pointerup رغم lostpointercapture', () => {
        const onBlocksLayoutChange = vi.fn();
        const { container } = render(
            <ProfileCustomBlocks blocks={blocks} editable onBlocksLayoutChange={onBlocksLayoutChange} />,
        );

        const canvas = container.querySelector('[data-profile-blocks-canvas]') as HTMLDivElement;
        const handle = container.querySelector('.profile-block-drag-handle') as HTMLButtonElement;
        expect(canvas).toBeTruthy();
        expect(handle).toBeTruthy();

        Object.defineProperty(canvas, 'setPointerCapture', {
            value: vi.fn(),
            configurable: true,
        });
        Object.defineProperty(canvas, 'releasePointerCapture', {
            value: vi.fn(function release(this: HTMLDivElement, pointerId: number) {
                this.dispatchEvent(
                    new Event('lostpointercapture', { bubbles: true }),
                );
                void pointerId;
            }),
            configurable: true,
        });
        Object.defineProperty(canvas, 'hasPointerCapture', {
            value: () => true,
            configurable: true,
        });

        fireEvent.pointerDown(handle, { pointerId: 7, clientX: 100, clientY: 100, button: 0 });
        fireEvent.pointerMove(canvas, { pointerId: 7, clientX: 120, clientY: 140 });
        fireEvent.pointerUp(canvas, { pointerId: 7, clientX: 120, clientY: 140 });

        expect(onBlocksLayoutChange).toHaveBeenCalledTimes(1);
        const next = onBlocksLayoutChange.mock.calls[0]![0] as ProfileCustomBlock[];
        const moved = next.find((b) => b.id === 'a');
        expect(moved?.order).toBe(2);
    });
});
