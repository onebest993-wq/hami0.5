import React from 'react';

function DossierOpeningFallback() {
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md"
            role="status"
            aria-busy="true"
            aria-label="الإضبارة"
        >
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0A0F1C]/80 px-6 py-5 shadow-2xl">
                <div className="h-3 w-28 rounded-md border border-[#E6C673]/15 bg-[#E6C673]/8" aria-hidden />
                <div className="mt-4 min-h-[44px] rounded-xl border border-white/[0.09] bg-white/[0.035]" aria-hidden />
                <div className="mt-2 min-h-[44px] rounded-xl border border-white/[0.09] bg-white/[0.035]" aria-hidden />
            </div>
        </div>
    );
}

export default DossierOpeningFallback;
