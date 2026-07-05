import React, { useEffect } from 'react';
import { TransactionsHubInstantShell } from '@/app/components/lawyer/TransactionsThreading/TransactionsHubInstantShell';

/** أجندة المهام — overlay ثابت فوق الستارة (z-230) */
export const TasksManagerFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[230] flex flex-col items-center justify-center font-['Tajawal','Cairo',sans-serif] bg-gradient-to-b from-[#061612] via-[#0A2E25] to-[#051410]"
        role="dialog"
        aria-label="أجندة المهام"
        aria-busy="true"
        data-testid="tasks-manager-loading"
    >
        <div className="text-[#D4B896]/80 text-sm font-extrabold animate-pulse">جاري فتح أجندة المهام...</div>
    </div>
);

export { TasksManagerFallback as TASKS_MANAGER_FALLBACK };

/** ستارة مهام اليوم — تحميل سريع أثناء lazy load */
export const FieldTasksSheetFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[214] flex items-end justify-center"
        role="dialog"
        aria-label="مهام اليوم الميدانية"
        aria-busy="true"
        data-testid="field-tasks-sheet-loading"
    >
        <div className="w-full max-h-[40dvh] rounded-t-[24px] border border-[#A67C52]/28 bg-[#0A2E25]/95 animate-pulse" />
    </div>
);

export { FieldTasksSheetFallback as FIELD_TASKS_SHEET_FALLBACK };

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

/** المنتدى القانوني — واجهة plum فورية أثناء lazy load (بدون شاشة سوداء عامة) */
export function CommunityScreenLoadingFallback({ onBack }: { onBack?: () => void }) {
    useEffect(() => {
        if (!onBack) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            onBack();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onBack]);

    return (
        <div
            className="fixed inset-0 z-[95] h-[100dvh] flex flex-col font-['Tajawal','Cairo',sans-serif] text-right"
            style={{ background: 'linear-gradient(155deg, #0E0812 0%, #140A18 48%, #1A1020 100%)' }}
            role="dialog"
            aria-label="المنتدى القانوني"
            aria-busy="true"
            dir="rtl"
            data-testid="forum-screen-loading"
        >
            <div className="bg-[#140A18] border-b border-[#4A3D52]/40 sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#342C3A] animate-pulse shrink-0" aria-hidden />
                <div className="flex-1 h-5 rounded-lg bg-[#342C3A]/80 animate-pulse" aria-hidden />
                <div className="w-9 h-9 rounded-full bg-[#342C3A] animate-pulse shrink-0" aria-hidden />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
                <div className="w-16 h-16 rounded-2xl bg-[#38303E] border border-[#4A3D52]/50 animate-pulse" aria-hidden />
                <p className="text-[#F0B896]/55 text-sm font-bold animate-pulse">جاري فتح المنتدى...</p>
            </div>
        </div>
    );
}

export const CommunityScreenFallback = CommunityScreenLoadingFallback;

export { CommunityScreenLoadingFallback as COMMUNITY_SCREEN_FALLBACK };

export const LawsuitsWorkspaceFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[70] bg-[#0B1021] flex items-center justify-center font-['Tajawal','Cairo',sans-serif]"
        role="dialog"
        aria-label="مساحة الدعاوى"
        aria-busy="true"
        data-testid="lawsuits-workspace"
    >
        <div className="text-[#E6C673]/70 text-sm font-bold animate-pulse">جاري فتح الدعاوى...</div>
    </div>
);

export function TransactionsHubLoadingFallback({ onBack }: { onBack?: () => void }) {
    if (onBack) {
        return <TransactionsHubInstantShell onBack={onBack} />;
    }

    return (
        <div
            className="fixed inset-0 z-[200] bg-[#061014]/98 flex items-center justify-center font-['Tajawal','Cairo',sans-serif]"
            role="dialog"
            aria-label="معاملات"
            aria-busy="true"
            data-testid="transactions-hub-loading"
        >
            <div className="text-[#D8D4CE]/70 text-sm font-bold animate-pulse">جاري فتح المعاملات...</div>
        </div>
    );
}

export const TransactionsHubFallback: React.ReactNode = <TransactionsHubLoadingFallback />;

/** المستودع الذكي — overlay ثابت أثناء lazy load */
export const RepositoryShellFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[120] bg-[#0B1021]/95 flex items-center justify-center font-['Tajawal','Cairo',sans-serif]"
        role="dialog"
        aria-label="المستودع الذكي"
        aria-busy="true"
        data-testid="smart-repository-modal"
    >
        <div className="text-[#E6C673]/70 text-sm font-bold animate-pulse">جاري فتح المستودع...</div>
    </div>
);

/** تبويب التقويم — خلفية مطابقة لـ SmartLegalRadar */
export const ScheduleTabFallback: React.ReactNode = (
    <div
        className="block h-[100dvh] bg-[#1f1712] flex flex-col items-center justify-center font-['Tajawal','Cairo',sans-serif]"
        role="status"
        aria-label="التقويم"
        aria-busy="true"
        data-testid="schedule-tab-loading"
    >
        <div className="w-8 h-8 rounded-full border-2 border-[#E6C673]/30 border-t-[#E6C673] animate-spin" aria-hidden />
        <span className="sr-only">جاري فتح التقويم...</span>
    </div>
);

/** مركز الإعدادات — واجهة فورية أثناء lazy load (بدون شاشة فارغة) */
export function SettingsScreenLoadingFallback({ onClose }: { onClose?: () => void }) {
    useEffect(() => {
        if (!onClose) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[150] flex flex-col bg-[#05060d] font-sans"
            role="dialog"
            aria-modal="true"
            aria-label="مركز الإعدادات"
            aria-busy="true"
            data-testid="hami-settings-shell-loading"
            data-settings-loading="1"
        >
            <div className="hami-settings-header shrink-0 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-5 border-b border-white/[0.04]">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold text-white">مركز الإعدادات</h1>
                    <div className="w-10 h-10 rounded-full bg-white/[0.05] shrink-0" aria-hidden />
                </div>
                <div className="flex gap-0.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-1 min-w-[4.5rem] min-h-[44px] rounded-xl bg-white/[0.04]" aria-hidden />
                    ))}
                </div>
            </div>
            <div className="flex-1 px-6 pt-6 space-y-3" aria-hidden>
                <div className="h-24 rounded-2xl bg-white/[0.04]" />
                <div className="h-16 rounded-2xl bg-white/[0.03]" />
                <div className="h-16 rounded-2xl bg-white/[0.03]" />
            </div>
        </div>
    );
}

export const SettingsHubFallback: React.ReactNode = <SettingsScreenLoadingFallback />;

/** مؤشر تحميل كامل الشاشة — للتبويبات والنوافذ فقط */
export const LawyerLazyFallback: React.ReactNode = (
    <div
        className="min-h-screen bg-[#0B1021] flex items-center justify-center"
        data-testid="lawyer-dashboard-gate-loading"
        aria-busy="true"
        aria-label="جاري تحميل لوحة المحامي"
    >
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

/** لوحة إشعارات — واجهة فورية أثناء lazy load */
export function NotificationPanelLoadingFallback({ onClose }: { onClose?: () => void }) {
    useEffect(() => {
        if (!onClose) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-start sm:items-end sm:pt-[max(72px,env(safe-area-inset-top))] sm:pe-4 sm:pb-6"
            role="dialog"
            aria-label="الإشعارات"
            aria-busy="true"
            data-testid="notification-panel-shell-loading"
        >
            <div className="absolute inset-0 bg-[#010308]/70 backdrop-blur-xl" aria-hidden />
            <div className="relative w-full sm:max-w-[420px] max-h-[88dvh] rounded-t-[28px] sm:rounded-3xl border-t border-x border-[#E6C673]/15 sm:border bg-[#080D18]/96 overflow-hidden pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-16px_64px_rgba(0,0,0,0.7)]">
                <div className="w-11 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-4" aria-hidden />
                <div className="px-4 pb-3 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#E6C673]/12 animate-pulse shrink-0" aria-hidden />
                    <div className="flex-1 space-y-2">
                        <div className="h-5 rounded-lg bg-white/[0.05] animate-pulse w-2/3" aria-hidden />
                        <div className="h-3 rounded-md bg-white/[0.04] animate-pulse w-1/2" aria-hidden />
                    </div>
                </div>
                <div className="px-4 pb-3">
                    <div className="h-12 rounded-2xl bg-white/[0.04] animate-pulse" aria-hidden />
                </div>
                <div className="px-4 pb-6 space-y-2">
                    <div className="h-[72px] rounded-2xl bg-white/[0.04] animate-pulse" aria-hidden />
                    <div className="h-[72px] rounded-2xl bg-white/[0.04] animate-pulse" aria-hidden />
                </div>
            </div>
        </div>
    );
}

export const NotificationPanelFallback: React.ReactNode = <NotificationPanelLoadingFallback />;

/** الملف المهني — skeleton خفيف (Suspense fallback) */
export function LawyerProfileTabLoadingFallback({ onBack }: { onBack?: () => void }) {
    useEffect(() => {
        if (!onBack) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            onBack();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onBack]);

    return (
        <div
            className="min-h-screen bg-[#05060D] text-white overflow-x-hidden pb-28"
            data-testid="lawyer-profile-tab-loading"
            aria-busy="true"
            role="main"
            aria-label="الملف المهني"
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
}

export const LawyerProfileFallback: React.ReactNode = <LawyerProfileTabLoadingFallback />;

/** طبقة بحث خفيفة — bottom sheet على الهاتف */
export function GlobalSearchOverlayLoadingFallback({ onClose }: { onClose?: () => void }) {
    useEffect(() => {
        if (!onClose) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col justify-end"
            role="dialog"
            aria-label="بحث شامل"
            aria-busy="true"
            data-testid="global-search-overlay-loading"
        >
            <div className="absolute inset-0 bg-[#010308]/75 backdrop-blur-[18px]" aria-hidden />
            <div className="relative w-full rounded-t-[28px] border-t border-x border-[#E6C673]/12 bg-[#080D18]/98 overflow-hidden pb-[max(12px,env(safe-area-inset-bottom))]">
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-4" aria-hidden />
                <div className="px-4 pb-4 flex items-center gap-3">
                    <div
                        className="flex-1 h-[52px] rounded-2xl bg-white/[0.05] border border-white/[0.08] animate-pulse"
                        aria-hidden
                    />
                </div>
                <div className="px-4 pb-6 flex justify-center">
                    <div className="text-[#E6C673]/45 text-xs font-bold animate-pulse">جاري فتح البحث...</div>
                </div>
            </div>
        </div>
    );
}

export const GlobalSearchOverlayFallback: React.ReactNode = <GlobalSearchOverlayLoadingFallback />;
