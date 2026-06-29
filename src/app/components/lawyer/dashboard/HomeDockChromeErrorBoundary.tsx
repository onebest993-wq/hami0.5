import React from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';

export function HomeDockChromeErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary
            fallback={
                <div
                    data-testid="home-dock-chrome-error-fallback"
                    className="relative flex flex-col items-center justify-center border rounded-[1.625rem] border-[#E6C673]/18 bg-[#0a0a0c]/88 min-h-[120px] px-6 py-8 text-center"
                    role="alert"
                    aria-label="خطأ في الشريط السفلي"
                >
                    <p className="text-white/60 text-sm max-w-xs leading-relaxed">
                        تعذّر تحميل الشريط السفلي. أعد تحميل الصفحة.
                    </p>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    );
}
