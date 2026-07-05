import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import { DialogPortal } from '@/app/components/ui/dialog';
import { cn } from '@/app/components/ui/utils';
import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';

const TASKS_MODAL_PORTAL_Z = 240;

function getTasksModalPortalRoot(): HTMLElement {
    return getHamiOverlayPortalRoot({ id: 'hami-tasks-modal-root', zIndex: TASKS_MODAL_PORTAL_Z });
}

export type TasksManagerDialogContentProps = React.ComponentPropsWithoutRef<
    typeof DialogPrimitive.Content
> & {
    instant?: boolean;
    hideCloseButton?: boolean;
};

/** حوار فوق أجندة المهام (z-230) — بدون تعارض focus trap */
export function TasksManagerDialogContent({
    className,
    children,
    instant = false,
    hideCloseButton = false,
    onOpenAutoFocus,
    ...props
}: TasksManagerDialogContentProps) {
    return (
        <DialogPortal container={getTasksModalPortalRoot()}>
            <DialogPrimitive.Overlay
                className={cn(
                    'pointer-events-auto fixed inset-0 z-[240] bg-black/70',
                    instant
                        ? 'data-[state=open]:animate-none data-[state=closed]:animate-none'
                        : 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                )}
            />
            <DialogPrimitive.Content
                data-slot="dialog-content"
                className={cn(
                    'pointer-events-auto fixed top-1/2 left-1/2 z-[241] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg',
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
