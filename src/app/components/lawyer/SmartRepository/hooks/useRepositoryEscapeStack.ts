import { useEffect } from 'react';

type UseRepositoryEscapeStackParams = {
    enabled: boolean;
    composing: boolean;
    scannerOpen: boolean;
    showVoiceRecorder: boolean;
    onResetComposer: () => void;
    onCloseScanner: () => void;
    onCloseModal: () => void;
};

/** Escape متدرّج: مسجّل (داخلي) → ماسح → إنشاء بطاقة → إغلاق المستودع */
export function useRepositoryEscapeStack({
    enabled,
    composing,
    scannerOpen,
    showVoiceRecorder,
    onResetComposer,
    onCloseScanner,
    onCloseModal,
}: UseRepositoryEscapeStackParams) {
    useEffect(() => {
        if (!enabled) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (showVoiceRecorder) return;

            e.preventDefault();
            e.stopPropagation();

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
    }, [composing, enabled, onCloseModal, onCloseScanner, onResetComposer, scannerOpen, showVoiceRecorder]);
}
