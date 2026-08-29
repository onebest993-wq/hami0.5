import React from 'react';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardConstants';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_SHELL_HEIGHT_CLASS,
} from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';

const TAB_SLOT =
    'flex h-11 min-h-[44px] min-w-[4.5rem] shrink-0 rounded-xl border border-white/10 bg-white/[0.03]';
const BODY_SLOT = 'h-11 min-h-[44px] rounded-lg border border-white/8 bg-white/[0.04]';

function FollowupExitMark(): React.ReactElement {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

function closeFollowupInstant(): void {
    useExecutionDashboardStore.getState().closeModal('showUnifiedExecutionModal');
}

/**
 * توأم هندسي لهيكل محضر المتابعة الحي — بلا نبض ولا محتوى تبويب وهمي.
 * يُرسم فوراً عند النقرة حتى تُقيَّم Host/Portal.
 */
export function ExecutionFollowupInstantFrame(): React.ReactElement {
    React.useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            closeFollowupInstant();
        };
        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            closeFollowupInstant();
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
    }, []);

    return (
        <div
            className="fixed inset-0 bg-black/75 px-[max(0px,env(safe-area-inset-left))] py-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))]"
            style={{ zIndex: EXEC_MODAL_Z.unifiedFollowUp }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="execution-followup-instant-title"
            aria-busy="true"
            data-testid="execution-followup-modal"
            onClick={(e) => {
                if (e.target === e.currentTarget) closeFollowupInstant();
            }}
        >
            <div className="w-full" onClick={(e) => e.stopPropagation()}>
                <div
                    className={`relative mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0A0F1C] shadow-md ${EXEC_MODAL_SHELL_HEIGHT_CLASS}`}
                >
                    <div
                        className={`flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0A0F1C]/98 px-4 py-3 ${EXEC_MODAL_HEADER_SAFE_TOP}`}
                    >
                        <button
                            type="button"
                            data-testid="execution-followup-modal-close"
                            data-hami-dialog-close
                            onClick={(e) => {
                                e.stopPropagation();
                                closeFollowupInstant();
                            }}
                            className={`rounded-full text-slate-200/90 transition-all hover:bg-white/10 hover:text-white ${EXEC_MODAL_CLOSE_BTN_CLASS}`}
                            aria-label="إغلاق محضر المتابعة"
                        >
                            <FollowupExitMark />
                        </button>
                        <h2
                            id="execution-followup-instant-title"
                            className="text-lg font-bold tracking-wide text-amber-200"
                        >
                            محضر المتابعة
                        </h2>
                        <span className="w-9" aria-hidden />
                    </div>
                    <div
                        className="shrink-0 border-b border-white/10 bg-[#0A0F1C] px-3 py-2.5"
                        dir="rtl"
                    >
                        <div
                            role="tablist"
                            aria-label="أقسام محضر المتابعة"
                            className="flex w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-0.5"
                        >
                            <span className={TAB_SLOT} aria-hidden />
                            <span className={TAB_SLOT} aria-hidden />
                            <span className={TAB_SLOT} aria-hidden />
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden bg-[#0A0F1C] p-4 md:p-6">
                        <div className={BODY_SLOT} aria-hidden />
                        <div className={BODY_SLOT} aria-hidden />
                        <div className={BODY_SLOT} aria-hidden />
                    </div>
                </div>
            </div>
        </div>
    );
}
