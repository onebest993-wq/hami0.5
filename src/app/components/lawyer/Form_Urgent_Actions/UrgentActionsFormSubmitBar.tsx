import React from 'react';

export function UrgentActionsFormSubmitBar() {
    return (
        <div className="sticky bottom-0 z-10 -mx-3 px-3 py-2.5 mt-1 border-t border-white/[0.08] bg-[#0B1021]">
            <div className="flex items-center justify-end max-w-5xl mx-auto">
                <button
                    type="submit"
                    className="min-h-[44px] min-w-[9rem] px-5 rounded-lg font-bold text-[#0A0F1C] bg-[#E6C673] hover:bg-[#d4b85f] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/50"
                >
                    تقديم الطلب
                </button>
            </div>
        </div>
    );
}
