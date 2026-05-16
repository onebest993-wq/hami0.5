import { useState, useCallback, useRef, useEffect } from 'react';

export interface ToastAction {
    label: string;
    onClick: () => void;
}

export function useToastSystem(
    executionDataId: string | number | null | undefined,
    executionId: string | undefined,
    onDecisionsLinkRequest?: (decisionId?: string, tab?: 'current' | 'previous' | 'appeals') => void,
) {
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState<React.ReactNode>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
    const [toastEpoch, setToastEpoch] = useState(0);
    const [toastAction, setToastAction] = useState<ToastAction | null>(null);
    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToastRef = useRef<
        (
            message: string,
            type?: 'success' | 'error' | 'warning' | 'info',
            options?: {
                decisionsLink?: boolean;
                decisionId?: string;
                decisionsTab?: 'current' | 'previous' | 'appeals';
                action?: { label: string; onClick: () => void };
            }
        ) => void
    >(() => {});

    const hideToast = useCallback(() => {
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }
        setToastAction(null);
        setToastVisible(false);
    }, []);

    const showToast = useCallback(
        (
            message: string,
            type: 'success' | 'error' | 'warning' | 'info' = 'success',
            options?: {
                decisionsLink?: boolean;
                decisionId?: string;
                decisionsTab?: 'current' | 'previous' | 'appeals';
                action?: { label: string; onClick: () => void };
            }
        ) => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
                toastTimeoutRef.current = null;
            }

            const myId = String(executionDataId ?? executionId ?? '').trim();

            const action =
                options?.action ??
                (options?.decisionsLink === true
                    ? {
                          label: 'الذهاب إلى القرارات والطعون',
                          onClick: () => {
                              if (onDecisionsLinkRequest) {
                                  onDecisionsLinkRequest(options?.decisionId, options?.decisionsTab);
                              }
                              hideToast();
                          },
                      }
                    : null);

            setToastAction(action);
            setToastMessage(message);
            setToastType(type);
            setToastEpoch((v) => v + 1);
            setToastVisible(true);
            const ms = action ? 12000 : 3000;
            toastTimeoutRef.current = setTimeout(() => {
                hideToast();
            }, ms);
        },
        [hideToast, executionDataId, executionId, onDecisionsLinkRequest],
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
        toastAction,
        showToast,
        hideToast,
        showToastRef,
    };
}
