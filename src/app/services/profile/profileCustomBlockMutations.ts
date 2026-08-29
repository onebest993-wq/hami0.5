import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { defaultTextCanvasStyle } from '@/app/services/profile/profilePageCustomization';

/** دمج patch كتلة مع دمج متداخل لإطار الصورة و canvasStyle */
export function mergeProfileCustomBlockPatch(
    block: ProfileCustomBlock,
    patch: Partial<ProfileCustomBlock>,
): ProfileCustomBlock {
    const next: ProfileCustomBlock = { ...block, ...patch };
    if (patch.imageFrameStyle) {
        next.imageFrameStyle = {
            ...block.imageFrameStyle,
            ...patch.imageFrameStyle,
        };
    }
    if (patch.canvasStyle) {
        next.canvasStyle = { ...block.canvasStyle, ...patch.canvasStyle };
    }
    return next;
}

export function applyCanvasBackgroundToBlock(
    block: ProfileCustomBlock,
    displayUrl: string,
    storagePath?: string,
): ProfileCustomBlock {
    return {
        ...block,
        canvasStyle: {
            ...defaultTextCanvasStyle(),
            ...block.canvasStyle,
            enabled: true,
            backgroundImage: displayUrl,
            backgroundStoragePath: storagePath,
        },
    };
}

export function clearCanvasBackgroundOnBlock(block: ProfileCustomBlock): ProfileCustomBlock {
    return {
        ...block,
        canvasStyle: {
            ...defaultTextCanvasStyle(),
            ...block.canvasStyle,
            backgroundImage: undefined,
            backgroundStoragePath: undefined,
        },
    };
}

export function clearBlockImageFields(block: ProfileCustomBlock): ProfileCustomBlock {
    return { ...block, imageUrl: undefined, imageStoragePath: undefined };
}
