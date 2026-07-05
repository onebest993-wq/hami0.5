import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { DialogPortal } from '@/app/components/ui/dialog';
import { cn } from '@/app/components/ui/utils';
import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';
import { TX_HUB_DIALOG_Z } from './transactionsHubOverlayZ';

function getTransactionsThreadPortalRoot(): HTMLElement {
    return getHamiOverlayPortalRoot({
        id: 'hami-transactions-thread-modal-root',
        zIndex: TX_HUB_DIALOG_Z,
    });
}

export type TransactionsThreadDialogContentProps = React.ComponentPropsWithoutRef<
    typeof DialogPrimitive.Content
> & {
    instant?: boolean;
    hideCloseButton?: boolean;
};

/** حوار مهام المعاملات فوق الـ hub (z-200) والأوراق (z-210) — بدون overlay عالق */
export function TransactionsThreadDialogContent({
    className,
    children,
    instant = false,
    hideCloseButton = false,
    onOpenAutoFocus,
    ...props
}: TransactionsThreadDialogContentProps) {
    return (
        <DialogPortal container={getTransactionsThreadPortalRoot()}>
            <DialogPrimitive.Overlay
                className={cn(
                    'fixed inset-0 z-[230] bg-black/50',
                    'data-[state=open]:pointer-events-auto data-[state=closed]:pointer-events-none',
                    instant
                        ? 'data-[state=open]:animate-none data-[state=closed]:animate-none'
                        : 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                )}
            />
            <DialogPrimitive.Content
                data-slot="dialog-content"
                className={cn(
                    'pointer-events-auto fixed top-1/2 left-1/2 z-[231] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg',
                    'data-[state=closed]:pointer-events-none',
                    instant
                        ? 'duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none'
                        : 'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                    className,
                )}
                onOpenAutoFocus={(event) => {
                    onOpenAutoFocus?.(event);
                    event.preventDefault();
                }}
                {...props}
            >
                {children}
                {hideCloseButton ? null : (
                    <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                        <XIcon />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>
                )}
            </DialogPrimitive.Content>
        </DialogPortal>
    );
}
