import React from 'react';
import type { ProfileCustomBlock, ProfileMediaTemplate } from '@/app/services/profile/profilePageCustomization';
import { ProfileImageFrameShell } from './ProfileImageFrameShell';

type ProfileMediaFrameProps = {
    src: string;
    block?: ProfileCustomBlock;
    template?: ProfileMediaTemplate;
    alt?: string;
    heightPx?: number;
    borderless?: boolean;
    previewInteractive?: boolean;
};

export function ProfileMediaFrame({
    src,
    block,
    template = 'rectangle',
    alt = '',
    heightPx = 160,
    borderless = false,
    previewInteractive = false,
}: ProfileMediaFrameProps) {
    const frameBlock: ProfileCustomBlock = block ?? {
        id: 'preview',
        kind: 'image',
        title: '',
        shape: 'rounded',
        width: 'full',
        minHeightPx: 120,
        order: 0,
        mediaTemplate: template,
        imageFocusX: 50,
        imageFocusY: 50,
        imageZoom: 100,
    };

    return (
        <ProfileImageFrameShell
            block={frameBlock}
            src={src}
            alt={alt}
            heightPx={heightPx}
            borderless={borderless}
            previewInteractive={previewInteractive}
        />
    );
}
