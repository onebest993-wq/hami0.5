import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';
import { ProfileMediaFrame } from '../ProfileMediaFrame';

function clampFocus(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function clampZoom(value: number) {
    return Math.max(50, Math.min(400, Math.round(value)));
}

type ImageFocusPickerProps = {
    block: ProfileCustomBlock;
    src: string;
    onChange: (patch: Partial<ProfileCustomBlock>) => void;
};

export function ImageFocusPicker({ block, src, onChange }: ImageFocusPickerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);
    const pendingFocus = useRef<{ x: number; y: number } | null>(null);
    const committedX = block.imageFocusX ?? 50;
    const committedY = block.imageFocusY ?? 50;
    const committedZoom = block.imageZoom ?? 100;
    const [liveFocus, setLiveFocus] = useState({ x: committedX, y: committedY });
    const [liveZoom, setLiveZoom] = useState(committedZoom);
    const height = 180;

    useEffect(() => {
        if (!dragging.current) {
            setLiveFocus({ x: committedX, y: committedY });
        }
    }, [committedX, committedY]);

    useEffect(() => {
        setLiveZoom(committedZoom);
    }, [committedZoom]);

    const computeFocus = useCallback((clientX: number, clientY: number) => {
        const el = ref.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
            x: clampFocus(((clientX - rect.left) / rect.width) * 100),
            y: clampFocus(((clientY - rect.top) / rect.height) * 100),
        };
    }, []);

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('.profile-image-focus-picker__zoom-controls')) return;
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        const next = computeFocus(e.clientX, e.clientY);
        if (next) {
            pendingFocus.current = next;
            setLiveFocus(next);
        }
    };

    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragging.current) return;
        const next = computeFocus(e.clientX, e.clientY);
        if (next) {
            pendingFocus.current = next;
            setLiveFocus(next);
        }
    };

    const finishPointer = (e: React.PointerEvent<HTMLDivElement>) => {
        dragging.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        const pending = pendingFocus.current;
        pendingFocus.current = null;
        if (pending) {
            onChange({ imageFocusX: pending.x, imageFocusY: pending.y });
        }
    };

    const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -8 : 8;
        const nextZoom = clampZoom(liveZoom + delta);
        setLiveZoom(nextZoom);
        onChange({ imageZoom: nextZoom });
    };

    const previewBlock: ProfileCustomBlock = {
        ...block,
        imageFocusX: liveFocus.x,
        imageFocusY: liveFocus.y,
        imageZoom: liveZoom,
    };

    return (
        <div
            ref={ref}
            className="profile-image-focus-picker"
            style={{ height }}
            data-testid="image-focus-picker"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
            onWheel={onWheel}
        >
            <ProfileMediaFrame
                block={previewBlock}
                src={src}
                template={block.mediaTemplate}
                heightPx={height}
                borderless
                previewInteractive
            />
            <span
                className="profile-image-focus-picker__reticle"
                style={{ left: `${liveFocus.x}%`, top: `${liveFocus.y}%` }}
                aria-hidden
            />
            <div className="profile-image-focus-picker__zoom-controls">
                <button
                    type="button"
                    className="profile-image-focus-picker__zoom-btn"
                    aria-label="تصغير"
                    onClick={() => {
                        const next = clampZoom(liveZoom - 10);
                        setLiveZoom(next);
                        onChange({ imageZoom: next });
                    }}
                >
                    −
                </button>
                <span className="profile-image-focus-picker__zoom-badge">{liveZoom}%</span>
                <button
                    type="button"
                    className="profile-image-focus-picker__zoom-btn"
                    aria-label="تكبير"
                    onClick={() => {
                        const next = clampZoom(liveZoom + 10);
                        setLiveZoom(next);
                        onChange({ imageZoom: next });
                    }}
                >
                    +
                </button>
            </div>
            <p className="profile-image-focus-picker__hint">اسحب لتحريك · عجلة الفأرة للتكبير</p>
        </div>
    );
}
