import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    clampProfileBackgroundEditState,
    computeProfileBackgroundCropRect,
    defaultProfileBackgroundEditState,
    exportProfileBackgroundImage,
    loadProfileImageBitmap,
    type ProfileBackgroundEditState,
} from '@/app/services/profile/profileImageEditor';
import { panFromDrag } from '@/app/services/profile/profileCanvasBackgroundPan';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import { trapTabInRoot } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsFocusTrap';
import {
    capturePointerSafe,
    preventDefaultIfCancelable,
} from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';
import { useNonPassiveTouchPrevent } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useNonPassiveTouchPrevent';

type DragState = {
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
};

type Args = {
    open: boolean;
    file: File | null;
    onCancel: () => void;
    onConfirm: (file: File) => void | Promise<void>;
};

export function useProfileCanvasBackgroundEditor({ open, file, onCancel, onConfirm }: Args) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragState | null>(null);
    const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
    const [state, setState] = useState<ProfileBackgroundEditState>(defaultProfileBackgroundEditState);
    const [exporting, setExporting] = useState(false);
    const [frameSize, setFrameSize] = useState({ w: 320, h: 180 });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    useNonPassiveTouchPrevent(frameRef, Boolean(open && file && bitmap && !exporting));

    useEffect(() => {
        if (!open || !file) {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [open, file]);

    useEffect(() => {
        if (!open || !file) {
            setBitmap(null);
            setState(defaultProfileBackgroundEditState());
            return;
        }
        let cancelled = false;
        void loadProfileImageBitmap(file)
            .then((bmp) => {
                if (!cancelled) {
                    setBitmap(bmp);
                    setState(defaultProfileBackgroundEditState());
                } else {
                    bmp.close();
                }
            })
            .catch(() => {
                if (!cancelled) onCancel();
            });
        return () => {
            cancelled = true;
        };
    }, [open, file, onCancel]);

    useEffect(() => {
        if (!open) return;
        const node = frameRef.current;
        if (!node || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (!rect) return;
            setFrameSize({ w: rect.width, h: rect.height });
        });
        ro.observe(node);
        return () => ro.disconnect();
    }, [open, bitmap]);

    useEffect(() => {
        return () => {
            bitmap?.close();
        };
    }, [bitmap]);

    useEffect(() => {
        if (!open) return;
        const focusCancel = window.requestAnimationFrame(() => {
            dialogRef.current
                ?.querySelector<HTMLElement>('button[aria-label="إلغاء"]')
                ?.focus();
        });
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (!exporting) onCancel();
                return;
            }
            if (e.key !== 'Tab') return;
            const root = dialogRef.current;
            if (!root) return;
            trapTabInRoot(e, root);
        };
        window.addEventListener('keydown', onKey, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            if (exporting) return true;
            onCancel();
            return true;
        });
        return () => {
            window.cancelAnimationFrame(focusCancel);
            window.removeEventListener('keydown', onKey, true);
            unregisterNativeBack();
        };
    }, [open, exporting, onCancel]);

    const previewStyle = useMemo(() => {
        if (!bitmap) return undefined;
        const crop = computeProfileBackgroundCropRect(bitmap.width, bitmap.height, state);
        const coverScale = Math.max(frameSize.w / crop.sw, frameSize.h / crop.sh);
        const imgW = bitmap.width * coverScale;
        const imgH = bitmap.height * coverScale;
        const offsetX = frameSize.w / 2 - (crop.sx + crop.sw / 2) * coverScale;
        const offsetY = frameSize.h / 2 - (crop.sy + crop.sh / 2) * coverScale;
        return {
            width: `${imgW}px`,
            height: `${imgH}px`,
            transform: `translate(${offsetX}px, ${offsetY}px)`,
        };
    }, [bitmap, frameSize.h, frameSize.w, state]);

    const onPointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (!bitmap || exporting) return;
            preventDefaultIfCancelable(event);
            capturePointerSafe(event.currentTarget, event.pointerId);
            dragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startPanX: state.panX,
                startPanY: state.panY,
            };
        },
        [bitmap, exporting, state.panX, state.panY],
    );

    const onPointerMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId || !bitmap) return;
            const dx = event.clientX - drag.startX;
            const dy = event.clientY - drag.startY;
            const next = panFromDrag(dx, dy, frameSize.w, frameSize.h, bitmap.width, bitmap.height, {
                scale: state.scale,
                panX: drag.startPanX,
                panY: drag.startPanY,
            });
            setState(next);
        },
        [bitmap, frameSize.h, frameSize.w, state.scale],
    );

    const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
        }
    }, []);

    const handleConfirm = useCallback(async () => {
        if (!bitmap || !file || exporting) return;
        setExporting(true);
        try {
            const preferPng = file.type === 'image/png';
            const exported = await exportProfileBackgroundImage(bitmap, state, file.name, {
                preferPng,
            });
            await onConfirm(exported);
        } finally {
            setExporting(false);
        }
    }, [bitmap, exporting, file, onConfirm, state]);

    const setScale = useCallback((scale: number) => {
        setState((prev) =>
            clampProfileBackgroundEditState({
                ...prev,
                scale,
            }),
        );
    }, []);

    const resetState = useCallback(() => {
        setState(defaultProfileBackgroundEditState());
    }, []);

    return {
        dialogRef,
        frameRef,
        bitmap,
        state,
        exporting,
        previewUrl,
        previewStyle,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        handleConfirm,
        setScale,
        resetState,
    };
}
