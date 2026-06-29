import React from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';

export function HomeHubErrorBoundary({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary
            fallback={
                <section
                    data-testid="home-hub-error-fallback"
                    className="relative flex flex-col items-center justify-center border rounded-[1.625rem] border-[#E6C673]/18 bg-[#0a0a0c]/88 min-h-[180px] px-6 py-10 text-center"
                    role="alert"
                    aria-label="خطأ في التنبيهات والتثبيت"
                >
                    <p className="text-white/60 text-sm max-w-xs leading-relaxed">
                        تعذّر تحميل بطاقة التنبيهات والتثبيت. أعد تحميل الصفحة.
                    </p>
                </section>
            }
        >
            {children}
        </ErrorBoundary>
    );
}
