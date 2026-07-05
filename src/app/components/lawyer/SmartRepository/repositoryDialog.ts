import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';

const CONFIRM_TIMEOUT_MS = 15_000;

let dialogChunkPrefetch: Promise<unknown> | null = null;

/** يحمّل حاوية الحوار مسبقاً عند فتح المستودع */
export function prefetchRepositoryDialogs(): void {
    if (!dialogChunkPrefetch) {
        dialogChunkPrefetch = import('@/app/components/ui/SmartDialogContainer');
    }
}

export async function confirmRepositoryAction(message: string): Promise<boolean> {
    prefetchRepositoryDialogs();
    try {
        const ok = await Promise.race([
            SmartDialog.confirm(message),
            new Promise<false>((resolve) => {
                window.setTimeout(() => resolve(false), CONFIRM_TIMEOUT_MS);
            }),
        ]);
        if (!ok) return false;
        return true;
    } catch {
        SmartToast.error('تعذر فتح نافذة التأكيد');
        return false;
    }
}
