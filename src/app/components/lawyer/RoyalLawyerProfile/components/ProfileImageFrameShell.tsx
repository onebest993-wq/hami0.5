import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import {
    mediaTemplateAspectRatio,
    mediaTemplateClipPath,
    mediaTemplateUsesAspectRatio,
    resolveImageFrameStyle,
} from '@/app/services/profile/profilePageCustomization';
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
    const interaction = frameStyle.interaction ?? 'none';
    const glow = frameStyle.frameGlow ?? 'gold';
    const shellRef = useRef<HTMLDivElement>(null);
    const [tiltActive, setTiltActive] = useState(false);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const onTiltPointer = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (interaction !== 'tilt' || !previewInteractive) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width;
            const py = (event.clientY - rect.top) / rect.height;
            setTilt({
                x: (py - 0.5) * -14,
                y: (px - 0.5) * 16,
            });
            setTiltActive(true);
        },
        [interaction, previewInteractive],
    );

    const onTiltEnd = useCallback(() => {
        setTiltActive(false);
        setTilt({ x: 0, y: 0 });
    }, []);

    const frameClass = useMemo(() => {
        const parts = [
            'profile-image-frame',
            `profile-image-frame--rim-${frameStyle.rimStyle ?? 'gold'}`,
            `profile-image-frame--template-${template}`,
        ];
        if (interaction === 'kenBurns') parts.push('profile-image-frame--ken-burns');
        if (interaction === 'shimmer') parts.push('profile-image-frame--shimmer');
        if (interaction === 'pulse') parts.push('profile-image-frame--pulse-inner');
        if (interaction === 'parallax') parts.push('profile-image-frame--parallax');
        if (interaction === 'tilt') parts.push('profile-image-frame--tilt');
        if (tiltActive) parts.push('profile-image-frame--tilt-active');
        if (isPerspective && !borderless) parts.push('profile-media-perspective');
        return parts.join(' ');
    }, [borderless, frameStyle.rimStyle, interaction, isPerspective, template, tiltActive]);

    const wrapClass = useMemo(
        () =>
            [
                'profile-image-frame-wrap',
                `profile-image-frame-wrap--glow-${glow}`,
                `profile-image-frame-wrap--template-${template}`,
                interaction === 'pulse' ? 'profile-image-frame-wrap--pulse' : '',
            ]
                .filter(Boolean)
                .join(' '),
        [glow, interaction, template],
    );

    const wrapStyle = useMemo(
        () =>
            ({
                '--img-accent': frameStyle.accentColor ?? '#E6C673',
                '--img-glow': String(frameStyle.glowIntensity ?? 0.6),
                height: useAspect ? undefined : heightPx,
                maxHeight: useAspect ? undefined : 320,
                aspectRatio: useAspect ? aspectRatio : undefined,
                clipPath: clip && !isPerspective ? clip : undefined,
                WebkitClipPath: clip && !isPerspective ? clip : undefined,
                transform:
                    interaction === 'tilt' && tiltActive
                        ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
                        : undefined,
            }) as React.CSSProperties,
        [
            aspectRatio,
            clip,
            frameStyle.accentColor,
            frameStyle.glowIntensity,
            heightPx,
            interaction,
            isPerspective,
            tilt.x,
            tilt.y,
            tiltActive,
            useAspect,
        ],
    );

    const imgStyle = useMemo(() => {
        const base: React.CSSProperties = {
            objectPosition: `${focusX}% ${focusY}%`,
            transformOrigin: `${focusX}% ${focusY}%`,
        };
        if (interaction !== 'kenBurns' && interaction !== 'parallax') {
            base.transform = `scale(${zoom})`;
        }
        return base;
    }, [focusX, focusY, interaction, zoom]);

    return (
        <div
            ref={shellRef}
            key={`${interaction}-${template}-${glow}-${frameStyle.rimStyle}`}
            data-profile-media-shell
            data-borderless={borderless ? 'true' : 'false'}
            data-template={template}
            data-preview-interactive={previewInteractive ? 'true' : 'false'}
            className={wrapClass}
            style={wrapStyle}
            onPointerDown={interaction === 'tilt' && previewInteractive ? onTiltPointer : undefined}
            onPointerMove={interaction === 'tilt' && previewInteractive ? onTiltPointer : undefined}
            onPointerLeave={interaction === 'tilt' ? onTiltEnd : undefined}
            onPointerUp={interaction === 'tilt' ? onTiltEnd : undefined}
            onPointerCancel={interaction === 'tilt' ? onTiltEnd : undefined}
        >
            <div className={frameClass}>
                <div
                    data-profile-media-frame
                    data-template={template}
                    className="profile-image-frame__media"
                >
                    <ProfileAvatarImage
                        src={src}
                        alt={alt}
                        className="profile-image-frame__img"
                        style={imgStyle}
                    />
                    {frameStyle.vignette !== false ? (
                        <div className="profile-image-frame__vignette" aria-hidden />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
