import React from 'react';
import { Lock, Scale, Unlock } from '@/app/components/ui/lucideIcons';
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
    'inline-flex items-center justify-center gap-2 min-h-[48px] px-3 rounded-xl border font-bold text-[11px] transition-all active:scale-[0.99] touch-manipulation';

const FOOTER_RESERVE =
    `${FOOTER_BTN_BASE} border-white/[0.14] bg-white/[0.04] text-[#ECE8E2] hover:bg-white/[0.08] hover:border-white/[0.20]`;

const FOOTER_CLOSE =
    `${FOOTER_BTN_BASE} border-[#F0A8B4]/32 bg-gradient-to-br from-[#F5C6D0]/[0.18] to-[#E8B4BC]/[0.08] text-[#FFFEF9] shadow-[inset_0_1px_0_rgba(255,220,228,0.22)] hover:border-[#F0A8B4]/44 hover:from-[#F5C6D0]/[0.24]`;

const LOCKED_CHIP =
    'inline-flex items-center justify-center gap-1.5 min-h-[48px] px-3 rounded-xl border border-[#F0A8B4]/24 bg-[#F5C6D0]/[0.08] text-[#FFD4DC] text-[10px] font-bold';

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full print:hidden" dir="rtl">
                    <span className={LOCKED_CHIP}>
                        <Lock size={12} strokeWidth={2.25} aria-hidden />
                        محجوزة للقرار
                    </span>
                    {onReopenPleadings ? (
                        <button
                            type="button"
                            onClick={onReopenPleadings}
                            className={FOOTER_RESERVE}
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
                    'grid gap-2 w-full print:hidden',
                    showReserve && showClose ? 'grid-cols-2' : 'grid-cols-1',
                )}
                dir="rtl"
                data-testid="personal-status-pleading-actions"
            >
                {showReserve ? (
                    <button
                        type="button"
                        onClick={onClosePleadings}
                        className={FOOTER_RESERVE}
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
                        className={FOOTER_CLOSE}
                        title="ختام المرافعة وإدخال قرار القاضي"
                    >
                        <Scale size={15} className="text-[#FFD4DC]" strokeWidth={2.1} aria-hidden />
                        ختام المرافعة
                    </button>
                ) : null}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-stretch gap-2 mb-2.5 print:hidden w-full" dir="rtl">
            {showLocked ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#F0A8B4]/28 bg-[#F5C6D0]/[0.12] text-[#FFD4DC] text-[9px] font-bold">
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
