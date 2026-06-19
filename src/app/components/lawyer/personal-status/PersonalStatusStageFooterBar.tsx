import type { ReactNode } from 'react';
import { Clock, Scale } from 'lucide-react';

const FOOTER_SHELL =
    'shrink-0 px-2.5 sm:px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden w-full space-y-2 relative z-40 border-t border-[#F0A8B4]/22 bg-[#101018]/97 backdrop-blur-xl shadow-[0_-10px_40px_rgba(240,168,180,0.12)]';

const OPPONENT_APPEAL_BTN =
    'group w-full py-3.5 rounded-xl bg-gradient-to-l from-[#F5C6D0]/[0.20] via-[#FFD4DC]/[0.10] to-white/[0.05] backdrop-blur-md border border-[#F0A8B4]/32 text-[#FFFEF9] font-bold text-sm shadow-[0_8px_28px_rgba(240,168,180,0.18),inset_0_1px_0_rgba(255,220,228,0.22)] hover:border-[#F0A8B4]/45 hover:from-[#F5C6D0]/[0.26] transition-all flex items-center justify-center gap-2.5';

export type PersonalStatusStageFooterBarProps = {
    showAbsentJudgmentFooter: boolean;
    showPetitionVoidFooter: boolean;
    setShowAppealModal: (v: boolean) => void;
    absentJudgmentFooterPanel: ReactNode;
    petitionVoidFooterPanel: ReactNode;
};

export function PersonalStatusOpponentAppealPanel({ onRegister }: { onRegister: () => void }) {
    return (
        <div className="rounded-2xl border border-[#F0A8B4]/22 bg-gradient-to-br from-[#F5C6D0]/[0.10] via-white/[0.04] to-[#ECE8E2]/[0.03] backdrop-blur-xl p-4 shadow-[inset_0_1px_0_rgba(255,220,228,0.16)]">
            <div className="flex items-start gap-3 mb-3.5">
                <div className="shrink-0 w-10 h-10 rounded-xl border border-[#F0A8B4]/28 bg-gradient-to-br from-[#F5C6D0]/[0.14] to-white/[0.05] flex items-center justify-center">
                    <Clock size={17} className="text-[#FFD4DC]" strokeWidth={2} />
                </div>
                <div className="min-w-0 text-right">
                    <p className="text-sm font-bold text-[#FFFEF9] leading-snug">
                        محسومة لصالح الموكل — بانتظار طعن الخصم
                    </p>
                    <p className="text-[11px] text-[#9894A0] mt-1 leading-relaxed">
                        الإضبارة مقفولة. عند تبليغك بطعن الخصم، سجّله من الزر أدناه.
                    </p>
                </div>
            </div>
            <button type="button" onClick={onRegister} className={OPPONENT_APPEAL_BTN}>
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.08] border border-white/[0.14] group-hover:bg-white/[0.12] transition-colors">
                    <Scale size={16} strokeWidth={2.25} />
                </span>
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
