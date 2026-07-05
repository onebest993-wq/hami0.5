import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';

export type LawsuitsWorkspaceTab = 'civil' | 'urgent';

type LawsuitsWorkspaceShellProps = {
    defaultTab?: LawsuitsWorkspaceTab;
    onClose: () => void;
    onTabChange?: (tab: LawsuitsWorkspaceTab) => void;
    onUrgentTabIntent?: () => void;
    onShellReady?: () => void;
    children: (tab: LawsuitsWorkspaceTab) => React.ReactNode;
};

export function LawsuitsWorkspaceShell({
    defaultTab = 'civil',
    onClose,
    onTabChange,
    onUrgentTabIntent,
    onShellReady,
    children,
}: LawsuitsWorkspaceShellProps): React.ReactElement {
    const [tab, setTab] = useState<LawsuitsWorkspaceTab>(defaultTab);

    useBodyScrollLock(true);

    useLayoutEffect(() => {
        onShellReady?.();
    }, [onShellReady]);

    useEffect(() => {
        setTab(defaultTab);
    }, [defaultTab]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            onClose();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [onClose]);

    const selectTab = (next: LawsuitsWorkspaceTab) => {
        setTab(next);
        onTabChange?.(next);
        if (next === 'urgent') onUrgentTabIntent?.();
    };

    return (
        <div
            className="fixed inset-0 z-[220] bg-[#0B1021] font-['Tajawal','Cairo',sans-serif] flex flex-col"
            data-testid={CIVIL_LAWSUIT_TEST_IDS.workspace}
        >
            <div className="shrink-0 border-b border-white/10 bg-[#0B1021]">
                <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
                    <div className="text-right min-w-0">
                        <h2 className="text-white font-extrabold text-lg">مخزن الإضابير</h2>
                        <p className="text-white/40 text-xs mt-0.5">دعاوى · مستعجل</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all touch-manipulation"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div dir="rtl" className="px-4 pb-4">
                    <div className="grid grid-cols-2 gap-2 bg-white/5 border border-white/10 rounded-2xl p-1.5">
                        <button
                            type="button"
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.tabCivil}
                            onClick={() => selectTab('civil')}
                            className={`min-h-[44px] rounded-xl text-xs font-bold transition-all touch-manipulation ${
                                tab === 'civil'
                                    ? 'bg-[#E6C673] text-[#0B1021]'
                                    : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            الدعاوى
                        </button>
                        <button
                            type="button"
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.tabUrgent}
                            onPointerEnter={() => onUrgentTabIntent?.()}
                            onFocus={() => onUrgentTabIntent?.()}
                            onClick={() => selectTab('urgent')}
                            className={`min-h-[44px] rounded-xl text-xs font-bold transition-all touch-manipulation ${
                                tab === 'urgent'
                                    ? 'bg-[#E6C673] text-[#0B1021]'
                                    : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            مستعجل
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">{children(tab)}</div>
        </div>
    );
}

export function LawsuitsAddCaseFab({
    onClick,
    onIntent,
}: {
    onClick: () => void;
    onIntent?: () => void;
}): React.ReactElement {
    return (
        <div className="pointer-events-none absolute inset-0 z-50">
            <button
                type="button"
                data-testid={CIVIL_LAWSUIT_TEST_IDS.addLawsuit}
                onClick={onClick}
                onPointerEnter={() => onIntent?.()}
                onFocus={() => onIntent?.()}
                title="إضافة ملف قضائي جديد"
                aria-label="إضافة ملف قضائي جديد"
                className="pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(1.5rem,env(safe-area-inset-left))] group inline-flex items-center gap-2.5 h-14 rounded-full pl-5 pr-4 shadow-2xl border-2 font-bold transition-all duration-200 hover:scale-[1.04] active:scale-95 touch-manipulation bg-gradient-to-r from-[#E6C673] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#E6C673] text-[#0B1021] border-[#E6C673]/60 shadow-[#E6C673]/30"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
            >
                <Plus size={22} strokeWidth={3} className="drop-shadow" />
                <span className="text-sm tracking-wide whitespace-nowrap">ملف قضائي جديد</span>
            </button>
        </div>
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
