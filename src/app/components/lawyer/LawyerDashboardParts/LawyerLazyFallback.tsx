import React from 'react';

/** مؤشر تحميل كامل الشاشة — ورقة خفيفة بلا InstantShells */
export const LawyerLazyFallback: React.ReactNode = (
    <div
        className="min-h-screen bg-[#0B1021] flex items-center justify-center"
        data-testid="lawyer-dashboard-gate-loading"
        aria-busy="true"
        aria-label="جاري تحميل لوحة المحامي"
    >
        <div className="text-[#E6C673]/70 text-sm font-bold animate-pulse">جاري التحميل...</div>
    </div>
);

export { LawyerLazyFallback as LAWYER_LAZY_FALLBACK };
