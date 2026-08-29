import React from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn } from '@/app/components/ui/icons/ZoomIn';
import { ZoomOut } from '@/app/components/ui/icons/ZoomOut';
import { RotateCcw } from '@/app/components/ui/icons/RotateCcw';
import { X } from '@/app/components/ui/icons/X';
import { Check } from '@/app/components/ui/icons/Check';
import { PROFILE_CANVAS_BACKGROUND_ASPECT } from '@/app/services/profile/profileImageEditor';
import { useProfileCanvasBackgroundEditor } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileCanvasBackgroundEditor';

type ProfileCanvasBackgroundEditorProps = {
    open: boolean;
    file: File | null;
    onCancel: () => void;
    onConfirm: (file: File) => void | Promise<void>;
};

export function ProfileCanvasBackgroundEditor({
    open,
    file,
    onCancel,
    onConfirm,
}: ProfileCanvasBackgroundEditorProps) {
    const {
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
    } = useProfileCanvasBackgroundEditor({ open, file, onCancel, onConfirm });

    if (!open || !file || typeof document === 'undefined') return null;

    return createPortal(
        <div
            ref={dialogRef}
            className="fixed inset-0 z-[320] flex flex-col bg-[#05060D]/96 backdrop-blur-md hami-overlay-safe-insets px-4"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="تحرير خلفية اللوحة"
            data-testid="profile-canvas-bg-editor"
        >
            <div className="flex items-center justify-between gap-3 shrink-0 py-2">
                <h2 className="text-sm font-bold text-[#F4F0E8]">تحرير خلفية اللوحة</h2>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={exporting}
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/10 text-white/60 touch-manipulation"
                    aria-label="إلغاء"
                >
                    <X size={18} />
                </button>
            </div>

            <p className="text-[11px] text-white/45 leading-relaxed shrink-0 mb-3">
                اسحب الصورة لضبط الموضع، واستخدم التكبير للإطار المثالي. تُحفظ بأعلى دقة ممكنة.
            </p>

            <div
                ref={frameRef}
                className="relative mx-auto w-full max-w-[min(100%,520px)] overflow-hidden rounded-2xl border border-[#E6C673]/25 bg-[#0A0F1C] touch-none select-none"
                style={{ aspectRatio: String(PROFILE_CANVAS_BACKGROUND_ASPECT) }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                data-testid="profile-canvas-bg-editor-frame"
            >
                {bitmap && previewStyle && previewUrl ? (
                    <img
                        src={previewUrl}
                        alt=""
                        draggable={false}
                        className="absolute top-0 left-0 max-w-none pointer-events-none"
                        style={previewStyle}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs">
                        جاري التحميل...
                    </div>
                )}
                <div
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[#E6C673]/35 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.35)]"
                    aria-hidden
                />
            </div>

            <div className="mt-4 space-y-3 max-w-[min(100%,520px)] mx-auto w-full shrink-0">
                <label className="flex items-center gap-3 text-[11px] text-white/55">
                    <ZoomOut size={14} className="shrink-0" aria-hidden />
                    <input
                        type="range"
                        min={1}
                        max={4}
                        step={0.01}
                        value={state.scale}
                        onChange={(e) => setScale(Number(e.target.value))}
                        className="flex-1 profile-studio-mini-slider"
                        data-testid="profile-canvas-bg-zoom"
                    />
                    <ZoomIn size={14} className="shrink-0" aria-hidden />
                </label>

                <button
                    type="button"
                    onClick={resetState}
                    disabled={exporting}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-xl border border-white/10 text-white/65 text-[11px] font-bold touch-manipulation"
                >
                    <RotateCcw size={14} aria-hidden />
                    إعادة الضبط
                </button>
            </div>

            <div className="mt-auto pt-4 flex gap-2 max-w-[min(100%,520px)] mx-auto w-full shrink-0">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={exporting}
                    className="flex-1 min-h-[48px] rounded-xl border border-white/12 text-white/70 text-sm font-bold touch-manipulation"
                >
                    إلغاء
                </button>
                <button
                    type="button"
                    onClick={() => void handleConfirm()}
                    disabled={!bitmap || exporting}
                    className="flex-1 min-h-[48px] rounded-xl border border-[#E6C673]/80 bg-[#E6C673] text-[#0A0F1C] text-sm font-bold touch-manipulation disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    data-testid="profile-canvas-bg-apply"
                >
                    <Check size={16} aria-hidden />
                    {exporting ? 'جاري الحفظ...' : 'تطبيق الخلفية'}
                </button>
            </div>
        </div>,
        document.body,
    );
}
