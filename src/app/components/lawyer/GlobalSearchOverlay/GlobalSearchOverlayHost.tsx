import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { GlobalSearchOverlayProps } from '@/app/components/lawyer/GlobalSearchOverlay/types';
import { GlobalSearchOverlay } from '@/app/components/lawyer/GlobalSearchOverlay/index';
import { GlobalSearchOverlayStaticShell } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayStaticShell';
import { useGlobalSearchBridgeShellContent } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchBridgeShellContent';
import { useGlobalSearchFocusArm } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchFocusArm';
import {
    blurActiveGlobalSearchField,
    useGlobalSearchOverlayDismiss,
} from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayDismiss';
import type { GlobalSearchOverlayShellContentProps } from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayShellTypes';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { hydrateGlobalSearchShellForInstantOpen } from '@/app/runtime/globalSearchBootHydrator';

export type GlobalSearchOverlayHostProps = GlobalSearchOverlayProps & {
    /** مركّب مخفياً — الشجرة دافئة؛ الفتح = إظهار فقط */
    keepAlive?: boolean;
};

/**
 * Host — الواجهة sync في نفس مقطع الشِل (مثل الإعدادات/الإشعارات).
 * StaticShell ثابت — لا swap جسر تحميل→واجهة.
 */
export function GlobalSearchOverlayHost({
    keepAlive = false,
    ...props
}: GlobalSearchOverlayHostProps): React.ReactElement | null {
    const { open = true, onClose, userId } = props;
    const dismissWithImeCollapse = useCallback(() => {
        blurActiveGlobalSearchField();
        onClose();
    }, [onClose]);
    useBodyScrollLock(open);
    useGlobalSearchOverlayDismiss(open, dismissWithImeCollapse);

    const overlayRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const focusArmed = useGlobalSearchFocusArm(open);
    const [logicContent, setLogicContent] = useState<GlobalSearchOverlayShellContentProps | null>(null);
    const bridgeContent = useGlobalSearchBridgeShellContent(userId, Boolean(open && !logicContent));

    useLayoutEffect(() => {
        /* keepAlive: أبقِ آخر محتوى منطقي — يمنع وميض bridge→logic عند إعادة الفتح */
        if (!open && !keepAlive) {
            setLogicContent(null);
        }
    }, [open, keepAlive]);

    useLayoutEffect(() => {
        if (!open) return;
        void hydrateGlobalSearchShellForInstantOpen(true);
    }, [open]);

    if (!open && !keepAlive) {
        return null;
    }

    const shellContent = logicContent ?? bridgeContent;

    return (
        <>
            <GlobalSearchOverlay
                {...props}
                onClose={dismissWithImeCollapse}
                keepWarm={keepAlive}
                headless
                focusArmed={focusArmed}
                shellOverlayRef={overlayRef}
                shellInputRef={inputRef}
                onShellContent={setLogicContent}
            />
            <GlobalSearchOverlayStaticShell
                open={open}
                keepWarm={keepAlive}
                onClose={dismissWithImeCollapse}
                overlayRef={overlayRef}
                inputRef={inputRef}
                focusArmed={focusArmed}
                {...shellContent}
            />
        </>
    );
}
