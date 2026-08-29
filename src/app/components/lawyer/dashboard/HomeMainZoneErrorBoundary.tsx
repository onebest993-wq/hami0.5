import React from 'react';
import {
    HomeLiteErrorBoundary,
    HomeLiteErrorFallback,
} from '@/app/components/lawyer/dashboard/homeLiteErrorBoundary';

export function HomeMainZoneErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <HomeLiteErrorBoundary
            source="HomeMainZoneErrorBoundary"
            fallback={(retry) => (
                <HomeLiteErrorFallback
                    testId="home-main-zone-error-fallback"
                    ariaLabel="خطأ في شبكة الواجهة الرئيسية"
                    message="تعذّر تحميل بطاقات الواجهة."
                    onRetry={retry}
                    className="relative flex flex-col items-center justify-center border rounded-[1.625rem] border-[#E6C673]/18 bg-[#0a0a0c]/88 min-h-[200px] px-6 py-10 text-center"
                />
            )}
        >
            {children}
        </HomeLiteErrorBoundary>
    );
}
