import React from 'react';

function DossierOpeningFallback() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="rounded-2xl border border-white/10 bg-[#0A0F1C]/80 px-6 py-5 text-center shadow-2xl">
                <p className="text-white font-extrabold text-sm">جاري فتح الإضبارة…</p>
                <p className="mt-1 text-[11px] text-slate-300">قد يستغرق ذلك لحظات بعد العودة للتطبيق</p>
            </div>
        </div>
    );
}

export default DossierOpeningFallback;
