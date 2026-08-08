import React, { useEffect } from 'react';

import { GlobalSearchOverlayLoadingBridge } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayLoadingBridge';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';

type GlobalSearchInstantShellProps = {
    onClose?: () => void;
    /** أثناء keepAlive مغلق — لا تُرسم الطبقة */
    open?: boolean;
    userId?: string | null;
};

/** @deprecated — يفوّض إلى LoadingBridge (نفس StaticShell) */
export function GlobalSearchInstantShell({
    onClose,
    open = true,
    userId = null,
}: GlobalSearchInstantShellProps): React.ReactElement | null {
    const close = onClose ?? (() => undefined);

    useEffect(() => {
        if (!open || !onClose) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose, open]);

    useEffect(() => {
        if (!open || !onClose) return;
        return registerNativeBackHandler(() => {
            onClose();
            return true;
        });
    }, [onClose, open]);

    if (!open) return null;

    return <GlobalSearchOverlayLoadingBridge open={open} onClose={close} userId={userId} />;
}
