import React from 'react';
import { LAWSUIT_VAULT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/lawsuitVaultTestIds';
import { LawsuitsCivilArchiveInstantShell } from '@/app/components/lawyer/dashboard/LawsuitsCivilArchiveInstantShell';
import { ARCHIVE_SEGMENT_BTN_ACTIVE } from '@/app/components/lawyer/ArchivePortal/archiveToolbarStyles';
import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';
import { HAMI_SHELL_OVERLAY_COLUMN_CLASS } from '@/app/utils/overlayPortal';
import { URGENT_WORKSPACE_TAB_ACTIVE } from '@/app/components/lawyer/dashboard/urgentWorkspaceChrome';

type LawsuitsWorkspaceInstantChromeProps = {
    onExitToHome?: () => void;
    defaultTab?: 'civil' | 'urgent';
    filesHydrating?: boolean;
};

/**
 * قشرة فورية مطابقة لهيكل Shell + مخزن الدعاوى.
 * لا تسجّل Escape/رجوع هنا — Host/Shell يملكان ذلك بعد التركيب؛
 * التسجيل أثناء Suspense كان يغلق المساحة قبل اكتمال التحميل (E2E).
 */
export function LawsuitsWorkspaceInstantChrome({
    onExitToHome,
    defaultTab = 'civil',
    filesHydrating = false,
}: LawsuitsWorkspaceInstantChromeProps): React.ReactElement {
    const tab = defaultTab;

    return (
        <div
            className="fixed inset-0 z-[220] bg-[#0B1021] font-['Tajawal','Cairo',sans-serif] flex"
            data-testid={LAWSUIT_VAULT_TEST_IDS.workspace}
            data-open="false"
            aria-busy="true"
            aria-label="مخزن الإضابير"
        >
            <div className={HAMI_SHELL_OVERLAY_COLUMN_CLASS}>
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
                            className={`min-h-[44px] rounded-xl text-xs font-bold ${
                                tab === 'civil' ? ARCHIVE_SEGMENT_BTN_ACTIVE : 'bg-transparent text-white/65'
                            }`}
                        >
                            الدعاوى
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'urgent'}
                            data-testid={LAWSUIT_VAULT_TEST_IDS.tabUrgent}
                            className={`min-h-[44px] rounded-xl text-xs font-bold ${
                                tab === 'urgent' ? URGENT_WORKSPACE_TAB_ACTIVE : 'bg-transparent text-white/65'
                            }`}
                        >
                            مستعجل
                        </button>
                    </div>
                </div>
            </header>

            <div className="relative flex h-full min-h-0 flex-col">
                {tab === 'civil' ? (
                    <LawsuitsCivilArchiveInstantShell filesHydrating={filesHydrating} />
                ) : null}
            </div>
            </div>
        </div>
    );
}
