import React from 'react';

function prefetchFinancialHubSurface(): void {
    void import('../executionFinancialHubPortalLazy')
        .then((m) => {
            m.prefetchExecutionFinancialHubPortal();
        })
        .catch(() => undefined);
}

export interface FinancialTabProps {
    openFinancialHubLedger: () => void;
}

export const FinancialTab: React.FC<FinancialTabProps> = ({ openFinancialHubLedger }) => (
    <div className="p-5 space-y-4">
        <button
            type="button"
            onClick={openFinancialHubLedger}
            onPointerEnter={prefetchFinancialHubSurface}
            onFocus={prefetchFinancialHubSurface}
            className="w-full min-h-[44px] touch-manipulation rounded-xl border border-[#E6C673]/35 bg-[#05060D]/70 px-3 py-2 text-[11px] font-bold text-[#E6C673]"
        >
            فتح المركز المالي — إدارة الأموال والمصاريف
        </button>
    </div>
);
