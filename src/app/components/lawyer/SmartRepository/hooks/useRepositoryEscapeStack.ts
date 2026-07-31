import { useEffect } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';

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

/** Escape/Cap متدرّج: مسجّل → رفع ملف → معاينة → تعديل → ماسح → إنشاء بطاقة → إغلاق المستودع */
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

        const consumeBackStack = (): boolean => {
            if (showVoiceRecorder) return true;
            if (pendingUploadOpen && !pendingUploadSaving) {
                onCancelPendingUpload?.();
                return true;
            }
            if (fileViewerOpen) {
                onCloseFileViewer?.();
                return true;
            }
            if (editDocOpen) {
                onCloseEditDoc?.();
                return true;
            }
            if (scannerOpen) {
                onCloseScanner();
                return true;
            }
            if (composing) {
                onResetComposer();
                return true;
            }
            onCloseModal();
            return true;
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (showVoiceRecorder) return;

            e.preventDefault();
            e.stopPropagation();
            consumeBackStack();
        };

        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(() => consumeBackStack());
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
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
