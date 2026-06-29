import { useEffect } from 'react';

type UseLawyerExecutionOverlayEscapeParams = {
    archiveOpen: boolean;
    executionFileOpen: boolean;
    executionCreateOpen?: boolean;
    onCloseArchive: () => void;
    onCloseExecutionFile: () => void;
    onCloseExecutionCreate?: () => void;
};

/** Escape يغلق أرشيف التنفيذ أو نموذج الإنشاء أو الإضبارة المفتوحة (الأعلى أولاً) */
export function useLawyerExecutionOverlayEscape({
    archiveOpen,
    executionFileOpen,
    executionCreateOpen = false,
    onCloseArchive,
    onCloseExecutionFile,
    onCloseExecutionCreate,
}: UseLawyerExecutionOverlayEscapeParams): void {
    useEffect(() => {
        if (!archiveOpen && !executionFileOpen && !executionCreateOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            if (executionFileOpen) {
                onCloseExecutionFile();
                return;
            }
            if (executionCreateOpen) {
                onCloseExecutionCreate?.();
                return;
            }
            if (archiveOpen) {
                onCloseArchive();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        archiveOpen,
        executionFileOpen,
        executionCreateOpen,
        onCloseArchive,
        onCloseExecutionFile,
        onCloseExecutionCreate,
    ]);
}
