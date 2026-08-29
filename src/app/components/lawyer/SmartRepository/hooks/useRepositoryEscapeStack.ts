import { useEffect } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import {
    dismissAllRepositoryChrome,
    dismissTopRepositoryChrome,
} from './repositoryChromeDismiss';
import { consumeVoiceRecorderEscape } from '@/app/components/lawyer/ActionModals/voiceRecorderEscapeBridge';

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
    onCloseVoice?: () => void;
    onCloseFileViewer?: () => void;
    onCloseEditDoc?: () => void;
    onCancelPendingUpload?: () => void;
    onCloseModal: () => void;
};

/** Escape/Cap متدرّج: مسجّل → رفع → معاينة → تعديل → ماسح → كروم (قوائم) → إنشاء بطاقة → إغلاق المستودع */
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
    onCloseVoice,
    onCloseFileViewer,
    onCloseEditDoc,
    onCancelPendingUpload,
    onCloseModal,
}: UseRepositoryEscapeStackParams) {
    useEffect(() => {
        if (!enabled) {
            dismissAllRepositoryChrome();
            return;
        }

        const consumeBackStack = (): boolean => {
            if (showVoiceRecorder) {
                if (!consumeVoiceRecorderEscape()) onCloseVoice?.();
                return true;
            }
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
            if (dismissTopRepositoryChrome()) return true;
            if (composing) {
                onResetComposer();
                return true;
            }
            dismissAllRepositoryChrome();
            onCloseModal();
            return true;
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;

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
        onCloseVoice,
        onResetComposer,
        pendingUploadOpen,
        pendingUploadSaving,
        scannerOpen,
        showVoiceRecorder,
    ]);
}
