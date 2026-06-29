import React from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

/** تحميل أول فقط — بدون نص حاجز مرئي عند وجود بيانات مخزّنة */
export function ProfileLoadingState() {
    const reduceMotion = useReduceMotion();

    return (
        <div
            className="min-h-screen bg-[#030508] flex flex-col items-center justify-center gap-4"
            data-testid="lawyer-profile-loading"
            aria-busy="true"
            aria-live="polite"
        >
            {reduceMotion ? (
                <div className="w-16 h-16 rounded-full border-2 border-[#E6C673]/35" aria-hidden />
            ) : (
                <div className="relative w-16 h-16" aria-hidden>
                    <div className="absolute inset-0 rounded-full border-2 border-[#E6C673]/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-[#E6C673] border-t-transparent animate-spin" />
                </div>
            )}
            <span className="sr-only">جاري تحميل الملف المهني</span>
        </div>
    );
}
