import React, { Suspense, lazy } from 'react';
import { markSettingsFilePickerOpening } from '../settingsFilePickerGrace';
import type { AppearanceSectionViewModel } from './useAppearanceSection';
import { useAppearanceWallpaperCard } from './useAppearanceWallpaperCard';

const WallpaperEditorPanel = lazy(() =>
    import('./WallpaperEditorPanel').then((m) => ({ default: m.WallpaperEditorPanel })),
);

export function AppearanceWallpaperCard({ vm }: { vm: AppearanceSectionViewModel }) {
    const {
        inputId,
        status,
        busy,
        actionLabel,
        onFileChange,
        onRemove,
        onApplyEdit,
        onCancelEdit,
    } = useAppearanceWallpaperCard(vm);

    return (
        <div className="relative z-[1] overflow-visible px-3.5 py-3">
            <div className="flex items-center gap-2.5">
                <div className="relative z-[2] h-12 w-[4.25rem] overflow-hidden rounded-lg ring-1 ring-white/10 shrink-0">
                    {vm.wallpaperSrc ? (
                        <img src={vm.wallpaperSrc} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full" style={{ backgroundColor: vm.previewBaseColor }} />
                    )}
                </div>
                <label
                    data-testid="settings-wallpaper-upload"
                    onPointerDown={() => markSettingsFilePickerOpening()}
                    className={`relative z-[2] flex flex-1 min-h-[44px] cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[12px] font-medium text-white/80 touch-manipulation ${
                        busy || vm.editorBusy ? 'pointer-events-none opacity-60' : 'hover:bg-white/[0.07]'
                    }`}
                >
                    {actionLabel}
                    <input
                        id={inputId}
                        ref={vm.wallpaperRef}
                        type="file"
                        accept="image/*,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.heic,.heif"
                        disabled={busy || vm.editorBusy}
                        data-testid="settings-wallpaper-input"
                        aria-label={actionLabel}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        style={{ fontSize: 16 }}
                        onClick={() => markSettingsFilePickerOpening()}
                        onChange={(e) => void onFileChange(e)}
                    />
                </label>
                {vm.wallpaperSrc ? (
                    <button
                        type="button"
                        disabled={busy || vm.editorBusy}
                        onClick={onRemove}
                        className="relative z-[2] text-[12px] font-medium text-rose-400/90 shrink-0 min-h-[44px] min-w-[44px] px-1 inline-flex items-center justify-center touch-manipulation disabled:opacity-50"
                        data-testid="settings-wallpaper-remove"
                    >
                        إزالة
                    </button>
                ) : null}
            </div>
            {vm.editorDraft ? (
                <Suspense fallback={null}>
                    <WallpaperEditorPanel
                        previewUrl={vm.editorDraft.previewUrl}
                        busy={vm.editorBusy}
                        onApply={onApplyEdit}
                        onCancel={onCancelEdit}
                    />
                </Suspense>
            ) : null}
            {status ? (
                <p
                    className="mt-2 text-[11px] font-medium text-white/45"
                    data-testid="settings-wallpaper-status"
                    role="status"
                >
                    {status}
                </p>
            ) : null}
        </div>
    );
}
