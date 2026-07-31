import React, { useEffect } from 'react';
import { GlobalSearchInstantShell } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantShell';
import { TransactionsHubInstantShell } from '@/app/components/lawyer/TransactionsThreading/TransactionsHubInstantShell';
import { ForumInstantShell } from '@/app/components/lawyer/CommunityScreen/components/ForumInstantShell';

/** أجندة المهام — skeleton شبكة أسبوعية أثناء lazy load (z-230) */
export const TasksManagerFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[230] flex flex-col font-['Tajawal','Cairo',sans-serif] bg-gradient-to-b from-[#0A0F1C] via-[#0C1220] to-[#05060D]"
        role="dialog"
        aria-label="أجندة المهام"
        aria-busy="true"
        data-testid="tasks-manager-loading"
    >
        <div className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b border-[#A67C52]/20">
            <div className="flex items-center justify-between gap-3">
                <div className="h-5 w-36 rounded-lg bg-slate-800/50 animate-pulse" aria-hidden />
                <div className="h-9 w-9 rounded-full bg-slate-800/45 animate-pulse shrink-0" aria-hidden />
            </div>
            <div className="mt-3 flex gap-2 overflow-hidden">
                {Array.from({ length: 7 }, (_, i) => (
                    <div
                        key={i}
                        className="h-14 w-11 shrink-0 rounded-xl bg-slate-800/45 animate-pulse"
                        aria-hidden
                    />
                ))}
            </div>
        </div>
        <div className="flex-1 overflow-hidden px-4 py-4 space-y-3" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
                <div
                    key={i}
                    className="rounded-2xl border border-white/5 bg-slate-800/35 p-3.5 space-y-2.5 animate-pulse"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-800/55 shrink-0" />
                        <div className="flex-1 space-y-2 min-w-0">
                            <div className="h-3.5 w-[55%] rounded-md bg-slate-800/55" />
                            <div className="h-2.5 w-[35%] rounded-md bg-slate-800/40" />
                        </div>
                    </div>
                    <div className="h-2.5 w-full rounded-md bg-slate-800/40" />
                </div>
            ))}
        </div>
        <span className="sr-only">جاري فتح أجندة المهام</span>
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

/** المستودع الذكي — قشرة خفيفة أثناء lazy (بلا InstantShell الكامل في stem) */
export function RepositoryHubLoadingFallback({ onClose }: { onClose?: () => void }) {
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
            className="fixed inset-0 z-[95] flex flex-col font-['Tajawal','Cairo',sans-serif] text-right"
            style={{
                background:
                    'linear-gradient(168deg, #0A0F1C 0%, #0E1424 42%, #0A0F1C 100%)',
            }}
            role="dialog"
            aria-label="المستودع الذكي"
            aria-busy="true"
            dir="rtl"
            data-testid="smart-repository-loading"
        >
            <div className="border-b border-white/10 sticky top-0 z-10 px-4 py-3 flex items-center gap-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] min-w-[44px] rounded-full bg-white/5 touch-manipulation"
                    aria-label="إغلاق"
                    data-testid="smart-repository-close"
                />
                <div className="flex-1 h-5 rounded-lg bg-white/5 animate-pulse" aria-hidden />
            </div>
            <div className="flex-1" aria-hidden />
            <span className="sr-only">جاري فتح المستودع الذكي</span>
        </div>
    );
}

export { RepositoryHubLoadingFallback as REPOSITORY_HUB_FALLBACK };

/** أرشيف/مخزن الإضابير — يطابق InstantChrome (كان pulse مركزي يسبب وميض عند الانتقال للقشرة) */
export const ArchivePortalFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[220] bg-[#0B1021] font-['Tajawal','Cairo',sans-serif] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="مخزن الأضابير التنفيذية"
        aria-busy="true"
        data-testid="execution-archive-portal-fallback"
    >
        <div className="shrink-0 border-b border-white/10 bg-[#0B1021]">
            <div className="px-4 sm:px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 flex items-center justify-between gap-3">
                <div className="text-right min-w-0">
                    <h2 className="text-white font-extrabold text-lg sm:text-xl">مخزن الأضابير التنفيذية</h2>
                </div>
                <span
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/10 bg-white/5"
                    aria-hidden
                />
            </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
                <div className="w-full max-w-[520px] space-y-3" aria-hidden>
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={index}
                            className="h-16 rounded-xl border border-white/10 bg-white/[0.04] animate-pulse"
                        />
                    ))}
                </div>
                <p className="text-[#E6C673]/70 text-sm font-bold animate-pulse">جاري تحميل مخزن التنفيذ...</p>
            </div>
        </div>
    </div>
);

export { ArchivePortalFallback as ARCHIVE_PORTAL_FALLBACK };

/** المنتدى — قشرة Obsidian فورية أثناء lazy (بلا برقوقي قديم / بلا شاشة فارغة) */
export function CommunityScreenLoadingFallback({
    onBack,
    embedded = false,
}: {
    onBack?: () => void;
    /** داخل Host الذي يملك الطبقة والخلفية — لا تكرّر fixed/inset */
    embedded?: boolean;
}) {
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
        <div data-testid="forum-screen-loading" className={embedded ? 'h-full w-full' : undefined}>
            <ForumInstantShell onBack={onBack} embedded={embedded} />
        </div>
    );
}

export const CommunityScreenFallback = CommunityScreenLoadingFallback;

export { CommunityScreenLoadingFallback as COMMUNITY_SCREEN_FALLBACK };

export const LawsuitsWorkspaceFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[220] bg-[#0B1021] font-['Tajawal','Cairo',sans-serif] flex flex-col"
        role="dialog"
        aria-label="مخزن الإضابير"
        aria-busy="true"
        data-testid="lawsuits-workspace"
    >
        <div className="shrink-0 border-b border-white/10 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
            <h2 className="text-white font-extrabold text-lg text-right">مخزن الإضابير</h2>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 content-start">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 min-h-[132px] animate-pulse"
                    aria-hidden
                />
            ))}
        </div>
        <p className="sr-only">جاري فتح الدعاوى</p>
    </div>
);

export function TransactionsHubLoadingFallback({ onBack }: { onBack?: () => void }) {
    /* قشرة Instant الحقيقية — بلا رسالة انتظار نصية */
    if (!onBack) {
        return (
            <div
                className="fixed inset-0 z-[200] bg-[#061014]/98"
                data-testid="transactions-hub-loading"
                aria-busy="true"
            />
        );
    }
    return <TransactionsHubInstantShell onBack={onBack} />;
}

export const TransactionsHubFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[200] bg-[#061014]/98"
        data-testid="transactions-hub-loading"
        aria-busy="true"
    />
);

/** المستودع الذكي — skeleton هيكلي أثناء lazy load (بدون نص خام) */
export const RepositoryShellFallback: React.ReactNode = (
    <div
        className="fixed inset-0 z-[120] flex flex-col bg-[#0B1021]/96 font-['Tajawal','Cairo',sans-serif]"
        role="dialog"
        aria-label="المستودع الذكي"
        aria-busy="true"
        data-testid="smart-repository-loading"
    >
        <div className="shrink-0 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b border-white/[0.05]">
            <div className="flex items-center justify-between gap-3">
                <div className="h-6 w-40 rounded-lg bg-slate-800/50 animate-pulse" aria-hidden />
                <div className="h-10 w-10 rounded-full bg-slate-800/45 animate-pulse shrink-0" aria-hidden />
            </div>
            <div className="mt-3 flex gap-2 overflow-hidden" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-9 min-w-[5rem] flex-1 rounded-xl bg-slate-800/40 animate-pulse" />
                ))}
            </div>
        </div>
        <div className="flex-1 overflow-hidden px-4 py-4" aria-hidden>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-white/5 bg-slate-800/35 p-4 space-y-3 animate-pulse"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-800/55 shrink-0" />
                            <div className="flex-1 space-y-2 min-w-0">
                                <div className="h-3.5 w-3/4 rounded-md bg-slate-800/55" />
                                <div className="h-2.5 w-1/2 rounded-md bg-slate-800/40" />
                            </div>
                        </div>
                        <div className="h-20 w-full rounded-xl bg-slate-800/40" />
                    </div>
                ))}
            </div>
        </div>
        <span className="sr-only">جاري فتح المستودع الذكي</span>
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

/** مركز الإعدادات — قشرة معتمة فورية أثناء lazy (z يطابق Host؛ بلا شاشة فارغة) */
export function SettingsScreenLoadingFallback({
    onClose,
    open = true,
}: {
    onClose?: () => void;
    /** false أثناء keepAlive بعد إغلاق — لا تُظهر قشرة معلّقة فوق اللوحة */
    open?: boolean;
}) {
    useEffect(() => {
        if (!open || !onClose) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose, open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex flex-col bg-[#0B1021] font-sans"
            role="dialog"
            aria-modal="true"
            aria-label="مركز الإعدادات"
            aria-busy="true"
            data-testid="hami-settings-shell-loading"
            data-settings-loading="1"
            data-settings-root
            dir="rtl"
        >
            <div className="hami-settings-header shrink-0 px-4 pt-[max(0.65rem,env(safe-area-inset-top))] pb-3">
                <div className="flex items-center justify-between gap-3 mb-3.5">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#E6C673]/85 opacity-85 m-0 mb-[0.15rem]">
                            لوحة التحكم
                        </p>
                        <h1 className="text-[1.45rem] font-extrabold tracking-[-0.03em] leading-[1.15] text-white m-0">
                            مركز الإعدادات
                        </h1>
                    </div>
                    <button
                        type="button"
                        onPointerDown={(event) => {
                            if (
                                (typeof event.button === 'number' && event.button !== 0) ||
                                !onClose
                            ) {
                                return;
                            }
                            event.preventDefault();
                            event.stopPropagation();
                            onClose();
                        }}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onClose?.();
                        }}
                        className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/[0.06] touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
                        aria-label="إغلاق الإعدادات"
                        data-testid="settings-shell-close"
                    />
                </div>
                <div className="flex gap-0.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="flex-1 min-w-[4.5rem] min-h-[44px] rounded-xl bg-white/[0.04]"
                            aria-hidden
                        />
                    ))}
                </div>
            </div>
            <div className="flex-1 px-5 pt-4 space-y-3" aria-hidden>
                <div className="h-24 rounded-2xl bg-white/[0.04]" />
                <div className="h-16 rounded-2xl bg-white/[0.03]" />
                <div className="h-16 rounded-2xl bg-white/[0.03]" />
            </div>
            <span className="sr-only">جاري فتح مركز الإعدادات</span>
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

/**
 * قشرة Suspense = InstantShell (مسودة + scroll + Cap) — لا هيكل ميت بلا كتابة.
 */
export const GlobalSearchOverlayLoadingFallback = GlobalSearchInstantShell;

export const GlobalSearchOverlayFallback: React.ReactNode = <GlobalSearchInstantShell />;
