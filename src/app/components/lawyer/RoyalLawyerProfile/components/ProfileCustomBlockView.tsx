import React from 'react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    inferProfileBlockKind,
    resolveBlockCanvasStyle,
} from '@/app/services/profile/profilePageCustomization';
import { ProfileMediaFrame } from './ProfileMediaFrame';
import { ProfileBlockText } from './ProfileBlockText';
import { ProfileFreeText } from './ProfileFreeText';
import { ProfileTextCanvas } from './ProfileTextCanvas';

const DEFAULT_CAPTION_STYLE = {
    fontSize: 'xs' as const,
    color: 'rgba(255,255,255,0.65)',
    align: 'center' as const,
};

export type ProfileCustomBlockViewProps = {
    block: ProfileCustomBlock;
    /** تفعيل تفاعلات المعاينة (لمسة، ضباب، …) */
    interactive?: boolean;
    emptyImageLabel?: string;
    textCanvasKey?: number;
};

export function ProfileCustomBlockView({
    block,
    interactive = true,
    emptyImageLabel = 'صورة',
    textCanvasKey,
}: ProfileCustomBlockViewProps) {
    const kind = inferProfileBlockKind(block);
    const canvasInteraction = resolveBlockCanvasStyle(block).interaction ?? 'none';

    if (kind === 'text') {
        return (
            <div data-profile-block-shell data-block-kind="text" className="w-full">
                <ProfileTextCanvas
                    key={textCanvasKey ?? `${block.id}-${canvasInteraction}`}
                    block={block}
                    previewInteractive={interactive}
                >
                    <ProfileFreeText block={block} />
                </ProfileTextCanvas>
            </div>
        );
    }

    const imageHeight = block.imageHeightPx ?? 160;

    return (
        <div data-profile-block-shell data-block-kind="image" className="w-full space-y-2">
            {block.imageUrl ? (
                <ProfileMediaFrame
                    block={block}
                    src={block.imageUrl}
                    template={block.mediaTemplate ?? 'circle'}
                    alt=""
                    heightPx={imageHeight}
                    borderless
                    previewInteractive={interactive}
                />
            ) : (
                <div
                    className="flex items-center justify-center text-[11px] text-white/30"
                    style={{ height: imageHeight }}
                >
                    {emptyImageLabel}
                </div>
            )}
            {block.body ? (
                <ProfileBlockText
                    text={block.body}
                    style={block.bodyStyle ?? DEFAULT_CAPTION_STYLE}
                    className="px-1"
                />
            ) : null}
        </div>
    );
}
