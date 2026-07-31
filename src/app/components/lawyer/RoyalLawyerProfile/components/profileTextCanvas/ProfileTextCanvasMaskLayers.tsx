import React from 'react';
import type { ProfileBlockCanvasStyle } from '@/app/services/profile/profilePageCustomization';
import type { ProfileCanvasInteraction } from '@/app/services/profile/profilePageTypes';
import { PETAL_SEEDS } from './constants';
import { MistFogLayer } from './MistFogLayer';

type ProfileTextCanvasMaskLayersProps = {
    interaction: ProfileCanvasInteraction;
    canvas: ProfileBlockCanvasStyle;
    canInteract: boolean;
    showMaskLayers: boolean;
    hintText: string;
    showHint: boolean;
    leafRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>;
    onTapReveal: () => void;
    onPetalPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPetalPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPetalPointerEnd: (e: React.PointerEvent<HTMLDivElement>) => void;
    onMistCleared: () => void;
    onMistFirstTouch?: () => void;
};

export function ProfileTextCanvasMaskLayers({
    interaction,
    canvas,
    canInteract,
    showMaskLayers,
    hintText,
    showHint,
    leafRefs,
    onTapReveal,
    onPetalPointerDown,
    onPetalPointerMove,
    onPetalPointerEnd,
    onMistCleared,
    onMistFirstTouch,
}: ProfileTextCanvasMaskLayersProps) {
    if (!showMaskLayers) return null;

    return (
        <>
            {interaction === 'luminousFold' ? (
                <>
                    <div className="profile-text-canvas__luminous-bloom" aria-hidden />
                    <div className="profile-text-canvas__luminous-folds" aria-hidden>
                        <div className="profile-text-canvas__luminous-fold profile-text-canvas__luminous-fold--left" />
                        <div className="profile-text-canvas__luminous-fold profile-text-canvas__luminous-fold--right" />
                    </div>
                </>
            ) : null}

            {interaction === 'stardust' ? (
                <div
                    className="profile-text-canvas__stardust"
                    data-interactive={canInteract ? 'true' : 'false'}
                    data-testid="profile-text-stardust-hit"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 12,
                        touchAction: 'none',
                    }}
                    onPointerDown={canInteract ? onPetalPointerDown : undefined}
                    onPointerMove={canInteract ? onPetalPointerMove : undefined}
                    onPointerUp={canInteract ? onPetalPointerEnd : undefined}
                    onPointerCancel={canInteract ? onPetalPointerEnd : undefined}
                    aria-hidden={!canInteract}
                >
                    {PETAL_SEEDS.map((p, i) => (
                        <span
                            key={i}
                            ref={(el) => {
                                leafRefs.current[i] = el;
                            }}
                            className="profile-text-canvas__stardust-particle"
                            data-left={parseFloat(p.left)}
                            data-top={parseFloat(p.top)}
                            style={
                                {
                                    left: p.left,
                                    top: p.top,
                                    '--petal-rot': `${p.rot}deg`,
                                    '--petal-delay': `${p.delay}s`,
                                    pointerEvents: 'none',
                                } as React.CSSProperties
                            }
                        />
                    ))}
                </div>
            ) : null}

            {interaction === 'mistSwipe' ? (
                <MistFogLayer
                    active
                    interactive={canInteract}
                    accent={canvas.accentColor ?? '#E6C673'}
                    onCleared={onMistCleared}
                    onFirstTouch={onMistFirstTouch}
                />
            ) : null}

            {interaction === 'tapReveal' ? (
                <div className="profile-text-canvas__silk-veil" aria-hidden>
                    <div className="profile-text-canvas__silk-veil-weave" />
                    <div className="profile-text-canvas__silk-veil-glow" />
                    <div className="profile-text-canvas__silk-veil-sheen" />
                </div>
            ) : null}

            {interaction === 'doorOpen' ? (
                <>
                    <div className="profile-text-canvas__door-light" aria-hidden />
                    <div className="profile-text-canvas__doors" aria-hidden>
                        <div className="profile-text-canvas__door profile-text-canvas__door--left">
                            <div className="profile-text-canvas__door-inlay" />
                        </div>
                        <div className="profile-text-canvas__door profile-text-canvas__door--right">
                            <div className="profile-text-canvas__door-knob" />
                            <div className="profile-text-canvas__door-inlay" />
                        </div>
                    </div>
                </>
            ) : null}

            {(interaction === 'tapReveal' ||
                interaction === 'luminousFold' ||
                interaction === 'doorOpen') &&
            canInteract ? (
                <button
                    type="button"
                    className="profile-text-canvas__reveal-tap touch-manipulation"
                    aria-label={hintText}
                    data-testid="profile-text-reveal-tap"
                    /* هندسة الهدف inline — تعمل حتى قبل اكتمال تحميل CSS التفاعل */
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 14,
                        margin: 0,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                    onPointerDown={(e) => {
                        if (typeof e.button === 'number' && e.button !== 0) return;
                        e.preventDefault();
                        e.stopPropagation();
                        onTapReveal();
                    }}
                    onClick={(e) => {
                        /* احتياط لو WebView أسقط pointerdown بعد preventDefault */
                        e.preventDefault();
                        onTapReveal();
                    }}
                />
            ) : null}

            {showHint && hintText ? (
                <div
                    className="profile-text-canvas__reveal-hint"
                    aria-hidden
                    style={{ pointerEvents: 'none', position: 'absolute', insetInline: 0, bottom: '0.55rem', zIndex: 9 }}
                >
                    <span className="profile-text-canvas__reveal-hint-text">{hintText}</span>
                </div>
            ) : null}
        </>
    );
}
