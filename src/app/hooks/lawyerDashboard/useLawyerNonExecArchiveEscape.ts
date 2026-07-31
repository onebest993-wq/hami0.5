import { useEffect } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';

type UseLawyerNonExecArchiveEscapeParams = {
    archiveOpen: boolean;
    onCloseArchive: () => void;
};

/** Escape + زر الرجوع الأصلي يغلقان أرشيف غير التنفيذ / طلبات العملاء */
export function useLawyerNonExecArchiveEscape({
    archiveOpen,
    onCloseArchive,
}: UseLawyerNonExecArchiveEscapeParams): void {
    useEffect(() => {
        if (!archiveOpen) return;

        const close = (): boolean => {
            onCloseArchive();
            return true;
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (event.defaultPrevented) return;
            event.preventDefault();
            close();
        };

        window.addEventListener('keydown', onKeyDown);
        const unregisterNativeBack = registerNativeBackHandler(() => close());
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            unregisterNativeBack();
        };
    }, [archiveOpen, onCloseArchive]);
}
