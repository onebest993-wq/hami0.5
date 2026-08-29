import React from 'react';
import { createPortal } from 'react-dom';

function useAnchoredRect(open: boolean, anchorRef: React.RefObject<HTMLElement | null>) {
    const [rect, setRect] = React.useState<DOMRect | null>(null);

    const update = React.useCallback(() => {
        if (!anchorRef.current) return;
        setRect(anchorRef.current.getBoundingClientRect());
    }, [anchorRef]);

    React.useLayoutEffect(() => {
        if (!open) {
            setRect(null);
            return;
        }
        update();
        const onScrollOrResize = () => update();
        window.addEventListener('resize', onScrollOrResize);
        window.addEventListener('scroll', onScrollOrResize, true);
        return () => {
            window.removeEventListener('resize', onScrollOrResize);
            window.removeEventListener('scroll', onScrollOrResize, true);
        };
    }, [open, update]);

    return rect;
}

type GuarantorAnchoredPopoverProps = {
    open: boolean;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
    children: React.ReactNode;
    /** تقدير ارتفاع القائمة لاختيار الفتح للأعلى */
    estimatedHeight?: number;
    minWidth?: number;
    zIndex?: number;
};

export const GuarantorAnchoredPopover: React.FC<GuarantorAnchoredPopoverProps> = ({
    open,
    onClose,
    anchorRef,
    children,
    estimatedHeight = 160,
    minWidth = 208,
    zIndex = 200,
}) => {
    const rect = useAnchoredRect(open, anchorRef);

    if (!open || !rect || typeof document === 'undefined') return null;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedHeight + 12;
    const top = openUp ? Math.max(8, rect.top - estimatedHeight - 6) : rect.bottom + 6;
    const width = Math.max(minWidth, rect.width);
    const right = Math.max(8, window.innerWidth - rect.right);
    const left = Math.max(8, rect.left);
    const useRight = rect.width < minWidth ? right : undefined;

    return createPortal(
        <>
            <div className="fixed inset-0" style={{ zIndex: zIndex - 1 }} role="presentation" onClick={onClose} />
            <div
                className="fixed overflow-hidden rounded-xl border border-white/10 bg-[#0A0F1C]/98 shadow-lg"
                style={{
                    zIndex,
                    top,
                    ...(useRight != null ? { right: useRight, width } : { left, width: Math.min(width, window.innerWidth - left - 8) }),
                }}
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </>,
        document.body
    );
};
