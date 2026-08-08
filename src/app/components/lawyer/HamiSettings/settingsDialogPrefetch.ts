let dialogChunkPrefetch: Promise<unknown> | null = null;

/** يحمّل حاوية SmartDialog مسبقاً — حوارات الأمان/البيانات/الحساب */
export function prefetchSettingsDialogs(): void {
    if (!dialogChunkPrefetch) {
        dialogChunkPrefetch = import('@/app/components/ui/SmartDialogContainer');
    }
}

/** ينتظر جاهزية المستمع قبل SmartDialog.confirm — يمنع تعليق المفاتيح */
export async function ensureSettingsDialogsReady(): Promise<void> {
    prefetchSettingsDialogs();
    try {
        await dialogChunkPrefetch;
    } catch {
        /* ignore */
    }
}
