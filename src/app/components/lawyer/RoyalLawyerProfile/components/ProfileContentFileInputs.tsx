import React from 'react';
import { PROFILE_SAFE_IMAGE_ACCEPT } from '@/app/services/profileMediaService';

type ProfileContentFileInputsProps = {
    avatarRef: React.RefObject<HTMLInputElement | null>;
    galleryRef: React.RefObject<HTMLInputElement | null>;
    uploadImage: (file: File, target: 'avatar' | 'gallery') => Promise<void>;
};

export function ProfileContentFileInputs({
    avatarRef,
    galleryRef,
    uploadImage,
}: ProfileContentFileInputsProps) {
    return (
        <>
            <input
                ref={avatarRef as React.Ref<HTMLInputElement>}
                type="file"
                accept={PROFILE_SAFE_IMAGE_ACCEPT}
                className="sr-only"
                data-testid="lawyer-profile-avatar-input"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadImage(f, 'avatar');
                    e.target.value = '';
                }}
            />
            <input
                ref={galleryRef as React.Ref<HTMLInputElement>}
                type="file"
                accept={PROFILE_SAFE_IMAGE_ACCEPT}
                className="sr-only"
                data-testid="lawyer-profile-gallery-input"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadImage(f, 'gallery');
                    e.target.value = '';
                }}
            />
        </>
    );
}
