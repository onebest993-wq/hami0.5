import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    persistWallpaper,
    resolveWallpaperSrc,
    applyWallpaperSurfaceVarsWhenReady,
    type AppSettingsState,
} from '@/app/services/settings';
import {
    loadWallpaperImageFromUrl,
    renderWallpaperCanvas,
    canvasToWallpaperDataUrl,
    type WallpaperEditorTransform,
} from '@/app/services/settings/wallpaperEditorRender';

type PatchAppearance = (partial: Partial<AppSettingsState['appearance']>) => void;

export type WallpaperEditorDraft = {
    file: File;
    previewUrl: string;
};

function validateWallpaperFile(file: File): string | null {
    const mime = String(file.type || '').toLowerCase();
    const name = String(file.name || '').toLowerCase();
    const looksLikeImage =
        mime.startsWith('image/') ||
        /\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i.test(name);
    if (!looksLikeImage) return 'يرجى اختيار ملف صورة (JPG / PNG / WebP)';
    if (file.size > 8_000_000) return 'الصورة كبيرة جداً — الحد 8 ميغابايت';
    return null;
}

export function useAppearanceWallpaperControls(
    appearance: AppSettingsState['appearance'],
    patchAppearance: PatchAppearance,
) {
    const wallpaperRef = useRef<HTMLInputElement>(null);
    const [wallpaperPreview, setWallpaperPreview] = useState<string | undefined>();
    const [editorDraft, setEditorDraft] = useState<WallpaperEditorDraft | null>(null);
    const [editorBusy, setEditorBusy] = useState(false);

    const persistedWallpaperSrc = resolveWallpaperSrc(appearance);
    const wallpaperSrc = wallpaperPreview ?? persistedWallpaperSrc;
    const hasWallpaper = !!wallpaperSrc;

    useEffect(() => {
        if (!wallpaperPreview || !persistedWallpaperSrc) return;
        if (wallpaperPreview === persistedWallpaperSrc) {
            setWallpaperPreview(undefined);
        }
    }, [wallpaperPreview, persistedWallpaperSrc, appearance.wallpaperStamp]);

    useEffect(() => {
        return () => {
            if (editorDraft?.previewUrl) URL.revokeObjectURL(editorDraft.previewUrl);
        };
    }, [editorDraft?.previewUrl]);

    const clearWallpaperPreview = () => setWallpaperPreview(undefined);

    const applyLiveWallpaper = async (src: string) => {
        await applyWallpaperSurfaceVarsWhenReady(true, appearance.theme, src);
    };

    const beginWallpaperEdit = useCallback((file: File): boolean => {
        const error = validateWallpaperFile(file);
        if (error) {
            SmartToast.error(error);
            return false;
        }
        setEditorDraft((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
            return {
                file,
                previewUrl: URL.createObjectURL(file),
            };
        });
        return true;
    }, []);

    const cancelWallpaperEdit = useCallback(() => {
        setEditorDraft((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
            return null;
        });
    }, []);

    const applyWallpaperEdit = useCallback(
        async (transform: WallpaperEditorTransform): Promise<boolean> => {
            if (!editorDraft) return false;
            setEditorBusy(true);
            try {
                const img = await loadWallpaperImageFromUrl(editorDraft.previewUrl);
                const canvas = renderWallpaperCanvas(img, transform);
                const dataUrl = canvasToWallpaperDataUrl(canvas);
                await applyLiveWallpaper(dataUrl);
                if (!persistWallpaper(dataUrl)) {
                    SmartToast.error('تعذر حفظ الصورة — مساحة التخزين ممتلئة');
                    return false;
                }
                setWallpaperPreview(dataUrl);
                patchAppearance({ wallpaper: undefined, wallpaperStamp: Date.now() });
                setEditorDraft((prev) => {
                    if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
                    return null;
                });
                SmartToast.success('تم تطبيق خلفية اللوحة');
                return true;
            } catch {
                SmartToast.error('تعذر تطبيق الخلفية — جرّب صورة أصغر');
                return false;
            } finally {
                setEditorBusy(false);
            }
        },
        [appearance.theme, editorDraft, patchAppearance],
    );

    const removeWallpaper = (): boolean => {
        cancelWallpaperEdit();
        setWallpaperPreview(undefined);
        const cleared = persistWallpaper(undefined);
        if (!cleared) {
            SmartToast.error('تعذر إزالة الخلفية من التخزين');
            return false;
        }
        void applyWallpaperSurfaceVarsWhenReady(false, appearance.theme);
        patchAppearance({ wallpaper: undefined, wallpaperStamp: Date.now() });
        SmartToast.info('تمت إزالة الخلفية');
        return true;
    };

    return {
        wallpaperRef,
        wallpaperSrc,
        hasWallpaper,
        clearWallpaperPreview,
        beginWallpaperEdit,
        cancelWallpaperEdit,
        applyWallpaperEdit,
        editorDraft,
        editorBusy,
        removeWallpaper,
    };
}
