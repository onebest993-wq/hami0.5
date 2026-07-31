import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Maximize2, Move, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { ProfileGalleryItem } from '@/app/services/lawyer-cloud';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { ProfileAvatarImage } from './ProfileAvatarImage';
import { galleryItemImageStyle } from '../utils/profileSections';

function clampFocus(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function clampZoom(value: number) {
    return Math.max(50, Math.min(400, Math.round(value)));
}

type GalleryViewerMode = 'view' | 'adjust';

type ProfileGalleryViewerProps = {
    item: ProfileGalleryItem;
    open: boolean;
    canAdjust: boolean;
    initialMode?: GalleryViewerMode;
    onClose: () => void;
    onSaveAdjust?: (next: ProfileGalleryItem) => void;
};

export function ProfileGalleryViewer({
    item,
    open,
    canAdjust,
    initialMode = 'view',
    onClose,
    onSaveAdjust,
}: ProfileGalleryViewerProps) {
    const titleId = useId();
    const stageRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);
    const [mode, setMode] = useState<GalleryViewerMode>(initialMode);
    const [draft, setDraft] = useState<ProfileGalleryItem>(item);
    /** بعد «تم» اعرض المسودة حتى يصل تحديث الأب — يمنع ومضة focus/zoom القديم */
    const [displayOverride, setDisplayOverride] = useState<ProfileGalleryItem | null>(null);

    useBodyScrollLock(open);
    const dialogRef = useRef<HTMLDivElement>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;
        setMode(canAdjust && initialMode === 'adjust' ? 'adjust' : 'view');
        setDisplayOverride(null);
        setDraft({
            url: item.url,
            focusX: item.focusX ?? 50,
            focusY: item.focusY ?? 50,
            zoom: item.zoom ?? 100,
            ...(item.storagePath ? { storagePath: item.storagePath } : null),
        });
    }, [open, item, canAdjust, initialMode]);

    useEffect(() => {
        if (!open) return;
        previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
        return () => {
            previouslyFocusedRef.current?.focus?.();
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const collectFocusables = () => {
            const root = dialogRef.current;
            if (!root) return [] as HTMLElement[];
            const sheet = root.querySelector<HTMLElement>('.hami-profile-gallery-viewer__sheet');
            const scope = sheet ?? root;
            return Array.from(
                scope.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ),
            ).filter((el) => {
                if (el.classList.contains('hami-profile-gallery-viewer__backdrop')) return false;
                if (el.getAttribute('aria-hidden') === 'true') return false;
                if (el.offsetParent !== null) return true;
                if (!el.isConnected) return false;
                try {
                    const style = window.getComputedStyle(el);
                    if (style.display === 'none' || style.visibility === 'hidden') return false;
                } catch {
                    /* ignore */
                }
                return true;
            });
        };

        const focusables = collectFocusables();
        const initial =
            focusables.find((el) => el.getAttribute('aria-label') === 'إغلاق') ?? focusables[0] ?? null;
        window.requestAnimationFrame(() => initial?.focus());

        const exitAdjustOrClose = () => {
            if (mode === 'adjust' && initialMode !== 'adjust') {
                setDraft({
                    url: item.url,
                    focusX: item.focusX ?? 50,
                    focusY: item.focusY ?? 50,
                    zoom: item.zoom ?? 100,
                    ...(item.storagePath ? { storagePath: item.storagePath } : null),
                });
                setMode('view');
                return;
            }
            onClose();
        };

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                exitAdjustOrClose();
                return;
            }
            if (event.key !== 'Tab') return;
            const live = collectFocusables();
            const root = dialogRef.current;
            if (!root || live.length === 0) return;
            const first = live[0]!;
            const last = live[live.length - 1]!;
            const active = document.activeElement as HTMLElement | null;
            if (event.shiftKey) {
                if (active === first || !root.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (active === last || !root.contains(active)) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => {
            window.removeEventListener('keydown', onKey, true);
        };
    }, [open, mode, initialMode, item, onClose]);

    const computeFocus = useCallback((clientX: number, clientY: number) => {
        const el = stageRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
            focusX: clampFocus(((clientX - rect.left) / rect.width) * 100),
            focusY: clampFocus(((clientY - rect.top) / rect.height) * 100),
        };
    }, []);

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (mode !== 'adjust') return;
        if ((event.target as HTMLElement).closest('[data-gallery-controls]')) return;
        dragging.current = true;
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            /* بعض WebViews ترفض capture */
        }
        const next = computeFocus(event.clientX, event.clientY);
        if (next) setDraft((prev) => ({ ...prev, ...next }));
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (mode !== 'adjust' || !dragging.current) return;
        const next = computeFocus(event.clientX, event.clientY);
        if (next) setDraft((prev) => ({ ...prev, ...next }));
    };

    const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
        dragging.current = false;
        try {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
        } catch {
            /* ignore */
        }
    };

    const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        if (mode !== 'adjust') return;
        event.preventDefault();
        const delta = event.deltaY > 0 ? -8 : 8;
        setDraft((prev) => ({ ...prev, zoom: clampZoom((prev.zoom ?? 100) + delta) }));
    };

    const handleConfirm = () => {
        onSaveAdjust?.(draft);
        setDisplayOverride(draft);
        setMode('view');
        if (initialMode === 'adjust') onClose();
    };

    if (!open || typeof document === 'undefined') return null;

    const display = mode === 'adjust' ? draft : (displayOverride ?? item);
    const imgStyle = galleryItemImageStyle(display);

    return createPortal(
        <div
            ref={dialogRef}
            className="hami-profile-gallery-viewer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-testid="profile-gallery-viewer"
        >
            <button
                type="button"
                className="hami-profile-gallery-viewer__backdrop"
                aria-label="إغلاق المعرض"
                tabIndex={-1}
                onClick={onClose}
            />

            <div className="hami-profile-gallery-viewer__sheet">
                <div className="hami-profile-gallery-viewer__top">
                    <h2 id={titleId} className="hami-profile-gallery-viewer__title">
                        {mode === 'adjust' ? 'ضبط موضع الصورة' : 'معاينة الصورة'}
                    </h2>
                    <button
                        type="button"
                        className="hami-profile-gallery-viewer__icon-btn"
                        onClick={onClose}
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div
                    ref={stageRef}
                    className="hami-profile-gallery-viewer__stage"
                    data-adjust={mode === 'adjust' ? 'true' : 'false'}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={finishPointer}
                    onPointerCancel={finishPointer}
                    onLostPointerCapture={finishPointer}
                    onWheel={onWheel}
                >
                    <ProfileAvatarImage
                        src={display.url}
                        alt="صورة المعرض"
                        className="hami-profile-gallery-viewer__img"
                        style={imgStyle}
                    />
                    {mode === 'adjust' ? (
                        <span
                            className="hami-profile-gallery-viewer__reticle"
                            style={{ left: `${display.focusX ?? 50}%`, top: `${display.focusY ?? 50}%` }}
                            aria-hidden
                        />
                    ) : null}
                </div>

                {mode === 'adjust' ? (
                    <div className="hami-profile-gallery-viewer__controls" data-gallery-controls>
                        <div className="hami-profile-gallery-viewer__zoom-row">
                            <button
                                type="button"
                                className="hami-profile-gallery-viewer__icon-btn"
                                aria-label="تصغير"
                                onClick={() =>
                                    setDraft((prev) => ({ ...prev, zoom: clampZoom((prev.zoom ?? 100) - 10) }))
                                }
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span className="hami-profile-gallery-viewer__zoom-badge">{display.zoom ?? 100}%</span>
                            <button
                                type="button"
                                className="hami-profile-gallery-viewer__icon-btn"
                                aria-label="تكبير"
                                onClick={() =>
                                    setDraft((prev) => ({ ...prev, zoom: clampZoom((prev.zoom ?? 100) + 10) }))
                                }
                            >
                                <ZoomIn size={16} />
                            </button>
                        </div>
                        <p className="hami-profile-gallery-viewer__hint">
                            <Move size={12} aria-hidden />
                            اسحب لتحريك الموضع · عجلة الفأرة أو الأزرار للتكبير
                        </p>
                        <div className="hami-profile-gallery-viewer__actions">
                            <button
                                type="button"
                                className="hami-profile-gallery-viewer__btn"
                                onClick={() => {
                                    setDraft({
                                        url: item.url,
                                        focusX: item.focusX ?? 50,
                                        focusY: item.focusY ?? 50,
                                        zoom: item.zoom ?? 100,
                                        ...(item.storagePath ? { storagePath: item.storagePath } : null),
                                    });
                                    if (initialMode === 'adjust') onClose();
                                    else setMode('view');
                                }}
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                className="hami-profile-gallery-viewer__btn hami-profile-gallery-viewer__btn--primary"
                                data-testid="profile-gallery-adjust-save"
                                onClick={handleConfirm}
                            >
                                <Check size={14} />
                                تم
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="hami-profile-gallery-viewer__controls" data-gallery-controls>
                        <div className="hami-profile-gallery-viewer__actions">
                            {canAdjust ? (
                                <button
                                    type="button"
                                    className="hami-profile-gallery-viewer__btn hami-profile-gallery-viewer__btn--primary"
                                    data-testid="profile-gallery-adjust-open"
                                    onClick={() => setMode('adjust')}
                                >
                                    <Maximize2 size={14} />
                                    ضبط الموضع
                                </button>
                            ) : null}
                            <button type="button" className="hami-profile-gallery-viewer__btn" onClick={onClose}>
                                إغلاق
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
