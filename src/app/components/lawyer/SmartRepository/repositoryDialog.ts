import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';

const CONFIRM_TIMEOUT_MS = 15_000;
const ROOM_DELETE_DELAY_MS = 10_000;
const ROOM_DELETE_DIALOG_TIMEOUT_MS = 60_000;

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

/** حذف غرفة: رسالة تأكيد + انتظار 10 ثوانٍ قبل تفعيل زر الحذف */
export async function confirmRepositoryRoomDelete(
    roomTitle: string,
    itemCount: number,
): Promise<boolean> {
    prefetchRepositoryDialogs();
    const lines = [
        `هل تريد حذف غرفة «${roomTitle}»؟`,
        itemCount > 0
            ? `سيتم إرجاع ${itemCount} عنصراً إلى المستودع العام.`
            : 'الغرفة فارغة حالياً.',
        'هذا إجراء لا يمكن التراجع عنه بسهولة.',
        'انتظر 10 ثوانٍ ثم اضغط «حذف الغرفة».',
    ];
    try {
        const ok = await Promise.race([
            SmartDialog.confirm(lines.join('\n'), {
                title: 'تأكيد حذف الغرفة',
                confirmText: 'حذف الغرفة',
                cancelText: 'إلغاء',
                confirmDelayMs: ROOM_DELETE_DELAY_MS,
            }),
            new Promise<false>((resolve) => {
                window.setTimeout(() => resolve(false), ROOM_DELETE_DIALOG_TIMEOUT_MS);
            }),
        ]);
        return Boolean(ok);
    } catch {
        SmartToast.error('تعذر فتح نافذة التأكيد');
        return false;
    }
}
