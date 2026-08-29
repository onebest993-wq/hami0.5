import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronLeft } from '@/app/components/ui/icons/ChevronLeft';
import { ChevronRight } from '@/app/components/ui/icons/ChevronRight';
import { Maximize2 } from '@/app/components/ui/icons/Maximize2';
import { X } from '@/app/components/ui/icons/X';
import { ZoomIn } from '@/app/components/ui/icons/ZoomIn';
import { ZoomOut } from '@/app/components/ui/icons/ZoomOut';
import { asHqIdentityImage } from '@/app/components/admin/hqVerificationQueue';
import { isHqAbortError } from '@/app/domain/admin/hqSafeText';
import { fetchLawyerPersonnelDossier } from '@/app/services/auth/lawyerVerificationRemote';
import { cn } from '@/app/components/ui/utils';

export type HqVerifyPeekSlot = { src: string | null; label: string };

const SCALE_MIN = 1;
const SCALE_MAX = 4;
const SCALE_STEP = 0.5;

function clampScale(value: number): number {
    return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(value * 100) / 100));
}

function touchDistance(a: React.Touch, b: React.Touch): number {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function HqVerificationDocPeek({
    userId,
    onClose,
    preloaded,
}: {
    userId: string;
    onClose: () => void;
    preloaded?: HqVerifyPeekSlot[] | null;
}) {
    const titleId = useId();
    const [slots, setSlots] = useState<HqVerifyPeekSlot[] | null>(preloaded ?? null);
    const [failed, setFailed] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [scale, setScale] = useState(SCALE_MIN);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [immersive, setImmersive] = useState(false);
    const draggingRef = useRef(false);
    const lastPointerRef = useRef({ x: 0, y: 0 });
    const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
    const hasPreload = Boolean(preloaded);

    useEffect(() => {
        if (hasPreload) return;
        const ac = new AbortController();
        setSlots(null);
        setFailed(false);
        void fetchLawyerPersonnelDossier(userId, ac.signal)
            .then((record) => {
                if (ac.signal.aborted) return;
                setSlots([
                    { src: asHqIdentityImage(record?.idFrontPreview), label: 'وجه الهوية' },
                    { src: asHqIdentityImage(record?.idBackPreview), label: 'ظهر الهوية' },
                    { src: asHqIdentityImage(record?.faceSelfiePreview), label: 'صورة إضافية' },
                ]);
            })
            .catch((error: unknown) => {
                if (ac.signal.aborted || isHqAbortError(error, ac.signal)) return;
                setFailed(true);
            });
        return () => {
            ac.abort();
        };
    }, [userId, hasPreload]);

    useEffect(() => {
        if (!slots) return;
        const first = slots.findIndex((slot) => Boolean(slot.src));
        setActiveIndex(first >= 0 ? first : 0);
        setScale(SCALE_MIN);
        setOffset({ x: 0, y: 0 });
    }, [slots]);

    const attachedIndexes = useMemo(
        () => (slots ?? []).map((slot, index) => (slot.src ? index : -1)).filter((index) => index >= 0),
        [slots],
    );
    const active = slots?.[activeIndex] ?? null;

    const resetView = () => {
        setScale(SCALE_MIN);
        setOffset({ x: 0, y: 0 });
    };

    const selectIndex = (index: number) => {
        setActiveIndex(index);
        resetView();
    };

    const goAttached = (delta: number) => {
        if (attachedIndexes.length === 0) return;
        const pos = attachedIndexes.indexOf(activeIndex);
        const from = pos >= 0 ? pos : 0;
        const next = attachedIndexes[(from + delta + attachedIndexes.length) % attachedIndexes.length];
        if (typeof next === 'number') selectIndex(next);
    };

    const zoomBy = (delta: number) => {
        setScale((prev) => {
            const next = clampScale(prev + delta);
            if (next <= SCALE_MIN) setOffset({ x: 0, y: 0 });
            return next;
        });
    };

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                if (immersive) {
                    setImmersive(false);
                    return;
                }
                if (scale > SCALE_MIN) {
                    resetView();
                    return;
                }
                onClose();
                return;
            }
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goAttached(-1);
            }
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                goAttached(1);
            }
            if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                zoomBy(SCALE_STEP);
            }
            if (event.key === '-' || event.key === '_') {
                event.preventDefault();
                zoomBy(-SCALE_STEP);
            }
        };
        window.addEventListener('keydown', onKey, true);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey, true);
            document.body.style.overflow = previousOverflow;
        };
    }, [onClose, immersive, scale, activeIndex, attachedIndexes]);

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (scale <= SCALE_MIN) return;
        draggingRef.current = true;
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!draggingRef.current) return;
        const dx = event.clientX - lastPointerRef.current.x;
        const dy = event.clientY - lastPointerRef.current.y;
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
        setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    };

    const onPointerUp = () => {
        draggingRef.current = false;
    };

    const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        zoomBy(event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP);
    };

    const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length !== 2) return;
        pinchRef.current = { dist: touchDistance(event.touches[0], event.touches[1]), scale };
    };

    const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length !== 2 || !pinchRef.current) return;
        event.preventDefault();
        const dist = touchDistance(event.touches[0], event.touches[1]);
        const ratio = dist / Math.max(1, pinchRef.current.dist);
        setScale(clampScale(pinchRef.current.scale * ratio));
    };

    const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length < 2) pinchRef.current = null;
    };

    return (
        <div
            className={cn('hq-verify-peek', immersive && 'hq-verify-peek-immersive')}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-testid="hq-verify-peek"
            onClick={onClose}
        >
            <div
                className={cn('hq-verify-peek-panel', immersive && 'hq-verify-peek-panel-immersive')}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="hq-verify-peek-head">
                    <div className="min-w-0">
                        <p className="hq-kicker">المرفقات</p>
                        <h3 id={titleId} className="hq-verify-peek-title">
                            وثائق الهوية
                        </h3>
                        {active ? (
                            <p className="hq-verify-peek-sub">
                                {active.label}
                                {active.src ? ` · ${Math.round(scale * 100)}٪` : ''}
                            </p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        className="hq-btn hq-btn-ghost min-h-11 px-3"
                        onClick={onClose}
                        aria-label="إغلاق المعاينة"
                        data-testid="hq-verify-peek-close"
                    >
                        <X className="h-4 w-4" aria-hidden />
                    </button>
                </div>
                {failed ? (
                    <p className="hq-verify-peek-msg" role="alert">
                        تعذّر جلب الوثائق. يمكن مراجعتها من إضبارة الحساب.
                    </p>
                ) : slots == null ? (
                    <p className="hq-verify-peek-msg">جاري فتح المعاينة…</p>
                ) : (
                    <>
                        <div
                            className="hq-verify-stage-wrap"
                            data-testid="hq-verify-stage"
                            onPointerDown={onPointerDown}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={onPointerUp}
                            onWheel={onWheel}
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                            onDoubleClick={() =>
                                setScale((prev) => (prev > SCALE_MIN ? SCALE_MIN : 2))
                            }
                        >
                            {active?.src ? (
                                <div
                                    className="hq-verify-stage"
                                    style={{
                                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                                    }}
                                >
                                    <img
                                        src={active.src}
                                        alt={active.label}
                                        className="hq-verify-frame-img hq-verify-stage-img"
                                        decoding="async"
                                        draggable={false}
                                        referrerPolicy="no-referrer"
                                        data-testid="hq-verify-stage-img"
                                    />
                                </div>
                            ) : (
                                <div className="hq-verify-frame-empty hq-verify-stage-empty">غير مرفق</div>
                            )}
                        </div>
                        <div className="hq-verify-peek-tools" role="toolbar" aria-label="عرض الوثيقة">
                            <button
                                type="button"
                                className="hq-verify-tool"
                                onClick={() => goAttached(-1)}
                                disabled={attachedIndexes.length < 2}
                                aria-label="الوثيقة السابقة"
                            >
                                <ChevronRight className="h-4 w-4" aria-hidden />
                                السابق
                            </button>
                            <button
                                type="button"
                                className="hq-verify-tool"
                                onClick={() => zoomBy(-SCALE_STEP)}
                                disabled={!active?.src || scale <= SCALE_MIN}
                                aria-label="تصغير"
                                data-testid="hq-verify-zoom-out"
                            >
                                <ZoomOut className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                                type="button"
                                className="hq-verify-tool hq-verify-tool-pct"
                                onClick={resetView}
                                disabled={!active?.src || scale <= SCALE_MIN}
                                aria-label="إعادة الحجم"
                            >
                                {Math.round(scale * 100)}٪
                            </button>
                            <button
                                type="button"
                                className="hq-verify-tool"
                                onClick={() => zoomBy(SCALE_STEP)}
                                disabled={!active?.src || scale >= SCALE_MAX}
                                aria-label="تكبير"
                                data-testid="hq-verify-zoom-in"
                            >
                                <ZoomIn className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                                type="button"
                                className="hq-verify-tool"
                                aria-pressed={immersive}
                                onClick={() => setImmersive((prev) => !prev)}
                                aria-label={immersive ? 'إغلاق العرض الكامل' : 'عرض كامل للشاشة'}
                                data-testid="hq-verify-immersive"
                            >
                                <Maximize2 className="h-4 w-4" aria-hidden />
                                {immersive ? 'نافذة' : 'كامل'}
                            </button>
                            <button
                                type="button"
                                className="hq-verify-tool"
                                onClick={() => goAttached(1)}
                                disabled={attachedIndexes.length < 2}
                                aria-label="الوثيقة التالية"
                            >
                                التالي
                                <ChevronLeft className="h-4 w-4" aria-hidden />
                            </button>
                        </div>
                        <div className="hq-verify-film" role="tablist" aria-label="الوثائق الثلاث">
                            {slots.map((slot, index) => (
                                <button
                                    key={slot.label}
                                    type="button"
                                    role="tab"
                                    aria-selected={index === activeIndex}
                                    aria-label={slot.src ? `${slot.label} — فتح بالحجم الكامل` : `${slot.label} غير مرفق`}
                                    disabled={!slot.src}
                                    className={cn(
                                        'hq-verify-thumb',
                                        index === activeIndex && 'hq-verify-thumb-active',
                                    )}
                                    onClick={() => selectIndex(index)}
                                    data-testid={`hq-verify-thumb-${index}`}
                                >
                                    {slot.src ? (
                                        <img
                                            src={slot.src}
                                            alt=""
                                            className="hq-verify-frame-img"
                                            decoding="async"
                                            draggable={false}
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className="hq-verify-frame-empty">غير مرفق</div>
                                    )}
                                    <span>{slot.label}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
