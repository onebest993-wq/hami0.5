import React from 'react';

/** مؤشر تحميل خفيف — نفس ألوان النظام */
export const LawyerLazyFallback: React.ReactNode = (
    <div className="min-h-screen bg-[#0B1021] flex items-center justify-center">
        <div className="text-[#E6C673]/70 text-sm font-bold animate-pulse">جاري التحميل...</div>
    </div>
);
