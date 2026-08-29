import type { ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';
import { TransactionsHubDialog } from './TransactionsHubDialog';
import { TX_DIALOG_DESC, TX_DIALOG_SHELL, TX_DIALOG_TITLE } from './transactionsGlassTheme';

export function TxThreadDialogFrame({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    children: ReactNode;
    footer: ReactNode;
}) {
    return (
        <TransactionsHubDialog open={open} onOpenChange={onOpenChange} ariaLabel={title}>
            <div className={TX_DIALOG_SHELL}>
                <div className="flex flex-col gap-2 text-center sm:text-left text-right">
                    <h2 className={cn('text-lg leading-none font-semibold', TX_DIALOG_TITLE)}>{title}</h2>
                    <p className={cn('text-muted-foreground text-sm', TX_DIALOG_DESC)}>{description}</p>
                </div>
                <div dir="rtl" className="text-right">
                    {children}
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">{footer}</div>
            </div>
        </TransactionsHubDialog>
    );
}
