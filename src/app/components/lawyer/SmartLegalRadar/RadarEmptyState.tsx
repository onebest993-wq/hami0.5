import React from 'react';

/** حالة «لا مواعيد» — نص هادئ بلا أيقونة ولا حشو */
export const EmptyState = React.memo(function EmptyState() {
    return (
        <div
            className="flex flex-col items-center justify-center py-4 px-3 text-center"
            data-testid="radar-empty-state"
        >
            <p className="text-[12px] text-[#E8DCC8]/50">لا توجد مواعيد لهذا اليوم</p>
        </div>
    );
});
