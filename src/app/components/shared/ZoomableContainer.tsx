import React, { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { Maximize, ZoomIn, ZoomOut } from '@/app/components/ui/lucideIcons';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
/** عتبة اعتبار المحتوى «مقرّباً» — تحمي من أخطاء الفاصلة العائمة عند 1x */
const ZOOMED_EPSILON = 1.001;
/** حساسية عجلة الفأرة — أسّي حتى يكون التقريب متجانساً في كل المستويات */
const WHEEL_ZOOM_INTENSITY = 0.0018;

export interface ZoomableContainerProps {
    children: React.ReactNode;
    className?: string;
    /**
     * plain — عجلة الفأرة تقرّب مباشرة (مناسب للصور حيث لا يوجد تمرير داخلي).
     * modifier — التقريب بـ Ctrl/Cmd + عجلة أو قرصة لوحة اللمس (مناسب لعارض PDF
     * حتى تبقى العجلة العادية لتمرير الصفحات).
     */
    wheelZoom?: 'plain' | 'modifier';
    /** يسمح بالتمرير الرأسي الأصلي داخل المحتوى عند 1x (عارض PDF متعدد الصفحات) */
    nativeVerticalScroll?: boolean;
    /** أزرار تقريب/تصغير/إعادة ضبط عائمة — لمن لا يعرف إيماءات القرصة أو Ctrl+عجلة */
    showControls?: boolean;
}

/** خطوة أزرار التقريب — نفس الإحساس على كل المستويات (أُسّي) */
const BUTTON_ZOOM_STEP = 1.25;

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampZoom(value: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

/**
 * محرك «تقريب وتحريك» إيمائي للمستندات — قرصة للتقريب على اللمس، عجلة للتقريب
 * على سطح المكتب، وسحب حر (pan) ضمن حدود الحاوية عند التقريب > 1x.
 * الرسم عبر transform: scale/x/y فقط (GPU) دون أي تعديل على أبعاد DOM.
 * إعادة الضبط تتم بإعادة التركيب (key بمعرّف المستند) عند تغيير/إغلاق المستند.
 */
export const ZoomableContainer: React.FC<ZoomableContainerProps> = ({
    children,
    className,
    wheelZoom = 'plain',
    nativeVerticalScroll = false,
    showControls = false,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const scaleRef = useRef(1);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const pointersRef = useRef(new Map<number, { x: number; y: number }>());
    const pinchRef = useRef<{ startDistance: number; startScale: number } | null>(null);

    const panBounds = useCallback((forScale: number) => {
        const el = containerRef.current;
        const width = el?.clientWidth ?? 0;
        const height = el?.clientHeight ?? 0;
        return {
            x: Math.max(0, ((forScale - 1) * width) / 2),
            y: Math.max(0, ((forScale - 1) * height) / 2),
        };
    }, []);

    const applyScale = useCallback(
        (next: number) => {
            const clamped = clampZoom(next);
            if (clamped === scaleRef.current) return;
            scaleRef.current = clamped;
            setScale(clamped);

            if (clamped <= ZOOMED_EPSILON) {
                animate(x, 0, { type: 'spring', stiffness: 320, damping: 32 });
                animate(y, 0, { type: 'spring', stiffness: 320, damping: 32 });
                return;
            }
            // عند التصغير: أعد الإزاحة داخل الحدود الجديدة حتى لا يعلق المحتوى خارج الإطار
            const bounds = panBounds(clamped);
            const clampedX = Math.min(bounds.x, Math.max(-bounds.x, x.get()));
            const clampedY = Math.min(bounds.y, Math.max(-bounds.y, y.get()));
            if (clampedX !== x.get()) animate(x, clampedX, { type: 'spring', stiffness: 320, damping: 32 });
            if (clampedY !== y.get()) animate(y, clampedY, { type: 'spring', stiffness: 320, damping: 32 });
        },
        [panBounds, x, y],
    );

    // عجلة سطح المكتب — مستمع أصلي غير passive لأن React يسجّل wheel كـ passive
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            const zoomIntent = wheelZoom === 'plain' || e.ctrlKey || e.metaKey;
            if (!zoomIntent) return;
            e.preventDefault();
            applyScale(scaleRef.current * Math.exp(-e.deltaY * WHEEL_ZOOM_INTENSITY));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [applyScale, wheelZoom]);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointersRef.current.size === 2) {
            const [a, b] = Array.from(pointersRef.current.values());
            pinchRef.current = {
                startDistance: Math.max(distanceBetween(a, b), 1),
                startScale: scaleRef.current,
            };
        }
    }, []);

    const handlePointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!pointersRef.current.has(e.pointerId)) return;
            pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const pinch = pinchRef.current;
            if (!pinch || pointersRef.current.size < 2) return;
            const [a, b] = Array.from(pointersRef.current.values());
            applyScale(pinch.startScale * (distanceBetween(a, b) / pinch.startDistance));
        },
        [applyScale],
    );

    const handlePointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        pointersRef.current.delete(e.pointerId);
        if (pointersRef.current.size < 2) pinchRef.current = null;
    }, []);

    const zoomed = scale > ZOOMED_EPSILON;
    const bounds = panBounds(scale);

    return (
        <div
            ref={containerRef}
            className={`relative h-full w-full overflow-hidden overscroll-contain ${className ?? ''}`}
            style={{ touchAction: !zoomed && nativeVerticalScroll ? 'pan-y' : 'none' }}
            data-testid="zoomable-container"
            data-zoomed={zoomed ? 'true' : 'false'}
            data-scale={scale.toFixed(2)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
        >
            <motion.div
                drag={zoomed}
                dragConstraints={{ left: -bounds.x, right: bounds.x, top: -bounds.y, bottom: bounds.y }}
                dragElastic={0.08}
                dragMomentum={false}
                style={{ x, y, scale }}
                className={`flex h-full w-full flex-col ${zoomed ? 'cursor-grab active:cursor-grabbing' : ''}`}
                data-hami-gpu-hot={zoomed ? '1' : undefined}
            >
                {children}
            </motion.div>
            {showControls ? (
                <div
                    className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-2xl border border-white/[0.1] bg-[#0B1021]/90 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md"
                    data-testid="zoomable-controls"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => applyScale(scaleRef.current * BUTTON_ZOOM_STEP)}
                        disabled={scale >= MAX_ZOOM}
                        aria-label="تكبير"
                        title="تكبير (Ctrl + عجلة الفأرة أو قرصة اللمس)"
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 touch-manipulation"
                    >
                        <ZoomIn size={17} />
                    </button>
                    <span className="min-w-11 select-none text-center text-[11px] font-bold tabular-nums text-white/55">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={() => applyScale(scaleRef.current / BUTTON_ZOOM_STEP)}
                        disabled={!zoomed}
                        aria-label="تصغير"
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 touch-manipulation"
                    >
                        <ZoomOut size={17} />
                    </button>
                    <button
                        type="button"
                        onClick={() => applyScale(MIN_ZOOM)}
                        disabled={!zoomed}
                        aria-label="إعادة الضبط إلى الحجم الأصلي"
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 touch-manipulation"
                    >
                        <Maximize size={15} />
                    </button>
                </div>
            ) : null}
        </div>
    );
};
