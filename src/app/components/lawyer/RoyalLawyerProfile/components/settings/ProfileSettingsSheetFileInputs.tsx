import React from 'react';

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
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onBlockImageSelected(f);
                    e.target.value = '';
                }}
            />
            <input
                ref={canvasFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onCanvasBgSelected(f);
                    e.target.value = '';
                }}
            />
        </>
    );
}
