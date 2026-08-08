import React, { useEffect } from 'react';
import { HomeSearchIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
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

/**
 * قشرة طارئة فقط إن تأخّر System — هيكل ثابت بلا نبض تحميل.
 */
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
        >
            <TxGlassPage>
                <TxGlassHeader>
                    <TxHeaderRow title="إدارة المعاملات" onBack={onBack} backTestId="transactions-back" />

                    <div
                        className="mt-4 rounded-sm border-2 border-[#3A5A68] bg-[#152A32] overflow-hidden pointer-events-none"
                        aria-hidden
                    >
                        <div className="flex items-center gap-2 px-3 h-11">
                            <HomeSearchIcon className="w-4 h-4 text-[#8A8680]/60 shrink-0" />
                            <div className="h-3 flex-1 rounded-sm bg-[#1A3340]/60" />
                            <div className="h-5 w-12 shrink-0 rounded-[3px] bg-[#D4A56A]/10 border border-[#A67C45]/30" />
                        </div>
                        <div className="h-px bg-gradient-to-l from-transparent via-[#2A4550]/70 to-transparent" />
                        <div className="flex gap-1.5 overflow-hidden px-2 py-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-11 w-[4.25rem] shrink-0 rounded-[3px] bg-[#0E1F26]/90 border border-[#3A5A68]/50"
                                />
                            ))}
                        </div>
                        <div className="border-t border-[#2A4550]/45 px-3 py-1.5 flex justify-between gap-2">
                            <div className="h-2.5 w-16 rounded-sm bg-[#1A3340]/50" />
                            <div className="h-2.5 w-20 rounded-sm bg-[#1A3340]/40" />
                        </div>
                    </div>
                </TxGlassHeader>

                <div className="px-5 py-5 space-y-3 pb-28 max-w-[520px] mx-auto" aria-hidden>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className="relative overflow-hidden rounded-sm border border-[#2A4550]/90 bg-[#152A32] p-4 space-y-3"
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
