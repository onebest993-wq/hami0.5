import React, { useMemo, useRef } from 'react';
import type { ProfileBlockCanvasStyle } from '@/app/services/profile/profilePageCustomization';
import { profileTextCanvasHintText } from './profileTextCanvasHints';
import { ProfileTextCanvasMaskLayers } from './ProfileTextCanvasMaskLayers';
import { ProfileTextCanvasMaterialStack } from './ProfileTextCanvasMaterialStack';
import { useProfileTextCanvasReveal } from './useProfileTextCanvasReveal';
import { useProfileCanvasInView } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileCanvasInView';
import { useProfileCanvasInteractionSlot } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileCanvasInteractionSlot';

type ProfileTextCanvasShellProps = {
    blockId: string;
    canvas: ProfileBlockCanvasStyle;
    children: React.ReactNode;
    previewInteractive: boolean;
};

export function ProfileTextCanvasShell({
    blockId,
    canvas,
    children,
    previewInteractive,
}: ProfileTextCanvasShellProps) {
    const storedInteraction = canvas.interaction ?? 'none';
    /* بلا تفاعل: لا أقنعة/ضباب يخفي النص في المعاينة أو أثناء السحب */
    const interaction = previewInteractive ? storedInteraction : 'none';
    const wrapRef = useRef<HTMLDivElement>(null);
    const leafRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const inView = useProfileCanvasInView(wrapRef);
    const wantsSlot = previewInteractive && interaction !== 'none' && inView;
    const slotActive = useProfileCanvasInteractionSlot(blockId, wantsSlot);
    const canInteract = wantsSlot && slotActive;

    const {
        revealed,
        revealing,
        maskActive,
        showHint,
        dismissHint,
        finishReveal,
        onTapReveal,
        onPetalPointerDown,
        onPetalPointerMove,
        onPetalPointerEnd,
    } = useProfileTextCanvasReveal({
        interaction,
        canInteract,
        wrapRef,
        leafRefs,
    });

    const accent = canvas.accentColor ?? '#E6C673';
    const bg = canvas.backgroundColor ?? '#0A0F1C';
    const material = canvas.material ?? 'glass';

    const className = useMemo(() => {
        const parts = [
            'profile-text-canvas',
            `profile-text-canvas--${canvas.frameShape ?? 'rounded'}`,
            `profile-text-canvas--material-${material}`,
        ];
        const glow = canvas.frameGlow ?? 'soft';
        if (glow !== 'none') parts.push(`profile-text-canvas--glow-${glow}`);
        if (revealing) parts.push('profile-text-canvas--revealing');
        if (maskActive) parts.push('profile-text-canvas--masked');
        return parts.join(' ');
    }, [canvas.frameShape, canvas.frameGlow, material, maskActive, revealing]);

    const style = {
        '--canvas-accent': accent,
        '--canvas-bg': bg,
        '--canvas-glow': canvas.glowIntensity ?? 0.55,
        borderWidth: `${canvas.borderWidthPx ?? 1}px`,
        padding: `${canvas.paddingPx ?? 16}px`,
        minHeight: `${canvas.minHeightPx ?? 120}px`,
    } as React.CSSProperties;

    const contentClass = maskActive
        ? 'profile-text-canvas__content profile-text-canvas__content--interactive'
        : 'profile-text-canvas__content';

    const hintText = profileTextCanvasHintText(interaction);

    return (
        <div
            ref={wrapRef}
            className={className}
            data-revealed={revealed ? 'true' : 'false'}
            data-interaction={interaction}
            data-interactive={canInteract ? 'true' : 'false'}
            data-canvas-in-view={inView ? 'true' : 'false'}
            data-canvas-slot-active={slotActive ? 'true' : 'false'}
            style={style}
        >
            <ProfileTextCanvasMaterialStack
                material={material}
                accentColor={accent}
                backgroundColor={bg}
                backgroundImage={canvas.backgroundImage}
            />
            <div className="profile-text-canvas__rim" aria-hidden />
            {canvas.frameGlow === 'bloom' ? <div className="profile-text-canvas__bloom" aria-hidden /> : null}

            <ProfileTextCanvasMaskLayers
                interaction={interaction}
                canvas={canvas}
                canInteract={canInteract}
                showMaskLayers={maskActive}
                hintText={hintText}
                showHint={showHint}
                leafRefs={leafRefs}
                onTapReveal={onTapReveal}
                onPetalPointerDown={onPetalPointerDown}
                onPetalPointerMove={onPetalPointerMove}
                onPetalPointerEnd={onPetalPointerEnd}
                onMistCleared={finishReveal}
                onMistFirstTouch={canInteract ? dismissHint : undefined}
            />

            <div className="profile-text-canvas__inner">
                <div className={contentClass}>{children}</div>
            </div>
        </div>
    );
}
