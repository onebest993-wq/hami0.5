import React from 'react';
import {
    HomeLiteErrorBoundary,
    HomeLiteErrorFallback,
} from '@/app/components/lawyer/dashboard/homeLiteErrorBoundary';

export function LawyerHomeTabErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <HomeLiteErrorBoundary
            source="LawyerHomeTabErrorBoundary"
            fallback={(retry) => (
                <HomeLiteErrorFallback
                    testId="lawyer-home-tab-error-fallback"
                    ariaLabel="خطأ في الواجهة الرئيسية"
                    message="تعذّر تحميل الواجهة الرئيسية."
                    onRetry={retry}
                    className="relative flex flex-col items-center justify-center min-h-[40vh] px-6 py-12 text-center"
                />
            )}
        >
            {children}
        </HomeLiteErrorBoundary>
    );
}
