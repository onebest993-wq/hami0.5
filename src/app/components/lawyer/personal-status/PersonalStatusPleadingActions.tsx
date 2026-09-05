import React from 'react';
import { Lock } from '@/app/components/ui/icons/Lock';
import { Unlock } from '@/app/components/ui/icons/Unlock';
import { cn } from '@/app/components/ui/utils';
import { PleadingCloseDecisionFlow } from '@/app/components/lawyer/smart-modal/layout/mainPanel/PleadingCloseDecisionFlow';

type PersonalStatusPleadingActionsProps = {
    isPleadingsClosed?: boolean;
    showCloseJudgment: boolean;
    onReopenPleadings?: () => void;
    /** يمرّر تاريخ القرار المختار من الشريط */
    onOpenJudgment: (decisionDate?: string) => void;
    placement?: 'inline' | 'footer';
};

const FOOTER_BTN_BASE =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-md border font-bold text-[11px] transition-colors active:scale-[0.99] touch-manipulation';

const FOOTER_REOPEN =
    `${FOOTER_BTN_BASE} border border-white/[0.14] bg-white/[0.04] text-[#ECE8E2] hover:bg-white/[0.08] hover:border-white/[0.20]`;

const LOCKED_CHIP =
    'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-md border border-white/[0.12] bg-white/[0.04] text-white/70 text-[10px] font-bold';

export function PersonalStatusPleadingActions({
    isPleadingsClosed,
    showCloseJudgment,
    onReopenPleadings,
    onOpenJudgment,
    placement = 'inline',
}: PersonalStatusPleadingActionsProps) {
    const showClose = showCloseJudgment;
    const showLocked = Boolean(isPleadingsClosed);
    const isFooter = placement === 'footer';

    if (!showClose && !showLocked) return null;

    if (isFooter) {
        if (showLocked) {
            return (
                <div
                    className="rounded-xl border border-white/[0.14] bg-[#12121C] p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full print:hidden"
                    dir="rtl"
                    data-testid="personal-status-pleading-bar"
                >
                    <span className={LOCKED_CHIP}>
                        <Lock size={12} strokeWidth={2.25} aria-hidden />
                        محجوزة للقرار
                    </span>
                    {onReopenPleadings ? (
                        <button
                            type="button"
                            onClick={onReopenPleadings}
                            className={`${FOOTER_REOPEN} w-full`}
                            title="فتح باب المرافعة مجدداً"
                        >
                            <Unlock size={14} strokeWidth={2} aria-hidden />
                            فتح المرافعة
                        </button>
                    ) : null}
                </div>
            );
        }

        if (!showClose) return null;

        return (
            <div
                className="rounded-xl border border-white/[0.14] bg-[#12121C] p-1.5 w-full print:hidden"
                dir="rtl"
                data-testid="personal-status-pleading-actions"
            >
                <PleadingCloseDecisionFlow
                    primaryLabel="ختام المرافعة"
                    showAdjournFork={false}
                    tone="personal"
                    primaryTestId="personal-status-close-pleading"
                    onOpenJudgment={(decisionDate) => onOpenJudgment(decisionDate)}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-stretch gap-2 mb-2.5 print:hidden w-full" dir="rtl">
            {showLocked ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-white/[0.1] bg-white/[0.04] text-white/60 text-[9px] font-bold">
                    <Lock size={10} aria-hidden />
                    محجوزة للقرار
                </span>
            ) : null}
            {showLocked && onReopenPleadings ? (
                <button type="button" onClick={onReopenPleadings} className={FOOTER_REOPEN}>
                    <Unlock size={12} aria-hidden />
                    فتح المرافعة
                </button>
            ) : null}
            {showClose ? (
                <div className={cn('flex-1 min-w-[12rem]')}>
                    <PleadingCloseDecisionFlow
                        primaryLabel="ختام المرافعة"
                        showAdjournFork={false}
                        tone="personal"
                        primaryTestId="personal-status-close-pleading-inline"
                        onOpenJudgment={(decisionDate) => onOpenJudgment(decisionDate)}
                    />
                </div>
            ) : null}
        </div>
    );
}
