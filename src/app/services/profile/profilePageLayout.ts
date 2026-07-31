import { defaultBlockLayout } from './profilePageDefaults';
import type { ProfileBlockKind, ProfileCustomBlock } from './profilePageTypes';

export function clampPct(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function inferProfileBlockKind(block: Partial<ProfileCustomBlock>): ProfileBlockKind {
    if (block.kind === 'image' || block.kind === 'text') return block.kind;
    return block.imageUrl ? 'image' : 'text';
}

/** يعتمد النوع المحفوظ — لا يُحوّل صورة إلى نص بسبب تعليق نصي */
export function resolveProfileBlockKind(block: ProfileCustomBlock): ProfileBlockKind {
    return block.kind === 'image' || block.kind === 'text' ? block.kind : inferProfileBlockKind(block);
}

export function resolveBlockWidthPct(block: ProfileCustomBlock): number {
    if (typeof block.blockWidthPct === 'number') {
        return clampPct(block.blockWidthPct, 28, 96);
    }
    if (block.kind === 'image') return block.width === 'half' ? 38 : 42;
    return block.width === 'half' ? 46 : 92;
}

export function resolveBlockPosition(
    block: ProfileCustomBlock,
    index: number,
): { posX: number; posY: number } {
    if (
        typeof block.posX === 'number' &&
        typeof block.posY === 'number' &&
        Number.isFinite(block.posX) &&
        Number.isFinite(block.posY)
    ) {
        return {
            posX: clampPct(block.posX, 0, 94),
            posY: clampPct(block.posY, 0, 90),
        };
    }
    const layout = defaultBlockLayout(index, block.kind);
    const fineX = (Number(block.offsetX) || 0) / 6;
    const fineY = (Number(block.offsetY) || 0) / 6;
    return {
        posX: clampPct(layout.posX + fineX, 0, 94),
        posY: clampPct(layout.posY + fineY, 0, 90),
    };
}

export function estimateProfileCanvasMinHeight(blocks: ProfileCustomBlock[]): number {
    if (blocks.length === 0) return 0;
    let maxBottom = 320;
    blocks.forEach((block, index) => {
        const { posY } = resolveBlockPosition(block, index);
        const blockPx = block.kind === 'image' ? block.imageHeightPx ?? 160 : block.minHeightPx ?? 140;
        const bottom = (posY / 100) * 520 + blockPx + 48;
        maxBottom = Math.max(maxBottom, bottom);
    });
    return maxBottom;
}

export function sortProfileCustomBlocks(blocks: ProfileCustomBlock[]): ProfileCustomBlock[] {
    return [...blocks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
