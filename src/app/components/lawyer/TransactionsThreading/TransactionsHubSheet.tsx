import { memo, useEffect, type ReactNode } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { TX_DRAWER_SHELL } from './transactionsGlassTheme';

export const TransactionsHubSheet = memo(function TransactionsHubSheet({
    open,
    onOpenChange,
    children,
    testId,
    keepMounted = false,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
    testId?: string;
    /** يُبقي DOM جاهزاً داخل الـ hub لتفادي تأخير أول فتح */
    keepMounted?: boolean;
}) {
    const reduceMotion = useReduceMotion();
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

    const backdropMotion = reduceMotion ? '!transition-none' : 'transition-opacity duration-75 ease-out';
    const panelMotion = reduceMotion ? '!transition-none' : 'transition-opacity duration-75 ease-out';

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
                data-testid={testId}
                data-state={open ? 'open' : 'closed'}
                className={`absolute inset-x-0 bottom-0 mx-auto max-w-[100vw] ${TX_DRAWER_SHELL} ${panelMotion} ${
                    open ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {children}
            </div>
        </div>
    );
});
