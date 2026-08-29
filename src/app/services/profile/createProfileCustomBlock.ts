import type {
    ProfileBlockKind,
    ProfileCustomBlock,
} from '@/app/services/profile/profilePageCustomization';
import {
    defaultBlockLayout,
    defaultImageFrameStyle,
    defaultTextCanvasStyle,
} from '@/app/services/profile/profilePageCustomization';

/** مصنع كتلة مخصصة جديدة — منطق نقي بلا React */
export function createProfileCustomBlock(
    kind: ProfileBlockKind,
    order: number,
    id?: string,
): ProfileCustomBlock {
    const newId = id ?? `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const layout = defaultBlockLayout(order, kind);
    return {
        id: newId,
        kind,
        title: kind === 'image' ? 'صورة' : 'نص حر',
        shape: 'rounded',
        width: kind === 'image' ? 'half' : 'full',
        minHeightPx: kind === 'image' ? 120 : 80,
        order,
        mediaTemplate: kind === 'image' ? 'lens' : undefined,
        imageHeightPx: 168,
        imageFocusX: 50,
        imageFocusY: 50,
        imageZoom: 100,
        imageFrameStyle: kind === 'image' ? defaultImageFrameStyle() : undefined,
        posX: layout.posX,
        posY: layout.posY,
        blockWidthPct: layout.blockWidthPct,
        body: kind === 'text' ? '' : undefined,
        bodyStyle:
            kind === 'text'
                ? {
                      fontSize: 'lg',
                      effect: 'none',
                      align: 'right',
                      color: '#ffffff',
                      fontFamily: 'literary',
                      lineHeight: 1.85,
                      letterSpacing: 0.3,
                  }
                : { fontSize: 'xs', effect: 'none', align: 'center', color: '#ffffff' },
        lineStyles: kind === 'text' ? [] : undefined,
        textSpans: kind === 'text' ? [] : undefined,
        canvasStyle: kind === 'text' ? defaultTextCanvasStyle() : undefined,
    };
}
