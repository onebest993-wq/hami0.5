import { SmartToast } from '@/app/components/ui/SmartToast';

export function openForumAddQuestionGuard(
    currentUserId: string | null,
    onOpen: () => void,
    options?: { isBanned?: boolean },
): void {
    if (!currentUserId) {
        SmartToast.warning('سجّل الدخول أولاً');
        return;
    }
    if (options?.isBanned) {
        SmartToast.warning('حسابك محظور من النشر في المنتدى');
        return;
    }
    onOpen();
}
