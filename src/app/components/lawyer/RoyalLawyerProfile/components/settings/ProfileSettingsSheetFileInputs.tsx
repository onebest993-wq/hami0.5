import React from 'react';
import { PROFILE_SAFE_IMAGE_ACCEPT } from '@/app/services/profileMediaService';

type ProfileSettingsSheetFileInputsProps = {
    fileRef: React.RefObject<HTMLInputElement | null>;
    canvasFileRef: React.RefObject<HTMLInputElement | null>;
    onBlockImageSelected: (file: File) => Promise<void>;
    onCanvasBgSelected: (file: File) => Promise<void>;
};

export function ProfileSettingsSheetFileInputs({
    fileRef,
    canvasFileRef,
    onBlockImageSelected,
    onCanvasBgSelected,
}: ProfileSettingsSheetFileInputsProps) {
    return (
        <>
            <input
                ref={fileRef}
                type="file"
                accept={PROFILE_SAFE_IMAGE_ACCEPT}
                hidden
                tabIndex={-1}
                aria-hidden="true"
                className="hidden"
                data-testid="profile-studio-block-image-input"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onBlockImageSelected(f);
                    e.target.value = '';
                }}
            />
            <input
                ref={canvasFileRef}
                type="file"
                accept={PROFILE_SAFE_IMAGE_ACCEPT}
                hidden
                tabIndex={-1}
                aria-hidden="true"
                className="hidden"
                data-testid="profile-studio-canvas-bg-input"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onCanvasBgSelected(f);
                    e.target.value = '';
                }}
            />
        </>
    );
}
