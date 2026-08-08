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

function rimPadPx(rim: string | undefined): number {
    switch (rim) {
        case 'minimal':
            return 2;
        case 'ornate':
            return 8;
        case 'neon':
            return 5;
        case 'gold':
        default:
            return 4;
    }
}

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

    const onTiltPointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (interaction !== 'tilt' || !previewInteractive) return;
            if (typeof window !== 'undefined') {
                const reduce =
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
                    Boolean(
                        event.currentTarget.closest('[data-lawyer-profile-root]')?.getAttribute(
                            'data-profile-reduce-motion',
                        ) === 'true',
                    );
                if (reduce) return;
            }
            try {
                event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
                /* بعض WebViews ترفض capture */
            }
            onTiltPointer(event);
        },
        [interaction, previewInteractive, onTiltPointer],
    );

    const onTiltEnd = useCallback(() => {
        setTiltActive(false);
        setTilt({ x: 0, y: 0 });
    }, []);

    const onTiltPointerEnd = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            try {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                }
            } catch {
                /* ignore */
            }
            onTiltEnd();
        },
        [onTiltEnd],
    );

    const frameClass = useMemo(() => {
        const parts = [
            'profile-image-frame',
            `profile-image-frame--rim-${rim}`,
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
    }, [borderless, rim, interaction, isPerspective, template, tiltActive]);

    const wrapClass = useMemo(
        () =>
            [
                'profile-image-frame-wrap',
                `profile-image-frame-wrap--template-${template}`,
                `profile-image-frame-wrap--rim-${rim}`,
                interaction === 'pulse' ? 'profile-image-frame-wrap--pulse' : '',
            ]
                .filter(Boolean)
                .join(' '),
        [interaction, rim, template],
    );

    const clipStyle = useMemo(() => {
        if (!clip || isPerspective) return undefined;
        return { clipPath: clip, WebkitClipPath: clip } as React.CSSProperties;
    }, [clip, isPerspective]);

    const hasShapedClip = Boolean(clip && !isPerspective);

    const wrapStyle = useMemo(
        () =>
            ({
                '--img-accent': accent,
                ...(hasShapedClip
                    ? {
                          width: `min(100%, ${heightPx}px)`,
                          maxWidth: '100%',
                          aspectRatio: '1 / 1',
                          height: 'auto',
                          marginInline: 'auto',
                      }
                    : {
                          height: useAspect ? undefined : heightPx,
                          maxHeight: useAspect ? undefined : 320,
                          aspectRatio: useAspect ? aspectRatio : undefined,
                      }),
                transform:
                    interaction === 'tilt' && tiltActive
                        ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
                        : undefined,
            }) as React.CSSProperties,
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

    const rimShellStyle = useMemo(() => {
        if (borderless) {
            return {
                ...clipStyle,
                padding: 0,
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
            } as React.CSSProperties;
        }

        const base: React.CSSProperties = {
            ...clipStyle,
            padding: pad,
            boxSizing: 'border-box',
        };

        if (rim === 'minimal') {
            base.background = 'rgba(255,255,255,0.28)';
            base.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.18)';
        } else if (rim === 'neon') {
            base.background = `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 35%, #fff) 55%, ${accent})`;
            base.boxShadow = `0 0 18px color-mix(in srgb, ${accent} 55%, transparent), 0 0 4px ${accent}`;
        } else if (rim === 'ornate') {
            base.background = `
                linear-gradient(${accent}, ${accent}) padding-box,
                linear-gradient(135deg, color-mix(in srgb, ${accent} 95%, #fff), ${accent}, color-mix(in srgb, ${accent} 45%, #000)) border-box
            `;
            base.border = `2px solid transparent`;
            base.boxShadow = `0 0 0 1px color-mix(in srgb, ${accent} 40%, transparent), inset 0 0 0 3px rgba(0,0,0,0.35)`;
        } else {
            base.background = `linear-gradient(160deg, color-mix(in srgb, ${accent} 88%, #fff), ${accent} 45%, color-mix(in srgb, ${accent} 70%, #000))`;
            base.boxShadow = `0 2px 10px color-mix(in srgb, ${accent} 28%, transparent)`;
        }

        return base;
    }, [accent, borderless, clipStyle, pad, rim]);

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
            key={`${interaction}-${template}-${rim}-${accent}`}
            data-profile-media-shell
            data-borderless={borderless ? 'true' : 'false'}
            data-template={template}
            data-rim={rim}
            data-preview-interactive={previewInteractive ? 'true' : 'false'}
            className={wrapClass}
            style={wrapStyle}
            onPointerDown={interaction === 'tilt' && previewInteractive ? onTiltPointerDown : undefined}
            onPointerMove={interaction === 'tilt' && previewInteractive ? onTiltPointer : undefined}
            onPointerLeave={interaction === 'tilt' ? onTiltPointerEnd : undefined}
            onPointerUp={interaction === 'tilt' ? onTiltPointerEnd : undefined}
            onPointerCancel={interaction === 'tilt' ? onTiltPointerEnd : undefined}
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
