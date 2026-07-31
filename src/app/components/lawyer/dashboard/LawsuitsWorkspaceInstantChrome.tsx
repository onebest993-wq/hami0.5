import React from 'react';
import { CIVIL_LAWSUIT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/civilLawsuitTestIds';
import { LawsuitsCivilArchiveInstantShell } from '@/app/components/lawyer/dashboard/LawsuitsCivilArchiveInstantShell';
import { ARCHIVE_SEGMENT_BTN_ACTIVE } from '@/app/components/lawyer/ArchivePortal/archiveToolbarStyles';
import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';

type LawsuitsWorkspaceInstantChromeProps = {
    onClose: () => void;
    onExitToHome?: () => void;
    defaultTab?: 'civil' | 'urgent';
};

/**
 * قشرة فورية مطابقة لهيكل Shell + مخزن الدعاوى.
 */
export function LawsuitsWorkspaceInstantChrome({
    onClose,
    onExitToHome,
    defaultTab = 'civil',
}: LawsuitsWorkspaceInstantChromeProps): React.ReactElement {
    const tab = defaultTab;

    return (
        <div
            className="fixed inset-0 z-[220] bg-[#0B1021] font-['Tajawal','Cairo',sans-serif] flex flex-col"
            data-testid={CIVIL_LAWSUIT_TEST_IDS.workspace}
            aria-busy="true"
            aria-label="مخزن الإضابير"
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
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.tabUrgent}
                            className={`min-h-[44px] rounded-xl text-xs font-bold ${
                                tab === 'urgent'
                                    ? 'bg-gradient-to-r from-rose-600/85 to-red-500/80 text-white border border-rose-300/25'
                                    : 'bg-transparent text-white/65'
                            }`}
                        >
                            مستعجل
                        </button>
                    </div>
                </div>
            </header>

            <div className="relative flex h-full min-h-0 flex-col">
                {tab === 'civil' ? <LawsuitsCivilArchiveInstantShell /> : null}
            </div>
        </div>
    );
}
