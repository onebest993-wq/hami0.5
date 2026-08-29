import React, { useMemo, useRef } from 'react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    mediaTemplateAspectRatio,
    mediaTemplateClipPath,
    mediaTemplateUsesAspectRatio,
    resolveImageFrameStyle,
} from '@/app/services/profile/profilePageCustomization';
import { useProfileImageFrameTilt } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileImageFrameTilt';
import { useNonPassiveTouchPrevent } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useNonPassiveTouchPrevent';
import {
    buildProfileImageClipStyle,
    buildProfileImageFrameClass,
    buildProfileImageFrameWrapClass,
    buildProfileImageImgStyle,
    buildProfileImageRimShellStyle,
    buildProfileImageWrapStyle,
    rimPadPx,
} from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileImageFrameShellStyles';
import { ProfileAvatarImage } from './ProfileAvatarImage';
import '@/app/components/lawyer/RoyalLawyerProfile/profileImageFx.css';

type ProfileImageFrameShellProps = {
    block: ProfileCustomBlock;
    src: string;
    alt?: string;
    heightPx?: number;
    borderless?: boolean;
    previewInteractive?: boolean;
};

export function ProfileImageFrameShell({
    block,
    src,
    alt = '',
    heightPx = 160,
    borderless = false,
    previewInteractive = false,
}: ProfileImageFrameShellProps) {
    const template = block.mediaTemplate ?? 'circle';
    const frameStyle = resolveImageFrameStyle(block);
    const focusX = block.imageFocusX ?? 50;
    const focusY = block.imageFocusY ?? 50;
    const zoom = (block.imageZoom ?? 100) / 100;
    const clip = mediaTemplateClipPath(template);
    const isPerspective = template === 'perspective';
    const useAspect = mediaTemplateUsesAspectRatio(template);
    const aspectRatio = mediaTemplateAspectRatio(template);
    const storedInteraction = frameStyle.interaction ?? 'none';
    const interaction = previewInteractive ? storedInteraction : 'none';
    const rim = frameStyle.rimStyle ?? 'gold';
    const accent = frameStyle.accentColor ?? '#E6C673';
    const shellRef = useRef<HTMLDivElement>(null);
    const { tiltActive, tilt, onTiltPointer, onTiltPointerDown, onTiltPointerEnd } =
        useProfileImageFrameTilt(interaction, previewInteractive);
    const tiltEnabled = interaction === 'tilt' && previewInteractive;
    useNonPassiveTouchPrevent(shellRef, tiltEnabled);

    const frameClass = useMemo(
        () =>
            buildProfileImageFrameClass({
                rim,
                template,
                interaction,
                tiltActive,
                isPerspective,
                borderless,
            }),
        [borderless, rim, interaction, isPerspective, template, tiltActive],
    );

    const wrapClass = useMemo(
        () => buildProfileImageFrameWrapClass({ template, rim, interaction }),
        [interaction, rim, template],
    );

    const clipStyle = useMemo(
        () => buildProfileImageClipStyle(clip, isPerspective),
        [clip, isPerspective],
    );

    const hasShapedClip = Boolean(clip && !isPerspective);

    const wrapStyle = useMemo(
        () =>
            buildProfileImageWrapStyle({
                accent,
                hasShapedClip,
                heightPx,
                useAspect,
                aspectRatio,
                interaction,
                tiltActive,
                tilt,
            }),
        [
            accent,
            aspectRatio,
            hasShapedClip,
            heightPx,
            interaction,
            tilt.x,
            tilt.y,
            tiltActive,
            useAspect,
        ],
    );

    const pad = rimPadPx(rim);

    const rimShellStyle = useMemo(
        () =>
            buildProfileImageRimShellStyle({
                borderless,
                clipStyle,
                pad,
                rim,
                accent,
            }),
        [accent, borderless, clipStyle, pad, rim],
    );

    const imgStyle = useMemo(
        () =>
            buildProfileImageImgStyle({
                focusX,
                focusY,
                interaction,
                zoom,
            }),
        [focusX, focusY, interaction, zoom],
    );

    return (
        <div
            ref={shellRef}
            key={`${interaction}-${template}-${rim}-${accent}`}
            data-profile-media-shell
            data-borderless={borderless ? 'true' : 'false'}
            data-template={template}
            data-rim={rim}
            data-preview-interactive={previewInteractive ? 'true' : 'false'}
            className={wrapClass}
            style={wrapStyle}
            onPointerDown={tiltEnabled ? onTiltPointerDown : undefined}
            onPointerMove={tiltEnabled ? onTiltPointer : undefined}
            onPointerLeave={tiltEnabled ? onTiltPointerEnd : undefined}
            onPointerUp={tiltEnabled ? onTiltPointerEnd : undefined}
            onPointerCancel={
                tiltEnabled
                    ? (event) => {
                          if (event.pointerType === 'touch' || event.pointerType === 'pen') return;
                          onTiltPointerEnd(event);
                      }
                    : undefined
            }
        >
            <div className={frameClass} style={rimShellStyle} data-rim-shell="" data-borderless={borderless ? 'true' : 'false'}>
                <div
                    data-profile-media-frame
                    data-template={template}
                    data-borderless={borderless ? 'true' : 'false'}
                    className="profile-image-frame__media"
                    style={clipStyle}
                >
                    <ProfileAvatarImage
                        src={src}
                        alt={alt}
                        className="profile-image-frame__img"
                        style={imgStyle}
                    />
                </div>
            </div>
        </div>
    );
}
