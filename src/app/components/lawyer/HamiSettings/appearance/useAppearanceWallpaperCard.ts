import { useCallback, useEffect, useId, useState, type ChangeEvent } from 'react';
import type { WallpaperEditorTransform } from '@/app/services/settings/wallpaperEditorRender';
import type { AppearanceSectionViewModel } from './useAppearanceSection';

/** معرّف ثابت بلا ":" — بعض المتصفحات تكسر htmlFor/label مع useId الافتراضي */
function useWallpaperInputDomId(): string {
    const reactId = useId().replace(/:/g, '');
    return `hami-wallpaper-file-${reactId}`;
}

export function useAppearanceWallpaperCard(vm: AppearanceSectionViewModel) {
    const inputId = useWallpaperInputDomId();
    const [status, setStatus] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!status) return;
        const t = window.setTimeout(() => setStatus(null), 5_000);
        return () => window.clearTimeout(t);
    }, [status]);

    const onFileChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) {
                setStatus('لم يُختر ملف');
                return;
            }
            const ok = vm.beginWallpaperEdit(file);
            setStatus(ok ? 'اضبط مكان الصورة ثم اضغط تطبيق' : null);
        },
        [vm],
    );

    const onRemove = useCallback(() => {
        setBusy(true);
        try {
            const ok = vm.removeWallpaper();
            setStatus(ok ? 'تمت إزالة الخلفية' : 'تعذر إزالة الخلفية');
        } finally {
            setBusy(false);
        }
    }, [vm]);

    const onApplyEdit = useCallback(
        (transform: WallpaperEditorTransform) => {
            setBusy(true);
            void vm.applyWallpaperEdit(transform).then((ok) => {
                setStatus(ok ? 'تم تطبيق الخلفية على اللوحة' : 'تعذر تطبيق الخلفية');
                setBusy(false);
            });
        },
        [vm],
    );

    const onCancelEdit = useCallback(() => {
        vm.cancelWallpaperEdit();
        setStatus(null);
    }, [vm]);

    const actionLabel = vm.editorDraft
        ? 'تغيير الصورة'
        : busy
          ? 'جاري التطبيق…'
          : vm.wallpaperSrc
            ? 'تغيير الخلفية'
            : 'رفع صورة خلفية';

    return {
        inputId,
        status,
        busy,
        actionLabel,
        onFileChange,
        onRemove,
        onApplyEdit,
        onCancelEdit,
    };
}
