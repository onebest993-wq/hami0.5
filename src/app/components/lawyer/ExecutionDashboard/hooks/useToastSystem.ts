import { useState, useCallback, useRef, useEffect } from 'react';

export function useToastSystem(
    executionDataId: string | number | null | undefined,
    executionId: string | undefined,
) {
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState<React.ReactNode>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
    const [toastEpoch, setToastEpoch] = useState(0);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToastRef = useRef<
        (
            message: string,
            type?: 'success' | 'error' | 'warning' | 'info',
            _legacyOptions?: unknown
        ) => void
    >(() => {});

    const hideToast = useCallback(() => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }
        setToastVisible(false);
    }, []);

    const showToast = useCallback(
        (
            message: string,
            type: 'success' | 'error' | 'warning' | 'info' = 'success',
            _legacyOptions?: unknown
        ) => {
            void _legacyOptions;
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
                toastTimeoutRef.current = null;
            }

            setToastMessage(message);
            setToastType(type);
            setToastEpoch((v) => v + 1);
            setToastVisible(true);
            toastTimeoutRef.current = setTimeout(() => {
                hideToast();
            }, 3000);
        },
        [hideToast, executionDataId, executionId],
    );

    showToastRef.current = showToast;

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
                toastTimeoutRef.current = null;
            }
        };
    }, []);

    return {
        toastVisible,
        toastMessage,
        toastType,
        toastEpoch,
        showToast,
        hideToast,
        showToastRef,
    };
}
