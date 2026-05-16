import { useCallback, useRef, useState } from 'react';

export function useOrderFileConfirm() {
    const confirmResolveRef = useRef<((ok: boolean) => void) | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; message: string }>({
        open: false,
        message: '',
    });

    const requestConfirm = useCallback((message: string) => {
        const msg = String(message || '').trim();
        setConfirmDialog({ open: true, message: msg });
        return new Promise<boolean>((resolve) => {
            confirmResolveRef.current = resolve;
        });
    }, []);

    const resolveConfirm = useCallback((ok: boolean) => {
        const resolve = confirmResolveRef.current;
        confirmResolveRef.current = null;
        resolve?.(ok);
        setConfirmDialog({ open: false, message: '' });
    }, []);

    return { confirmDialog, requestConfirm, resolveConfirm };
}
