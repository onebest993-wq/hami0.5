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
        expect(canvas.getAttribute('data-testid')).toBe('profile-custom-blocks');
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

        fireEvent.pointerDown(handle, { pointerId: 7, clientX: 100, clientY: 100, button: 0, pointerType: 'mouse' });
        fireEvent.pointerMove(document, { pointerId: 7, clientX: 112, clientY: 112 });
        fireEvent.pointerMove(document, { pointerId: 7, clientX: 120, clientY: 140 });
        fireEvent.pointerUp(document, { pointerId: 7, clientX: 120, clientY: 140 });

        expect(onBlocksLayoutChange).toHaveBeenCalledTimes(1);
        const next = onBlocksLayoutChange.mock.calls[0]![0] as ProfileCustomBlock[];
        const moved = next.find((b) => b.id === 'a');
        expect(moved?.order).toBe(2);
    });

    it('لمس المقبض يبدأ السحب فوراً حتى بزر -1 ودون عتبة 10px', () => {
        const onBlocksLayoutChange = vi.fn();
        const { container } = render(
            <ProfileCustomBlocks blocks={blocks} editable onBlocksLayoutChange={onBlocksLayoutChange} />,
        );

        const canvas = container.querySelector('[data-profile-blocks-canvas]') as HTMLDivElement;
        const handle = container.querySelector('.profile-block-drag-handle') as HTMLButtonElement;
        Object.defineProperty(canvas, 'setPointerCapture', {
            value: () => {
                throw new Error('InvalidStateError');
            },
            configurable: true,
        });
        Object.defineProperty(canvas, 'releasePointerCapture', { value: vi.fn(), configurable: true });
        Object.defineProperty(canvas, 'hasPointerCapture', { value: () => false, configurable: true });
        Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn(), configurable: true });
        Object.defineProperty(handle, 'releasePointerCapture', { value: vi.fn(), configurable: true });
        Object.defineProperty(handle, 'hasPointerCapture', { value: () => false, configurable: true });
        Object.defineProperty(canvas, 'getBoundingClientRect', {
            value: () => ({
                width: 400,
                height: 400,
                top: 0,
                left: 0,
                right: 400,
                bottom: 400,
                x: 0,
                y: 0,
                toJSON() {},
            }),
            configurable: true,
        });

        fireEvent.pointerDown(handle, {
            pointerId: 11,
            clientX: 100,
            clientY: 100,
            button: -1,
            pointerType: 'touch',
        });
        fireEvent.pointerCancel(document, { pointerId: 11, pointerType: 'touch' });
        fireEvent.pointerMove(document, { pointerId: 11, clientX: 104, clientY: 108, pointerType: 'touch' });
        fireEvent.pointerUp(document, { pointerId: 11, clientX: 104, clientY: 108, pointerType: 'touch' });

        expect(onBlocksLayoutChange).toHaveBeenCalledTimes(1);
        const next = onBlocksLayoutChange.mock.calls[0]![0] as ProfileCustomBlock[];
        expect(next.find((b) => b.id === 'a')?.order).toBe(2);
    });

    it('لا يبدأ السحب باللمس من هيكل الحاوية — المقبض فقط', () => {
        const onBlocksLayoutChange = vi.fn();
        const { container } = render(
            <ProfileCustomBlocks blocks={blocks} editable onBlocksLayoutChange={onBlocksLayoutChange} />,
        );

        const blockItem = container.querySelector('[data-profile-block-item]') as HTMLDivElement;
        expect(blockItem).toBeTruthy();

        fireEvent.pointerDown(blockItem, {
            pointerId: 3,
            clientX: 50,
            clientY: 50,
            button: 0,
            pointerType: 'touch',
        });
        fireEvent.pointerMove(document, { pointerId: 3, clientX: 55, clientY: 80 });
        fireEvent.pointerUp(document, { pointerId: 3 });

        expect(onBlocksLayoutChange).not.toHaveBeenCalled();
    });
});
