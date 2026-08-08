import React from 'react';
import { ArrowRight } from '@/app/components/ui/lucideIcons';
import { HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';

const navBtnClass =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-hami-navy/45 text-slate-400 backdrop-blur-md transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] touch-manipulation min-h-[44px] min-w-[44px]';

export type DossierHeaderNavButtonsProps = {
    onBack?: () => void;
    onExit: () => void;
    showBack?: boolean;
    showExit?: boolean;
    backTestId?: string;
    exitTestId?: string;
    /** أصغر للبطاقات */
    compact?: boolean;
};

/** زرّ رجوع تدريجي + زرّ مغادرة — موحّد لإضابير الدعاوى والتنفيذ */
export function DossierHeaderNavButtons({
    onBack,
    onExit,
    showBack = true,
    showExit = true,
    backTestId = 'dossier-nav-back',
    exitTestId = 'dossier-nav-exit',
    compact = false,
}: DossierHeaderNavButtonsProps) {
    const sizeClass = compact ? 'h-8 w-8 min-h-[36px] min-w-[36px]' : '';

    return (
        <div className="flex items-center gap-1">
            {showBack && onBack ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onBack();
                    }}
                    data-testid={backTestId}
                    className={`${navBtnClass} ${sizeClass} hover:border-amber-400/25 hover:bg-amber-500/10 hover:text-amber-100`}
                    aria-label="رجوع"
                    title="رجوع"
                >
                    <ArrowRight size={compact ? 15 : 17} strokeWidth={2} aria-hidden />
                </button>
            ) : null}
            {showExit ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onExit();
                    }}
                    data-testid={exitTestId}
                    className={`${navBtnClass} ${sizeClass} hover:border-rose-400/25 hover:bg-rose-500/10 hover:text-rose-200`}
                    aria-label="المغادرة إلى الواجهة الرئيسية"
                    title="المغادرة إلى الواجهة الرئيسية"
                >
                    <HomeXIcon size={compact ? 15 : 17} strokeWidth={2} aria-hidden />
                </button>
            ) : null}
        </div>
    );
}
