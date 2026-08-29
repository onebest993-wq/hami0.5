import React, { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import {
    GLOBAL_SEARCH_BACKDROP_CLASS,
    GLOBAL_SEARCH_DIALOG_CHROME_CLASS,
    GLOBAL_SEARCH_LAYER_CLASS,
} from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayChromeClasses';
import '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlay.css';
import {
    resolveGlobalSearchSheetKeyboardStyle,
} from '@/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayLayout';
import { useOverlayCloseArm } from '@/app/hooks/useOverlayCloseArm';
import { clearGlobalSearchLayerImperativeStyles } from '@/app/runtime/globalSearchInstantPaint';
import { inertProps } from '@/app/utils/inertProps';

export type GlobalSearchOverlayLayerFrameProps = {
    open: boolean;
    keepWarm?: boolean;
    keyboardInset?: number;
    onClose: () => void;
    overlayRef?: RefObject<HTMLDivElement | null>;
    onKeyDownCapture?: (event: KeyboardEvent<HTMLDivElement>) => void;
    isEnrichingIndex?: boolean;
    children: ReactNode;
    paint?: boolean;
    coverTestId?: string;
    armBackdropClose?: boolean;
};

export function GlobalSearchOverlayLayerFrame({
    open,
    keepWarm = false,
    keyboardInset = 0,
    onClose,
    overlayRef,
    onKeyDownCapture,
    isEnrichingIndex,
    children,
    paint = false,
    coverTestId,
    armBackdropClose = true,
}: GlobalSearchOverlayLayerFrameProps) {
    const layerRef = useRef<HTMLDivElement | null>(null);
    const { requestClose } = useOverlayCloseArm(open);
    const keyboardOpen = keyboardInset > 0;
    const hidden = !open;

    useLayoutEffect(() => {
        const el = layerRef.current;
        if (!el) return;
        clearGlobalSearchLayerImperativeStyles(el);
        if (open) {
            el.setAttribute('data-search-open', 'true');
            el.removeAttribute('aria-hidden');
            el.removeAttribute('inert');
        } else if (keepWarm) {
            el.setAttribute('data-search-open', 'false');
            el.setAttribute('aria-hidden', 'true');
            el.setAttribute('inert', '');
        }
    }, [open, keepWarm]);

    if (!open && !keepWarm) return null;

    return (
        <div
            ref={layerRef}
            className={GLOBAL_SEARCH_LAYER_CLASS}
            role="presentation"
            aria-hidden={hidden || undefined}
            data-search-warm={keepWarm ? 'true' : undefined}
            data-search-open={open ? 'true' : 'false'}
            data-gs-paint={paint ? 'true' : undefined}
            data-testid={coverTestId}
            data-keyboard-inset={keyboardOpen ? String(keyboardInset) : undefined}
            {...inertProps(hidden)}
        >
            <button
                type="button"
                aria-label="إغلاق البحث"
                tabIndex={hidden ? -1 : 0}
                className={GLOBAL_SEARCH_BACKDROP_CLASS}
                style={{ pointerEvents: hidden ? 'none' : 'auto' }}
                onClick={() => {
                    if (armBackdropClose) requestClose(onClose);
                    else onClose();
                }}
            />

            <div
                role={open ? 'dialog' : undefined}
                aria-label="بحث شامل"
                aria-modal={open ? true : undefined}
                aria-hidden={hidden || undefined}
                aria-busy={isEnrichingIndex || undefined}
                data-testid="global-search-overlay"
                data-keyboard-open={keyboardOpen ? 'true' : 'false'}
                ref={overlayRef}
                onKeyDownCapture={onKeyDownCapture}
                className={GLOBAL_SEARCH_DIALOG_CHROME_CLASS}
                style={resolveGlobalSearchSheetKeyboardStyle(keyboardInset)}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}
