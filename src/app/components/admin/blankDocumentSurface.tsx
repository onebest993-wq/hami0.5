import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    applyPlainDocumentSurface,
    clearPlainDocumentSurface,
} from '@/boot/plainDocumentPath';

const LAYER: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 2_147_483_000,
    width: '100%',
    height: '100%',
    minHeight: '100dvh',
    minWidth: '100vw',
    margin: 0,
    padding: 0,
    border: 0,
    background: '#ffffff',
    overflow: 'hidden',
    overscrollBehavior: 'none',
};

export function BlankDocumentLayer({
    children,
    lock = true,
}: {
    children?: React.ReactNode;
    lock?: boolean;
}) {
    useEffect(() => {
        if (!lock) return undefined;
        applyPlainDocumentSurface();
        return () => {
            clearPlainDocumentSurface();
        };
    }, [lock]);

    const node = (
        <div
            data-testid="doc-surface"
            style={LAYER}
            onPointerDown={(event) => {
                const host = event.currentTarget.querySelector('input');
                if (host instanceof HTMLInputElement && !host.disabled) host.focus();
            }}
        >
            {children}
        </div>
    );

    if (typeof document === 'undefined' || !document.body) {
        return node;
    }

    return createPortal(node, document.body);
}

BlankDocumentLayer.displayName = 'Root';
