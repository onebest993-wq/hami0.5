import React from 'react';
import {
    HomeLiteErrorBoundary,
    HomeLiteErrorFallback,
} from '@/app/components/lawyer/dashboard/homeLiteErrorBoundary';

export function HomeHubErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <HomeLiteErrorBoundary
            source="HomeHubErrorBoundary"
            fallback={(retry) => (
                <HomeLiteErrorFallback
                    testId="home-hub-error-fallback"
                    ariaLabel="خطأ في البطاقة"
                    message="تعذّر تحميل البطاقة."
                    onRetry={retry}
                    className="relative flex flex-col items-center justify-center border rounded-[1.625rem] border-[#E6C673]/18 bg-[#0a0a0c]/88 min-h-[180px] px-6 py-10 text-center"
                />
            )}
        >
            {children}
        </HomeLiteErrorBoundary>
    );
}
