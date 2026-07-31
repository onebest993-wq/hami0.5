import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import { inertProps } from '@/app/utils/inertProps';
import { ARCHIVE_SEGMENT_BTN_ACTIVE } from '@/app/components/lawyer/ArchivePortal/archiveToolbarStyles';
import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';

export type LawsuitsWorkspaceTab = 'civil' | 'urgent';

type LawsuitsWorkspaceShellProps = {
    defaultTab?: LawsuitsWorkspaceTab;
    onClose: () => void;
    /** مغادرة إلى الواجهة الرئيسية (X) */
    onExitToHome?: () => void;
    onTabChange?: (tab: LawsuitsWorkspaceTab) => void;
    onUrgentTabIntent?: () => void;
    onShellReady?: () => void;
    /** false عند keep-alive المخفي أو تحت الإضبارة الجنائية */
    escapeEnabled?: boolean;
    /** false مع keep-alive — الطبقة مخفية لكن الشجرة مركّبة */
    open?: boolean;
    /** زر الإضافة — يُركَّب عائماً فوق المحتوى (بدون شريط سفلي) */
    addCaseFab?: React.ReactNode;
    /** طبقة فوق المحتوى (مثلاً اختيار الاختصاص) */
    layerOverlay?: React.ReactNode;
    children: (tab: LawsuitsWorkspaceTab) => React.ReactNode;
};

export function LawsuitsWorkspaceShell({
    defaultTab = 'civil',
    onClose,
    onExitToHome,
    onTabChange,
    onUrgentTabIntent,
    onShellReady,
    escapeEnabled = true,
    open = true,
    addCaseFab,
    layerOverlay,
    children,
}: LawsuitsWorkspaceShellProps): React.ReactElement {
    const [tab, setTab] = useState<LawsuitsWorkspaceTab>(defaultTab);

    useBodyScrollLock(open);

    useLayoutEffect(() => {
        if (!open) return;
        onShellReady?.();
    }, [onShellReady, open]);

    useEffect(() => {
        setTab(defaultTab);
    }, [defaultTab]);

    useEffect(() => {
        if (!open || !escapeEnabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (
                document.querySelector('[data-testid="criminal-dashboard-portal"]') ||
                document.querySelector('[data-testid="criminal-dashboard-dossier"]') ||
                document.querySelector(`[data-testid="${CIVIL_LAWSUIT_TEST_IDS.jurisdictionPicker}"]`)
            ) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            onClose();
        };
        const tryClose = (): boolean => {
            if (
                document.querySelector('[data-testid="criminal-dashboard-portal"]') ||
                document.querySelector('[data-testid="criminal-dashboard-dossier"]') ||
                document.querySelector(`[data-testid="${CIVIL_LAWSUIT_TEST_IDS.jurisdictionPicker}"]`)
            ) {
                return false;
            }
            onClose();
            return true;
        };
        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(tryClose);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
    }, [onClose, escapeEnabled, open]);

    const selectTab = (next: LawsuitsWorkspaceTab) => {
        setTab(next);
        onTabChange?.(next);
        if (next === 'urgent') onUrgentTabIntent?.();
    };

    return (
        <div
            className="fixed inset-0 z-[220] bg-[#0B1021] font-['Tajawal','Cairo',sans-serif] flex flex-col"
            data-testid={CIVIL_LAWSUIT_TEST_IDS.workspace}
            data-open={open ? 'true' : 'false'}
            aria-hidden={!open}
            style={{
                visibility: open ? 'visible' : 'hidden',
                pointerEvents: open ? 'auto' : 'none',
                opacity: open ? 1 : 0,
            }}
            {...inertProps(!open)}
        >
            <header className="shrink-0 relative z-10 bg-transparent" dir="rtl">
                <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
                    <div className="flex w-full items-center gap-2">
                        {onExitToHome ? (
                            <DossierHeaderNavButtons
                                onExit={onExitToHome}
                                showBack={false}
                                exitTestId="lawsuits-workspace-exit"
                            />
                        ) : null}
                        <div className="min-w-0 flex-1 text-center">
                            <h2 className="text-white font-extrabold text-lg tracking-tight">
                                مخزن الإضابير
                            </h2>
                        </div>
                        <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />
                        <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />
                    </div>
                </div>

                <div dir="rtl" className="px-4 pb-4">
                    <div
                        className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-transparent p-1.5"
                        role="tablist"
                        aria-label="أقسام مخزن الإضابير"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'civil'}
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.tabCivil}
                            onClick={() => selectTab('civil')}
                            className={`min-h-[44px] rounded-xl text-xs font-bold transition-all touch-manipulation ${
                                tab === 'civil'
                                    ? ARCHIVE_SEGMENT_BTN_ACTIVE
                                    : 'bg-transparent text-white/65 hover:bg-white/[0.06] hover:text-white'
                            }`}
                        >
                            الدعاوى
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'urgent'}
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.tabUrgent}
                            onPointerEnter={() => onUrgentTabIntent?.()}
                            onFocus={() => onUrgentTabIntent?.()}
                            onClick={() => selectTab('urgent')}
                            className={`min-h-[44px] rounded-xl text-xs font-bold transition-all touch-manipulation ${
                                tab === 'urgent'
                                    ? 'bg-gradient-to-r from-rose-600/85 to-red-500/80 border border-rose-300/25 text-white'
                                    : 'bg-transparent text-white/65 hover:bg-white/[0.06] hover:text-white'
                            }`}
                        >
                            مستعجل
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col min-w-0">{children(tab)}</div>

            {layerOverlay}

            {tab === 'civil' && addCaseFab ? (
                <div
                    className="pointer-events-none fixed inset-0 z-[235] flex flex-col items-end justify-end pe-[max(1rem,env(safe-area-inset-right))] ps-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))]"
                    aria-hidden
                >
                    <div className="pointer-events-auto">{addCaseFab}</div>
                </div>
            ) : null}
        </div>
    );
}

export type LawsuitsAddCaseFabTone = 'gold' | 'urgent';

/**
 * زر إضافة مضغوط — absolute صريح (لا يعتمد على hami-royal-glass-btn لأنه يفرض position:relative).
 */
export function LawsuitsAddCaseFab({
    onClick,
    onIntent,
    label = 'إضبارة جديدة',
    tone = 'gold',
    testId = CIVIL_LAWSUIT_TEST_IDS.addLawsuit,
}: {
    onClick: () => void;
    onIntent?: () => void;
    label?: string;
    tone?: LawsuitsAddCaseFabTone;
    testId?: string;
}): React.ReactElement {
    const toneClass =
        tone === 'urgent'
            ? 'border-rose-400/50 bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-900/40'
            : 'border-[#E6C673]/50 bg-[linear-gradient(155deg,rgba(230,198,115,0.42)_0%,rgba(11,16,33,0.92)_48%,rgba(201,162,39,0.28)_100%)] text-[#F8F1DE] shadow-[inset_0_1px_0_rgba(255,249,230,0.28),0_10px_28px_rgba(0,0,0,0.35)]';

    return (
        <button
            type="button"
            data-testid={testId}
            onClick={onClick}
            onPointerEnter={() => onIntent?.()}
            onFocus={() => onIntent?.()}
            title={`إضافة ${label}`}
            aria-label={`إضافة ${label}`}
            className={`inline-flex h-12 w-auto shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold backdrop-blur-md touch-manipulation transition-transform duration-200 hover:scale-[1.03] active:scale-95 ${toneClass}`}
        >
            <Plus size={18} strokeWidth={3} aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
        </button>
    );
}

export function LawsuitsWorkspaceTabLoading({ label }: { label: string }): React.ReactElement {
    return (
        <div className="h-full flex flex-col px-5 pt-4 pb-24" aria-busy="true">
            <div className="h-11 rounded-xl border border-white/10 bg-white/[0.04] animate-pulse" aria-hidden />
            <div className="mt-3 h-10 rounded-xl border border-white/10 bg-white/[0.04] animate-pulse" aria-hidden />
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 content-start" aria-hidden>
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-28 rounded-xl border border-white/10 bg-white/[0.04] animate-pulse" />
                ))}
            </div>
            <p className="sr-only">{label}</p>
        </div>
    );
}
