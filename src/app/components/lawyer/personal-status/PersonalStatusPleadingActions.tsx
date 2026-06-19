import React from 'react';
import { Lock, Scale, Unlock } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

type PersonalStatusPleadingActionsProps = {
    isPleadingsClosed?: boolean;
    /** إظهار زر ختام المرافعة */
    showCloseJudgment: boolean;
    onClosePleadings?: () => void;
    onReopenPleadings?: () => void;
    onOpenJudgment: () => void;
    /** footer = شريط سفلي ثابت */
    placement?: 'inline' | 'footer';
};

const RESERVE_BTN =
    'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#F0A8B4]/28 bg-gradient-to-br from-[#F5C6D0]/[0.16] to-[#E8B4BC]/[0.08] text-[#FFE8EC] text-[10px] font-bold backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,220,228,0.28),0_4px_14px_rgba(240,168,180,0.10)] hover:from-[#F5C6D0]/[0.22] hover:border-[#F0A8B4]/40 hover:text-white active:scale-[0.98] transition-all shrink-0';

const CLOSE_BTN =
    'flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-[#F0A8B4]/28 bg-gradient-to-br from-[#F5C6D0]/[0.16] via-white/[0.08] to-[#E8B4BC]/[0.08] backdrop-blur-xl text-[#FFFEF9] text-[11px] font-bold shadow-[0_8px_28px_rgba(240,168,180,0.14),inset_0_1px_0_rgba(255,220,228,0.24)] hover:border-[#F0A8B4]/42 hover:from-[#F5C6D0]/[0.22] active:scale-[0.99] transition-all';

const LOCKED_CHIP =
    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#F0A8B4]/28 bg-[#F5C6D0]/[0.12] text-[#FFD4DC] text-[9px] font-bold backdrop-blur-sm';

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

    return (
        <div
            className={cn(
                'flex flex-wrap items-stretch gap-2 print:hidden w-full',
                isFooter ? 'gap-2.5' : 'mb-2.5',
            )}
            dir="rtl"
            data-testid="personal-status-pleading-actions"
        >
            {showLocked ? (
                <span className={LOCKED_CHIP}>
                    <Lock size={10} strokeWidth={2.25} aria-hidden />
                    محجوزة للقرار
                </span>
            ) : null}

            {showLocked && onReopenPleadings ? (
                <button
                    type="button"
                    onClick={onReopenPleadings}
                    className={cn(RESERVE_BTN, 'py-1.5')}
                    title="فتح باب المرافعة مجدداً"
                >
                    <Unlock size={12} strokeWidth={2} aria-hidden />
                    فتح المرافعة
                </button>
            ) : null}

            {showReserve ? (
                <button
                    type="button"
                    onClick={onClosePleadings}
                    className={RESERVE_BTN}
                    title="حجز الدعوى للقرار"
                >
                    <Lock size={12} strokeWidth={2} aria-hidden />
                    حجز للقرار
                </button>
            ) : null}

            {showClose ? (
                <button
                    type="button"
                    onClick={onOpenJudgment}
                    className={cn(
                        CLOSE_BTN,
                        isFooter && 'flex-1 min-w-[10rem] py-3 text-xs',
                        !showReserve && !showLocked && 'w-full',
                    )}
                    title="ختام المرافعة وإدخال قرار القاضي"
                >
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#F5C6D0]/[0.14] border border-[#F0A8B4]/22 shrink-0">
                        <Scale size={14} className="text-[#FFD4DC]" strokeWidth={2.1} aria-hidden />
                    </span>
                    ختام المرافعة
                </button>
            ) : null}
        </div>
    );
}
