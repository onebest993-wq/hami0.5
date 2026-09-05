import React from 'react';
import { LAWSUIT_VAULT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/lawsuitVaultTestIds';
import { ARCHIVE_SEGMENT_BTN_ACTIVE } from '@/app/components/lawyer/ArchivePortal/archiveToolbarStyles';
import { HAMI_SHELL_OVERLAY_COLUMN_CLASS } from '@/app/utils/overlayPortal';
import { URGENT_WORKSPACE_TAB_ACTIVE } from '@/app/components/lawyer/dashboard/urgentWorkspaceChrome';
import { HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';

type LawsuitsWorkspaceInstantPaintFrameProps = {
    onExitToHome?: () => void;
    defaultTab?: 'civil' | 'urgent';
    filesHydrating?: boolean;
};

/**
 * إطار خفيف لمخزن الدعاوى على OverlayHosts — بلا ArchiveToolbar ولا InstantChrome.
 * الجذع يمنع استيراد LawsuitsWorkspaceInstantChrome على سطح MainView.
 */
export function LawsuitsWorkspaceInstantPaintFrame({
    onExitToHome,
    defaultTab = 'civil',
    filesHydrating = false,
}: LawsuitsWorkspaceInstantPaintFrameProps): React.ReactElement {
    const tab = defaultTab;

    return (
        <div
            className="fixed inset-0 z-[220] bg-[#0B1021] font-['Tajawal','Cairo',sans-serif] flex"
            data-testid={LAWSUIT_VAULT_TEST_IDS.workspace}
            data-open="false"
            data-files-hydrating={filesHydrating ? '1' : '0'}
            aria-busy="true"
            aria-label="مخزن الإضابير"
        >
            <div className={HAMI_SHELL_OVERLAY_COLUMN_CLASS}>
                <header className="shrink-0 relative z-10 bg-transparent" dir="rtl">
                    <div className="px-4 hami-overlay-header-safe-pad pb-2">
                        <div className="flex w-full items-center gap-2">
                            {onExitToHome ? (
                                <button
                                    type="button"
                                    onClick={onExitToHome}
                                    data-testid="lawsuits-workspace-exit"
                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-[#0A0F1C] text-slate-400 touch-manipulation min-h-[44px] min-w-[44px]"
                                    aria-label="المغادرة إلى الواجهة الرئيسية"
                                >
                                    <HomeXIcon size={17} strokeWidth={2} aria-hidden />
                                </button>
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
                <div className="relative flex h-full min-h-0 flex-col px-4 pt-3" aria-hidden>
                    <div className="min-h-[44px] rounded-xl border border-white/[0.09] bg-white/[0.035]" />
                    <div className="mt-2 min-h-[44px] rounded-xl border border-white/[0.09] bg-white/[0.035]" />
                    <div className="mt-2 min-h-[72px] rounded-xl border border-white/[0.09] bg-white/[0.035]" />
                </div>
            </div>
        </div>
    );
}
