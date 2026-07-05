import { useEffect } from 'react';

type UseRepositoryEscapeStackParams = {
    enabled: boolean;
    composing: boolean;
    scannerOpen: boolean;
    showVoiceRecorder: boolean;
    fileViewerOpen?: boolean;
    editDocOpen?: boolean;
    pendingUploadOpen?: boolean;
    pendingUploadSaving?: boolean;
    onResetComposer: () => void;
    onCloseScanner: () => void;
    onCloseFileViewer?: () => void;
    onCloseEditDoc?: () => void;
    onCancelPendingUpload?: () => void;
    onCloseModal: () => void;
};

/** Escape متدرّج: مسجّل → رفع ملف → معاينة → تعديل → ماسح → إنشاء بطاقة → إغلاق المستودع */
export function useRepositoryEscapeStack({
    enabled,
    composing,
    scannerOpen,
    showVoiceRecorder,
    fileViewerOpen = false,
    editDocOpen = false,
    pendingUploadOpen = false,
    pendingUploadSaving = false,
    onResetComposer,
    onCloseScanner,
    onCloseFileViewer,
    onCloseEditDoc,
    onCancelPendingUpload,
    onCloseModal,
}: UseRepositoryEscapeStackParams) {
    useEffect(() => {
        if (!enabled) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (showVoiceRecorder) return;

            e.preventDefault();
            e.stopPropagation();

            if (pendingUploadOpen && !pendingUploadSaving) {
                onCancelPendingUpload?.();
                return;
            }
            if (fileViewerOpen) {
                onCloseFileViewer?.();
                return;
            }
            if (editDocOpen) {
                onCloseEditDoc?.();
                return;
            }
            if (scannerOpen) {
                onCloseScanner();
                return;
            }
            if (composing) {
                onResetComposer();
                return;
            }
            onCloseModal();
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [
        composing,
        editDocOpen,
        enabled,
        fileViewerOpen,
        onCancelPendingUpload,
        onCloseEditDoc,
        onCloseFileViewer,
        onCloseModal,
        onCloseScanner,
        onResetComposer,
        pendingUploadOpen,
        pendingUploadSaving,
        scannerOpen,
        showVoiceRecorder,
    ]);
}
