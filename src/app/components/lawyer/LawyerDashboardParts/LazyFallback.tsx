import React from 'react';

/** أجندة المهام — overlay ثابت فوق الستارة (z-230) */
export const TasksManagerFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[230] flex flex-col items-center justify-center font-['Tajawal','Cairo',sans-serif] bg-gradient-to-b from-[#061612] via-[#0A2E25] to-[#051410]"
        role="dialog"
        aria-label="أجندة المهام"
        aria-busy="true"
    >
        <div className="text-[#D4B896]/80 text-sm font-extrabold animate-pulse">جاري فتح أجندة المهام...</div>
    </div>
);

export { TasksManagerFallback as TASKS_MANAGER_FALLBACK };

/** أرشيف الإضابير — overlay ثابت (z-60) حتى لا يختفي خلف تبويب الرئيسية أثناء lazy load */
export const ArchivePortalFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[60] bg-[#0B1021]/95 backdrop-blur-md flex items-center justify-center font-['Tajawal','Cairo',sans-serif]"
        role="dialog"
        aria-label="أرشيف الإضابير"
        aria-busy="true"
    >
        <div className="text-[#E6C673]/70 text-sm font-bold animate-pulse">جاري فتح الأرشيف...</div>
    </div>
);

export { ArchivePortalFallback as ARCHIVE_PORTAL_FALLBACK };

/** مؤشر تحميل كامل الشاشة — للتبويبات والنوافذ فقط */
export const LawyerLazyFallback: React.ReactNode = (
    <div className="min-h-screen bg-[#0B1021] flex items-center justify-center">
        <div className="text-[#E6C673]/70 text-sm font-bold animate-pulse">جاري التحميل...</div>
    </div>
);

function sectionFallback(minHeightClass: string): React.ReactNode {
    return (
        <div
            className={`w-full rounded-2xl border border-white/5 bg-[#0D0D1A]/40 ${minHeightClass} shrink-0 animate-pulse`}
            aria-hidden="true"
        />
    );
}

/** بطاقة التنبيهات — لا تغطي الشاشة بالكامل */
export const LawyerHomeAlertsFallback: React.ReactNode = sectionFallback('min-h-[160px]');

/** مركز الأوامر الموحّد */
export const LawyerHomeHubFallback: React.ReactNode = sectionFallback('min-h-[280px]');

/** شريط المفكرة السريعة */
export const LawyerHomeDockFallback: React.ReactNode = sectionFallback('min-h-[200px]');

/** لوحة إشعارات خفيفة — bottom sheet على الهاتف */
export const NotificationPanelFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[100] flex flex-col justify-end"
        role="dialog"
        aria-label="الإشعارات"
        aria-busy="true"
    >
        <div className="absolute inset-0 bg-[#010308]/75 backdrop-blur-[18px]" aria-hidden />
        <div className="relative w-full max-h-[88dvh] rounded-t-[28px] border-t border-x border-[#E6C673]/12 bg-[#080D18]/98 overflow-hidden pb-[max(12px,env(safe-area-inset-bottom))]">
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-4" aria-hidden />
            <div className="px-4 pb-3 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#E6C673]/20 animate-pulse shrink-0" aria-hidden />
                <div className="flex-1 h-5 rounded-lg bg-white/[0.05] animate-pulse" aria-hidden />
            </div>
            <div className="px-4 pb-3 flex gap-2">
                <div className="h-11 w-24 rounded-xl bg-white/[0.05] animate-pulse" aria-hidden />
                <div className="h-11 w-24 rounded-xl bg-white/[0.05] animate-pulse" aria-hidden />
            </div>
            <div className="px-4 pb-6 space-y-2">
                <div className="h-16 rounded-2xl bg-white/[0.04] animate-pulse" aria-hidden />
                <div className="h-16 rounded-2xl bg-white/[0.04] animate-pulse" aria-hidden />
            </div>
        </div>
    </div>
);

/** الملف المهني — skeleton خفيف (Suspense fallback) */
export const LawyerProfileFallback: React.ReactNode = (
    <div
        className="min-h-screen bg-[#05060D] text-white overflow-x-hidden pb-28"
        data-testid="lawyer-profile-loading"
        aria-busy="true"
    >
        <div className="h-48 sm:h-56 bg-white/[0.04] animate-pulse" aria-hidden />
        <div className="px-4 -mt-20 max-w-2xl mx-auto">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 space-y-4 animate-pulse">
                <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-2xl bg-white/[0.06] shrink-0" aria-hidden />
                    <div className="flex-1 space-y-2 pt-2">
                        <div className="h-5 w-40 rounded-lg bg-white/[0.06]" aria-hidden />
                        <div className="h-4 w-28 rounded-lg bg-white/[0.05]" aria-hidden />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1 h-10 rounded-xl bg-white/[0.05]" aria-hidden />
                    <div className="flex-1 h-10 rounded-xl bg-white/[0.05]" aria-hidden />
                </div>
            </div>
        </div>
        <div className="px-4 mt-8 max-w-2xl mx-auto flex justify-center">
            <div className="text-[#E6C673]/45 text-xs font-bold animate-pulse">جاري فتح الملف المهني...</div>
        </div>
    </div>
);

/** طبقة بحث خفيفة — bottom sheet على الهاتف */
export const GlobalSearchOverlayFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[100] flex flex-col justify-end"
        role="dialog"
        aria-label="بحث شامل"
        aria-busy="true"
    >
        <div className="absolute inset-0 bg-[#010308]/75 backdrop-blur-[18px]" aria-hidden />
        <div className="relative w-full rounded-t-[28px] border-t border-x border-[#E6C673]/12 bg-[#080D18]/98 overflow-hidden pb-[max(12px,env(safe-area-inset-bottom))]">
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-4" aria-hidden />
            <div className="px-4 pb-4 flex items-center gap-3">
                <div className="flex-1 h-[52px] rounded-2xl bg-white/[0.05] border border-white/[0.08] animate-pulse" aria-hidden />
            </div>
            <div className="px-4 pb-6 flex justify-center">
                <div className="text-[#E6C673]/45 text-xs font-bold animate-pulse">جاري فتح البحث...</div>
            </div>
        </div>
    </div>
);
