import React from 'react';
import { Lock } from '@/app/components/ui/icons/Lock';
import { Scale } from '@/app/components/ui/icons/Scale';
import { Unlock } from '@/app/components/ui/icons/Unlock';
import { cn } from '@/app/components/ui/utils';

type PersonalStatusPleadingActionsProps = {
    isPleadingsClosed?: boolean;
    showCloseJudgment: boolean;
    onClosePleadings?: () => void;
    onReopenPleadings?: () => void;
    onOpenJudgment: () => void;
    placement?: 'inline' | 'footer';
};

const FOOTER_BTN_BASE =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-md border font-bold text-[11px] transition-colors active:scale-[0.99] touch-manipulation';

const FOOTER_RESERVE =
    `${FOOTER_BTN_BASE} border-white/[0.14] bg-white/[0.04] text-[#ECE8E2] hover:bg-white/[0.08] hover:border-white/[0.20]`;

const FOOTER_CLOSE =
    `${FOOTER_BTN_BASE} border-white/[0.16] bg-white/[0.08] text-white/90 hover:bg-white/[0.12]`;

const LOCKED_CHIP =
    'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-md border border-white/[0.12] bg-white/[0.04] text-white/70 text-[10px] font-bold';

export function PersonalStatusPleadingActions({
    isPleadingsClosed,
    showCloseJudgment,
    onClosePleadings,
    onReopenPleadings,
    onOpenJudgment,
    placement = 'inline',
}: PersonalStatusPleadingActionsProps) {
    const showReserve = !isPleadingsClosed && Boolean(onClosePleadings);
    const showClose = showCloseJudgment;
    const showLocked = Boolean(isPleadingsClosed);

    if (!showReserve && !showClose && !showLocked) return null;

    const isFooter = placement === 'footer';

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
                            className={`${FOOTER_RESERVE} w-full`}
                            title="فتح باب المرافعة مجدداً"
                        >
                            <Unlock size={14} strokeWidth={2} aria-hidden />
                            فتح المرافعة
                        </button>
                    ) : null}
                </div>
            );
        }

        return (
            <div
                className={cn(
                    'rounded-xl border border-white/[0.14] bg-[#12121C] p-1.5 grid gap-1.5 w-full print:hidden',
                    showReserve && showClose ? 'grid-cols-2' : 'grid-cols-1',
                )}
                dir="rtl"
                data-testid="personal-status-pleading-actions"
            >
                {showReserve ? (
                    <button
                        type="button"
                        onClick={onClosePleadings}
                        className={`${FOOTER_RESERVE} w-full`}
                        title="حجز الدعوى للقرار"
                    >
                        <Lock size={14} strokeWidth={2} aria-hidden />
                        حجز للقرار
                    </button>
                ) : null}
                {showClose ? (
                    <button
                        type="button"
                        onClick={onOpenJudgment}
                        className={`${FOOTER_CLOSE} w-full`}
                        title="ختام المرافعة وإدخال قرار القاضي"
                    >
                        <Scale size={15} className="text-white/70" strokeWidth={2.1} aria-hidden />
                        ختام المرافعة
                    </button>
                ) : null}
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
                <button type="button" onClick={onReopenPleadings} className={FOOTER_RESERVE}>
                    <Unlock size={12} aria-hidden />
                    فتح المرافعة
                </button>
            ) : null}
            {showReserve ? (
                <button type="button" onClick={onClosePleadings} className={FOOTER_RESERVE}>
                    <Lock size={12} aria-hidden />
                    حجز للقرار
                </button>
            ) : null}
            {showClose ? (
                <button type="button" onClick={onOpenJudgment} className={cn(FOOTER_CLOSE, 'flex-1')}>
                    <Scale size={14} aria-hidden />
                    ختام المرافعة
                </button>
            ) : null}
        </div>
    );
}
