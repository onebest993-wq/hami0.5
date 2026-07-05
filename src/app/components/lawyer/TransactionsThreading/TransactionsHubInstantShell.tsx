import React, { useEffect } from 'react';
import { Search } from 'lucide-react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import {
    TX_OVERLAY,
    TxGlassHeader,
    TxGlassPage,
    TxHeaderRow,
} from './transactionsGlassTheme';

type TransactionsHubInstantShellProps = {
    onBack: () => void;
};

/** هيكل المعاملات فوراً أثناء تحميل الـ chunk — زر الرجوع يعمل مباشرة */
export function TransactionsHubInstantShell({ onBack }: TransactionsHubInstantShellProps): React.ReactElement {
    useBodyScrollLock(true);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            onBack();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [onBack]);

    return (
        <div
            className={TX_OVERLAY}
            data-testid="transactions-hub-loading"
            data-transactions-instant-shell="1"
            role="dialog"
            aria-modal="true"
            aria-label="معاملات"
            aria-busy="true"
        >
            <TxGlassPage>
                <TxGlassHeader>
                    <TxHeaderRow title="إدارة المعاملات" onBack={onBack} backTestId="transactions-back" />

                    <div className="mt-4 relative pointer-events-none" aria-hidden>
                        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8680]/60" />
                        <div className="h-11 rounded-sm border border-[#2A4550]/80 bg-[#152A32] animate-pulse" />
                    </div>

                    <div className="mt-3 flex gap-1.5 overflow-hidden pb-0.5" aria-hidden>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-11 w-[4.5rem] shrink-0 rounded-[3px] bg-[#152A32] animate-pulse" />
                        ))}
                    </div>
                </TxGlassHeader>

                <div className="px-5 py-5 space-y-3 pb-28 max-w-[520px] mx-auto" aria-hidden>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className="relative overflow-hidden rounded-sm border border-[#2A4550]/90 bg-[#152A32] p-4 space-y-3 animate-pulse"
                        >
                            <div className="h-4 w-2/3 rounded-sm bg-[#1A3340]" />
                            <div className="h-3 w-1/2 rounded-sm bg-[#1A3340]/80" />
                            <div className="h-3 w-3/5 rounded-sm bg-[#1A3340]/60" />
                        </div>
                    ))}
                </div>
            </TxGlassPage>
        </div>
    );
}
