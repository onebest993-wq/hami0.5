import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { LAWSUIT_VAULT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/lawsuitVaultTestIds';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';
import { blurFocusWithin, inertProps } from '@/app/utils/inertProps';
import { ARCHIVE_SEGMENT_BTN_ACTIVE } from '@/app/components/lawyer/ArchivePortal/archiveToolbarStyles';
import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';
import { HAMI_SHELL_OVERLAY_COLUMN_CLASS } from '@/app/utils/overlayPortal';
import {
    URGENT_WORKSPACE_TAB_ACTIVE,
    URGENT_WORKSPACE_TAB_IDLE,
} from '@/app/components/lawyer/dashboard/urgentWorkspaceChrome';

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
    children,
}: LawsuitsWorkspaceShellProps): React.ReactElement {
    const [tab, setTab] = useState<LawsuitsWorkspaceTab>(defaultTab);
    const rootRef = useRef<HTMLDivElement>(null);

    useBodyScrollLock(open);

    useLayoutEffect(() => {
        if (open) return;
        blurFocusWithin(rootRef.current);
    }, [open]);

    useLayoutEffect(() => {
        if (!open) return;
        onShellReady?.();
    }, [onShellReady, open]);

    useEffect(() => {
        setTab(defaultTab);
    }, [defaultTab]);

    useEffect(() => {
        if (!open || !escapeEnabled) return;
        const exit = onExitToHome ?? onClose;
        const hasBlockingOverlay = () =>
            Boolean(
                document.querySelector('[data-testid="criminal-dashboard-portal"]') ||
                    document.querySelector('[data-testid="criminal-dashboard-dossier"]') ||
                    document.querySelector(`[data-testid="${LAWSUIT_VAULT_TEST_IDS.jurisdictionPicker}"]`) ||
                    document.querySelector(`[data-testid="${LAWSUIT_VAULT_TEST_IDS.trashConfirmDialog}"]`) ||
                    document.querySelector(`[data-testid="${LAWSUIT_VAULT_TEST_IDS.permanentDeleteDialog}"]`) ||
                    document.querySelector(`[data-testid="${LAWSUIT_VAULT_TEST_IDS.criminalDeleteDialog}"]`) ||
                    document.querySelector('[data-testid="lawyer-new-case-save"]') ||
                    document.querySelector('[data-testid="lawyer-new-case-instant-shell"]') ||
                    document.querySelector('[data-testid="smart-file-dossier"]') ||
                    document.querySelector('[data-testid="smart-file-modal-boot-chrome"]') ||
                    document.querySelector('[data-testid="urgent-actions-form"]') ||
                    document.querySelector('[data-testid="urgent-active-order-dossier"]') ||
                    document.querySelector('[role="listbox"]') ||
                    document.querySelector('[role="menu"]'),
            );
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (hasBlockingOverlay()) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            exit();
        };
        const tryClose = (): boolean => {
            if (hasBlockingOverlay()) {
                return false;
            }
            exit();
            return true;
        };
        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(tryClose);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
    }, [onClose, onExitToHome, escapeEnabled, open]);

    const selectTab = (next: LawsuitsWorkspaceTab) => {
        setTab(next);
        onTabChange?.(next);
        if (next === 'urgent') onUrgentTabIntent?.();
    };

    return (
        <div
            ref={rootRef}
            className="fixed inset-0 z-[220] bg-[#0B1021] font-['Tajawal','Cairo',sans-serif] flex"
            data-testid={LAWSUIT_VAULT_TEST_IDS.workspace}
            data-hami-overlay-safe={open ? '1' : undefined}
            data-open={open ? 'true' : 'false'}
            aria-hidden={!open}
            style={{
                visibility: open ? 'visible' : 'hidden',
                pointerEvents: open ? 'auto' : 'none',
                opacity: open ? 1 : 0,
            }}
            {...inertProps(!open)}
        >
            <div className={`${HAMI_SHELL_OVERLAY_COLUMN_CLASS} relative`}>
            <header className="shrink-0 relative z-10 bg-transparent" dir="rtl">
                <div className="px-4 hami-overlay-header-safe-pad pb-2">
                    <div className="flex w-full items-center gap-2">
                        {onExitToHome ? (
                            <DossierHeaderNavButtons
                                onExit={onExitToHome}
                                showBack={false}
                                exitTestId="lawsuits-workspace-exit"
                            />
                        ) : null}
                        <div className="min-w-0 flex-1 text-center">
                            <h2 className="text-white font-extrabold text-base tracking-tight">
                                مخزن الإضابير
                            </h2>
                        </div>
                        <span className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0" aria-hidden />
                        <span className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0" aria-hidden />
                    </div>
                </div>

                <div dir="rtl" className="px-4 pb-2.5">
                    <div
                        className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-transparent p-1"
                        role="tablist"
                        aria-label="أقسام مخزن الإضابير"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'civil'}
                            data-testid={LAWSUIT_VAULT_TEST_IDS.tabCivil}
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
                            data-testid={LAWSUIT_VAULT_TEST_IDS.tabUrgent}
                            onPointerEnter={() => onUrgentTabIntent?.()}
                            onPointerDown={() => onUrgentTabIntent?.()}
                            onFocus={() => onUrgentTabIntent?.()}
                            onClick={() => selectTab('urgent')}
                            className={`min-h-[44px] rounded-xl text-xs font-bold transition-colors touch-manipulation ${
                                tab === 'urgent' ? URGENT_WORKSPACE_TAB_ACTIVE : URGENT_WORKSPACE_TAB_IDLE
                            }`}
                        >
                            مستعجل
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col min-w-0">{children(tab)}</div>

            {tab === 'civil' && addCaseFab ? (
                <div className="pointer-events-none absolute inset-0 z-[235] flex flex-col items-end justify-end pe-[max(1rem,env(safe-area-inset-right))] ps-[max(1rem,env(safe-area-inset-left))] pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))]">
                    <div className="pointer-events-auto">{addCaseFab}</div>
                </div>
            ) : null}
            </div>
        </div>
    );
}

export function LawsuitsWorkspaceTabLoading({ label }: { label: string }): React.ReactElement {
    return (
        <div className="h-full flex flex-col px-5 pt-4 pb-24" aria-busy="true">
            <div className="h-11 rounded-xl border border-white/10 bg-white/[0.04] motion-safe:animate-pulse" aria-hidden />
            <div className="mt-3 h-10 rounded-xl border border-white/10 bg-white/[0.04] motion-safe:animate-pulse" aria-hidden />
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 content-start" aria-hidden>
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-28 rounded-xl border border-white/10 bg-white/[0.04] motion-safe:animate-pulse" />
                ))}
            </div>
            <p className="sr-only">{label}</p>
        </div>
    );
}
