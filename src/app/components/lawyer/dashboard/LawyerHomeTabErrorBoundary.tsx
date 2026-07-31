import React from 'react';
import { HomeLiteErrorBoundary } from '@/app/components/lawyer/dashboard/homeLiteErrorBoundary';

export function LawyerHomeTabErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <HomeLiteErrorBoundary
            fallback={
                <div
                    data-testid="lawyer-home-tab-error-fallback"
                    className="relative flex flex-col items-center justify-center min-h-[40vh] px-6 py-12 text-center"
                    role="alert"
                    aria-label="خطأ في الواجهة الرئيسية"
                >
                    <p className="text-white/60 text-sm max-w-xs leading-relaxed">
                        تعذّر تحميل الواجهة الرئيسية. أعد تحميل الصفحة.
                    </p>
                </div>
            }
        >
            {children}
        </HomeLiteErrorBoundary>
    );
}
