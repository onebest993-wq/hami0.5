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

import { validateWallpaperFile } from './wallpaperFileValidate';
import { settingsFlowAbandoned, useSettingsSectionActiveRef } from '../settingsFlowGuard';

type PatchAppearance = (partial: Partial<AppSettingsState['appearance']>) => void;

type WallpaperEditorDraft = {
    file: File;
    previewUrl: string;
};

export function wallpaperCommitAfterLiveApply(
    applyGeneration: number,
    currentGeneration: number,
): 'persist' | 'revert' {
    return currentGeneration !== applyGeneration ? 'revert' : 'persist';
}

export function useAppearanceWallpaperControls(
    appearance: AppSettingsState['appearance'],
    patchAppearance: PatchAppearance,
) {
    const { sectionActive, sectionActiveRef } = useSettingsSectionActiveRef();
    const applyGenerationRef = useRef(0);
    const applyInFlightRef = useRef(false);
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
        applyGenerationRef.current += 1;
        setEditorDraft((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
            return null;
        });
    }, []);

    useEffect(() => {
        if (sectionActive) return;
        applyGenerationRef.current += 1;
        setEditorDraft((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
            return null;
        });
    }, [sectionActive]);

    const applyWallpaperEdit = useCallback(
        async (transform: WallpaperEditorTransform): Promise<boolean> => {
            if (!editorDraft || applyInFlightRef.current) return false;
            applyInFlightRef.current = true;
            const generation = ++applyGenerationRef.current;
            setEditorBusy(true);
            try {
                const img = await loadWallpaperImageFromUrl(editorDraft.previewUrl);
                if (
                    applyGenerationRef.current !== generation ||
                    settingsFlowAbandoned(sectionActiveRef)
                ) {
                    return false;
                }
                const canvas = renderWallpaperCanvas(img, transform);
                const dataUrl = await canvasToWallpaperDataUrl(canvas);
                if (
                    applyGenerationRef.current !== generation ||
                    settingsFlowAbandoned(sectionActiveRef)
                ) {
                    return false;
                }
                await applyLiveWallpaper(dataUrl);
                if (wallpaperCommitAfterLiveApply(generation, applyGenerationRef.current) === 'revert') {
                    const prev = resolveWallpaperSrc(appearance);
                    if (prev) {
                        void applyWallpaperSurfaceVarsWhenReady(true, appearance.theme, prev);
                    } else {
                        void applyWallpaperSurfaceVarsWhenReady(false, appearance.theme);
                    }
                    return false;
                }
                if (!persistWallpaper(dataUrl)) {
                    if (!settingsFlowAbandoned(sectionActiveRef)) {
                        SmartToast.error('تعذر حفظ الصورة — مساحة التخزين ممتلئة');
                    }
                    return false;
                }
                setWallpaperPreview(dataUrl);
                patchAppearance({ wallpaper: undefined, wallpaperStamp: Date.now() });
                setEditorDraft((prev) => {
                    if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
                    return null;
                });
                if (!settingsFlowAbandoned(sectionActiveRef)) {
                    SmartToast.success('تم تطبيق خلفية اللوحة');
                }
                return true;
            } catch {
                if (
                    applyGenerationRef.current !== generation ||
                    settingsFlowAbandoned(sectionActiveRef)
                ) {
                    return false;
                }
                SmartToast.error('تعذر تطبيق الخلفية — جرّب صورة أصغر');
                return false;
            } finally {
                applyInFlightRef.current = false;
                setEditorBusy(false);
            }
        },
        [appearance, editorDraft, patchAppearance],
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
