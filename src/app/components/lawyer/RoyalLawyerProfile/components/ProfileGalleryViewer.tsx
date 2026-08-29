import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check } from '@/app/components/ui/icons/Check';
import { Maximize2 } from '@/app/components/ui/icons/Maximize2';
import { Move } from '@/app/components/ui/icons/Move';
import { X } from '@/app/components/ui/icons/X';
import { ZoomIn } from '@/app/components/ui/icons/ZoomIn';
import { ZoomOut } from '@/app/components/ui/icons/ZoomOut';
import type { ProfileGalleryItem } from '@/app/services/lawyer-cloud';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { ProfileAvatarImage } from './ProfileAvatarImage';
import { galleryItemImageStyle } from '@/app/services/profile/profileSections';
import { useProfileGalleryViewerFocusTrap } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileGalleryViewerFocusTrap';
import { useProfileGalleryViewerAdjust } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileGalleryViewerAdjust';

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
    const dialogRef = useRef<HTMLDivElement>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

    useBodyScrollLock(open);

    const {
        stageRef,
        mode,
        setMode,
        setDraft,
        display,
        onPointerDown,
        onPointerMove,
        finishPointer,
        onWheel,
        handleConfirm,
        handleCancelAdjust,
        zoomOut,
        zoomIn,
        enterAdjust,
    } = useProfileGalleryViewerAdjust({
        item,
        open,
        canAdjust,
        initialMode,
        onClose,
        onSaveAdjust,
    });

    useProfileGalleryViewerFocusTrap({
        open,
        mode,
        initialMode,
        item,
        dialogRef,
        previouslyFocusedRef,
        setDraft,
        setMode,
        onClose,
    });

    if (!open || typeof document === 'undefined') return null;

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
                                onClick={zoomOut}
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span className="hami-profile-gallery-viewer__zoom-badge">
                                {display.zoom ?? 100}%
                            </span>
                            <button
                                type="button"
                                className="hami-profile-gallery-viewer__icon-btn"
                                aria-label="تكبير"
                                onClick={zoomIn}
                            >
                                <ZoomIn size={16} />
                            </button>
                        </div>
                        <p className="hami-profile-gallery-viewer__hint">
                            <Move size={12} aria-hidden />
                            اسحب لتحريك الموضع · قرص الإصبعين أو العجلة للتكبير
                        </p>
                        <div className="hami-profile-gallery-viewer__actions">
                            <button
                                type="button"
                                className="hami-profile-gallery-viewer__btn"
                                onClick={handleCancelAdjust}
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
                        <div className="hami-profile-gallery-viewer__zoom-row">
                            <button
                                type="button"
                                className="hami-profile-gallery-viewer__icon-btn"
                                aria-label="تصغير المعاينة"
                                data-testid="profile-gallery-view-zoom-out"
                                onClick={zoomOut}
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span className="hami-profile-gallery-viewer__zoom-badge">
                                {display.zoom ?? 100}%
                            </span>
                            <button
                                type="button"
                                className="hami-profile-gallery-viewer__icon-btn"
                                aria-label="تكبير المعاينة"
                                data-testid="profile-gallery-view-zoom-in"
                                onClick={zoomIn}
                            >
                                <ZoomIn size={16} />
                            </button>
                        </div>
                        <p className="hami-profile-gallery-viewer__hint">
                            قرص الإصبعين أو الأزرار لتكبير المعاينة (لا يُحفظ)
                        </p>
                        <div className="hami-profile-gallery-viewer__actions">
                            {canAdjust ? (
                                <button
                                    type="button"
                                    className="hami-profile-gallery-viewer__btn hami-profile-gallery-viewer__btn--primary"
                                    data-testid="profile-gallery-adjust-open"
                                    onClick={enterAdjust}
                                >
                                    <Maximize2 size={14} />
                                    ضبط الموضع
                                </button>
                            ) : null}
                            <button
                                type="button"
                                className="hami-profile-gallery-viewer__btn"
                                onClick={onClose}
                            >
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
