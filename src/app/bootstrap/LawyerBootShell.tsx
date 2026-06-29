import React, { useEffect, useLayoutEffect } from 'react';
import { markBootPhase, reportBootTimeline } from '@/app/bootstrap/bootMetrics';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import { preloadLawyerDashboardChunk } from '@/app/bootstrap/lawyerDashboardChunk';

/** خلفية هيكل الإقلاع — تطابق hami-boot-shell.css */
const BOOT_SHELL_PAGE_BG =
    'radial-gradient(ellipse 90% 55% at 50% -8%, rgba(230, 198, 115, 0.14), transparent 58%), linear-gradient(180deg, #0a0f1c 0%, #05060d 48%, #000 100%)';

function blockSkeleton(minHeightClass: string): React.ReactNode {
    return (
        <div
            className={`w-full rounded-[1.625rem] border border-white/[0.06] bg-[#0D0D1A]/40 ${minHeightClass} shrink-0 animate-pulse`}
            aria-hidden
        />
    );
}

/**
 * هيكل الرئيسية فوراً — بدون نص «جاري التحميل».
 * يُعرض أثناء جلب chunk LawyerDashboard (dev + prod).
 */
export function LawyerBootShell(): React.ReactElement {
    useLayoutEffect(() => {
        removeStaticBootShell();
        markBootPhase('shell-visible');
        window.dispatchEvent(new Event('hami:shell-visible'));
    }, []);

    useEffect(() => {
        void preloadLawyerDashboardChunk();
    }, []);

    useEffect(() => {
        return () => {
            markBootPhase('overlay-removed');
            reportBootTimeline();
        };
    }, []);

    return (
        <div
            className="min-h-screen w-full text-right pb-10 relative overflow-x-hidden font-sans text-white"
            style={{ background: BOOT_SHELL_PAGE_BG }}
            dir="rtl"
            aria-busy="true"
            aria-label="تهيئة لوحة المحامي"
            data-testid="lawyer-boot-shell"
        >
            <div
                className="fixed top-0 left-0 right-0 z-50 h-[84px] px-4 sm:px-5 flex items-center justify-between pointer-events-none"
                aria-hidden
            >
                <div className="w-10 h-10 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
                <div className="flex gap-2">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] animate-pulse" />
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] animate-pulse" />
                    <div className="w-9 h-9 rounded-xl bg-white/[0.05] animate-pulse" />
                </div>
            </div>

            <div className="absolute inset-x-0 top-[84px] z-[1] hami-shell-gutter-x pt-2">
                <div className="hami-shell-container w-full mx-auto pb-2">
                    <div className="grid grid-cols-2 gap-3.5">
                        <div className="col-span-2">{blockSkeleton('min-h-[52px]')}</div>
                        <div className="col-span-2">{blockSkeleton('min-h-[280px]')}</div>
                        <div className="col-span-2">{blockSkeleton('min-h-[180px]')}</div>
                        <div className="col-span-1">{blockSkeleton('min-h-[120px]')}</div>
                        <div className="col-span-1">{blockSkeleton('min-h-[120px]')}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
