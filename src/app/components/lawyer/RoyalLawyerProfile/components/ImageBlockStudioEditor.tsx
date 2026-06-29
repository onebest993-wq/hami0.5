import React, { useCallback, useEffect, useState } from 'react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    PROFILE_IMAGE_INTERACTIONS,
} from '@/app/services/profile/profilePageCustomization';
import { ensureProfileCanvasFxLoadedSync } from '@/app/components/lawyer/RoyalLawyerProfile/profileCanvasFxLoader';
import { patchImageFrameStyle } from './profileImageFrameUtils';
import { ImageBlockFramePanel } from './imageStudio/ImageBlockFramePanel';
import { ImageBlockFocusPanel } from './imageStudio/ImageBlockFocusPanel';
import { ImageBlockFxPanel } from './imageStudio/ImageBlockFxPanel';
import '@/app/components/lawyer/RoyalLawyerProfile/profileImageFx.css';

type ImageStudioPanel = 'frame' | 'focus' | 'fx';

type ImageBlockStudioEditorProps = {
    block: ProfileCustomBlock;
    uploading: boolean;
    onChange: (patch: Partial<ProfileCustomBlock>) => void;
    onPickImage: () => void;
};

const PANELS: { id: ImageStudioPanel; label: string; testId: string }[] = [
    { id: 'frame', label: 'الإطار', testId: 'image-studio-tab-frame' },
    { id: 'focus', label: 'الصورة', testId: 'image-studio-tab-focus' },
    { id: 'fx', label: 'التفاعل', testId: 'image-studio-tab-fx' },
];

export function ImageBlockStudioEditor({
    block,
    uploading,
    onChange,
    onPickImage,
}: ImageBlockStudioEditorProps) {
    const [panel, setPanel] = useState<ImageStudioPanel>('frame');
    const [fxPreviewKey, setFxPreviewKey] = useState(0);

    useEffect(() => {
        ensureProfileCanvasFxLoadedSync({ includeStudio: true });
    }, []);

    const bumpFxPreview = useCallback(() => setFxPreviewKey((k) => k + 1), []);

    const selectInteraction = useCallback(
        (interaction: (typeof PROFILE_IMAGE_INTERACTIONS)[number]['id']) => {
            patchImageFrameStyle(block, { interaction }, onChange);
            bumpFxPreview();
        },
        [block, bumpFxPreview, onChange],
    );

    return (
        <div className="space-y-3" data-testid="image-block-studio-editor">
            <div className="profile-studio-panel-tabs">
                {PANELS.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        data-active={panel === p.id ? 'true' : 'false'}
                        data-testid={p.testId}
                        className="profile-studio-panel-tab min-h-[44px]"
                        onClick={() => setPanel(p.id)}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {panel === 'frame' ? (
                <ImageBlockFramePanel block={block} onChange={onChange} />
            ) : null}

            {panel === 'focus' ? (
                <ImageBlockFocusPanel
                    block={block}
                    uploading={uploading}
                    onChange={onChange}
                    onPickImage={onPickImage}
                />
            ) : null}

            {panel === 'fx' ? (
                <ImageBlockFxPanel
                    block={block}
                    fxPreviewKey={fxPreviewKey}
                    onSelectInteraction={selectInteraction}
                    onResetPreview={bumpFxPreview}
                />
            ) : null}
        </div>
    );
}
