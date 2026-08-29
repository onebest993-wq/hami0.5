import type { ReactNode } from 'react';

const FOOTER_SHELL =
    'shrink-0 px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] print:hidden w-full relative z-40 border-t border-white/[0.12] bg-[#0B1021]';

export { FOOTER_SHELL };

const OPPONENT_APPEAL_BTN =
    'w-full py-2.5 min-h-[44px] rounded-md border border-white/[0.14] bg-white/[0.05] text-white/90 font-bold text-sm hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2';

type PersonalStatusStageFooterBarProps = {
    showAbsentJudgmentFooter: boolean;
    showPetitionVoidFooter: boolean;
    setShowAppealModal: (v: boolean) => void;
    absentJudgmentFooterPanel: ReactNode;
    petitionVoidFooterPanel: ReactNode;
};

export function PersonalStatusOpponentAppealPanel({ onRegister }: { onRegister: () => void }) {
    return (
        <div className="p-2">
            <p className="text-[12px] font-bold text-white/88 leading-snug text-right">
                محسومة لصالح الموكل — بانتظار طعن الخصم
            </p>
            <p className="text-[10px] text-white/45 mt-0.5 leading-relaxed text-right">
                عند تبليغك بطعن الخصم، سجّله من الزر أدناه.
            </p>
            <button type="button" onClick={onRegister} className={`${OPPONENT_APPEAL_BTN} mt-2`}>
                قام الخصم بالطعن
            </button>
        </div>
    );
}

export function PersonalStatusStageFooterBar({
    showAbsentJudgmentFooter,
    showPetitionVoidFooter,
    absentJudgmentFooterPanel,
    petitionVoidFooterPanel,
}: PersonalStatusStageFooterBarProps) {
    if (!showAbsentJudgmentFooter && !showPetitionVoidFooter) {
        return null;
    }

    return (
        <div className={FOOTER_SHELL}>
            {showPetitionVoidFooter ? petitionVoidFooterPanel : absentJudgmentFooterPanel}
        </div>
    );
}
