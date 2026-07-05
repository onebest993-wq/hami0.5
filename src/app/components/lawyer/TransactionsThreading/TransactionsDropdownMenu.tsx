import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { cn } from '@/app/components/ui/utils';
import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';
import { TX_HUB_DROPDOWN_Z } from './transactionsHubOverlayZ';
import { TX_DROPDOWN_CONTENT, TX_DROPDOWN_INSTANT } from './transactionsGlassTheme';

export { runAfterTransactionsMenuClose } from './transactionsMenuClose';

function getTransactionsDropdownPortalRoot(): HTMLElement {
    return getHamiOverlayPortalRoot({
        id: 'hami-transactions-dropdown-root',
        zIndex: TX_HUB_DROPDOWN_Z,
    });
}

/** قائمة منسدلة داخل hub المعاملات — بدون modal trap وبدون تأخير حركة */
export function TransactionsDropdownMenu(props: React.ComponentProps<typeof DropdownMenu>) {
    return <DropdownMenu modal={false} {...props} />;
}

export function TransactionsDropdownMenuContent({
    className,
    sideOffset = 6,
    ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
    return (
        <DropdownMenuPrimitive.Portal container={getTransactionsDropdownPortalRoot()}>
            <DropdownMenuPrimitive.Content
                data-slot="dropdown-menu-content"
                sideOffset={sideOffset}
                className={cn(TX_DROPDOWN_CONTENT, TX_DROPDOWN_INSTANT, 'pointer-events-auto', className)}
                {...props}
            />
        </DropdownMenuPrimitive.Portal>
    );
}

export { DropdownMenuItem as TransactionsDropdownMenuItem, DropdownMenuTrigger as TransactionsDropdownMenuTrigger };
