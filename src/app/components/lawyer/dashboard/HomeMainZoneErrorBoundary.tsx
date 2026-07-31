import React from 'react';
import { HomeLiteErrorBoundary } from '@/app/components/lawyer/dashboard/homeLiteErrorBoundary';

export function HomeMainZoneErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <HomeLiteErrorBoundary
            fallback={
                <div
                    data-testid="home-main-zone-error-fallback"
                    className="relative col-span-2 flex flex-col items-center justify-center border rounded-[1.625rem] border-[#E6C673]/18 bg-[#0a0a0c]/88 min-h-[200px] px-6 py-10 text-center"
                    role="alert"
                    aria-label="خطأ في شبكة الواجهة الرئيسية"
                >
                    <p className="text-white/60 text-sm max-w-xs leading-relaxed">
                        تعذّر تحميل بطاقات الواجهة. أعد تحميل الصفحة.
                    </p>
                </div>
            }
        >
            {children}
        </HomeLiteErrorBoundary>
    );
}
