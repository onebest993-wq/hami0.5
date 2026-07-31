import React, { useCallback, useEffect, useRef } from 'react';
import { isAndroidNativeShell } from '@/app/runtime/nativePlatform';
import { MIST_CLEAR_STROKES } from './constants';

type MistFogLayerProps = {
    active: boolean;
    interactive: boolean;
    accent: string;
    onCleared: () => void;
    onFirstTouch?: () => void;
};

export function MistFogLayer({
    active,
    interactive,
    accent,
    onCleared,
    onFirstTouch,
}: MistFogLayerProps) {
    const androidLite = isAndroidNativeShell();
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const eraseCountRef = useRef(0);
    const touchedRef = useRef(false);

    const paintFog = useCallback(() => {
        if (androidLite) return;
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;
        const w = Math.max(1, wrap.clientWidth);
        const h = Math.max(1, wrap.clientHeight);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        const grad = ctx.createRadialGradient(w * 0.5, h * 0.38, 8, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
        grad.addColorStop(0, 'rgba(32, 28, 18, 0.38)');
        grad.addColorStop(0.35, 'rgba(14, 16, 28, 0.62)');
        grad.addColorStop(0.72, 'rgba(8, 10, 18, 0.74)');
        grad.addColorStop(1, 'rgba(4, 5, 10, 0.82)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 42; i++) {
            const alpha = 0.02 + Math.random() * 0.05;
            ctx.fillStyle = `rgba(230, 198, 115, ${alpha})`;
            ctx.beginPath();
            ctx.arc(Math.random() * w, Math.random() * h, 0.8 + Math.random() * 2.4, 0, Math.PI * 2);
            ctx.fill();
        }
        for (let i = 0; i < 6; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = 18 + Math.random() * 36;
            const fog = ctx.createRadialGradient(x, y, 0, x, y, r);
            fog.addColorStop(0, 'rgba(230, 198, 115, 0.08)');
            fog.addColorStop(1, 'rgba(230, 198, 115, 0)');
            ctx.fillStyle = fog;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        eraseCountRef.current = 0;
    }, [androidLite]);

    useEffect(() => {
        if (!active || androidLite) return;
        paintFog();
        const ro = new ResizeObserver(() => {
            /* لا تُعد رسم الضباب كاملاً أثناء المسح — يمحو تقدّم الإيماءة */
            if (eraseCountRef.current > 0) return;
            paintFog();
        });
        if (wrapRef.current) ro.observe(wrapRef.current);
        return () => ro.disconnect();
    }, [active, androidLite, paintFog]);

    const eraseAt = useCallback(
        (clientX: number, clientY: number) => {
            if (!touchedRef.current) {
                touchedRef.current = true;
                onFirstTouch?.();
            }
            if (androidLite) return;
            const canvas = canvasRef.current;
            const wrap = wrapRef.current;
            if (!canvas || !wrap) return;
            const rect = wrap.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.globalCompositeOperation = 'destination-out';
            const r = 54;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(0,0,0,0.92)');
            g.addColorStop(0.45, 'rgba(0,0,0,0.42)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            eraseCountRef.current += 1;
            if (eraseCountRef.current >= MIST_CLEAR_STROKES) onCleared();
        },
        [androidLite, onCleared, onFirstTouch],
    );

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
        /* Android: طبقة CSS ثابتة — أول لمسة تكشف فوراً بلا canvas */
        if (androidLite) {
            if (!touchedRef.current) {
                touchedRef.current = true;
                onFirstTouch?.();
            }
            onCleared();
            return;
        }
        eraseAt(e.clientX, e.clientY);
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
            onCleared();
        }
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (androidLite) return;
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        eraseAt(e.clientX, e.clientY);
    };

    const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
        try {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch {
            /* ignore */
        }
    };

    if (!active) return null;

    return (
        <div
            ref={wrapRef}
            className="profile-text-canvas__mist-canvas-wrap"
            data-interactive={interactive ? 'true' : 'false'}
            data-android-lite={androidLite ? 'true' : undefined}
            style={{ '--canvas-accent': accent } as React.CSSProperties}
            onPointerDown={interactive ? onPointerDown : undefined}
            onPointerMove={interactive ? onPointerMove : undefined}
            onPointerUp={interactive ? onPointerEnd : undefined}
            onPointerCancel={interactive ? onPointerEnd : undefined}
        >
            {androidLite ? (
                <div
                    className="profile-text-canvas__mist-static"
                    aria-hidden
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                            'radial-gradient(ellipse 75% 60% at 50% 38%, rgba(32,28,18,0.55), rgba(4,5,10,0.88))',
                    }}
                />
            ) : (
                <canvas ref={canvasRef} className="profile-text-canvas__mist-canvas" />
            )}
            <div className="profile-text-canvas__mist-shimmer" aria-hidden />
            <div className="profile-text-canvas__mist-gold-haze" aria-hidden />
        </div>
    );
}
