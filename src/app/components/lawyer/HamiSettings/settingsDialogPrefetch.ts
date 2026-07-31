let dialogChunkPrefetch: Promise<unknown> | null = null;

/** يحمّل حاوية SmartDialog مسبقاً — حوارات الأمان/البيانات/الحساب */
export function prefetchSettingsDialogs(): void {
    if (!dialogChunkPrefetch) {
        dialogChunkPrefetch = import('@/app/components/ui/SmartDialogContainer');
    }
}
