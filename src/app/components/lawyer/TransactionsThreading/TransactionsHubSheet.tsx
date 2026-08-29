import { memo, useEffect, type CSSProperties, type ReactNode } from 'react';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { TX_DRAWER_SHELL } from './transactionsGlassTheme';

export const TransactionsHubSheet = memo(function TransactionsHubSheet({
    open,
    onOpenChange,
    children,
    testId,
    keepMounted = false,
    ariaLabel,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
    testId?: string;
    /** يُبقي DOM جاهزاً داخل الـ hub لتفادي تأخير أول فتح */
    keepMounted?: boolean;
    ariaLabel?: string;
}) {
    const keyboardInsetPx = useMobileKeyboardInset(open);
    const mounted = keepMounted || open;

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            onOpenChange(false);
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [onOpenChange, open]);

    if (!mounted) return null;

    const backdropMotion = '!transition-none';
    const panelMotion = '!transition-none';

    const panelStyle: CSSProperties | undefined =
        keyboardInsetPx > 0
            ? {
                  marginBottom: keyboardInsetPx,
                  maxHeight: `min(92dvh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - ${keyboardInsetPx}px))`,
              }
            : undefined;

    return (
        <div
            className={`fixed inset-0 z-[210] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
            aria-hidden={!open}
        >
            <button
                type="button"
                tabIndex={open ? 0 : -1}
                aria-label="إغلاق"
                className={`absolute inset-0 bg-black/50 ${backdropMotion} ${open ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => onOpenChange(false)}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                data-testid={testId}
                data-state={open ? 'open' : 'closed'}
                data-keyboard-inset={keyboardInsetPx > 0 ? String(keyboardInsetPx) : undefined}
                style={panelStyle}
                className={`absolute inset-x-0 bottom-0 mx-auto max-w-[100vw] ${TX_DRAWER_SHELL} ${panelMotion} ${
                    open ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {children}
            </div>
        </div>
    );
});
