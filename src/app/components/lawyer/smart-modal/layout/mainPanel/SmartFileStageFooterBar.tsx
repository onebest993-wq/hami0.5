import { ArrowRightLeft, Gavel, Scale } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CaseStage } from '../../../LawyerShared';
import { isAppealStageName } from '../../smartFile/judgmentTypes';
import type { CrossAppealEligibility } from '../../smartFile/crossAppealEngine';

export type SmartFileStageFooterBarProps = {
    isViewingArchived: boolean;
    showOpponentAppealBtnEffective: boolean;
    showAbsentJudgmentFooter: boolean;
    showAppealStageFooter: boolean;
    showPetitionVoidFooter: boolean;
    displayStage: CaseStage;
    crossAppealEligibility: CrossAppealEligibility;
    setShowCrossAppealModal: (v: boolean) => void;
    petitionVoidFooterPanel: ReactNode;
    absentJudgmentFooterPanel: ReactNode;
    opponentAppealFooterPanel: ReactNode;
    appealStageFooterPanel: ReactNode;
    showPleadingCloseFooter: boolean;
    setShowJudgmentModal: (v: boolean) => void;
};

export function SmartFileStageFooterBar({
    isViewingArchived,
    showOpponentAppealBtnEffective,
    showAbsentJudgmentFooter,
    showAppealStageFooter,
    showPetitionVoidFooter,
    displayStage,
    crossAppealEligibility,
    setShowCrossAppealModal,
    petitionVoidFooterPanel,
    absentJudgmentFooterPanel,
    opponentAppealFooterPanel,
    appealStageFooterPanel,
    showPleadingCloseFooter,
    setShowJudgmentModal,
}: SmartFileStageFooterBarProps) {
    if (
        isViewingArchived &&
        !showOpponentAppealBtnEffective &&
        !showAbsentJudgmentFooter &&
        !showAppealStageFooter &&
        !showPetitionVoidFooter
    ) {
        return null;
    }

    const isCassationStage = displayStage?.stageName === 'التمييز';
    const footerPrimaryLabel = isCassationStage ? 'تحديد نتيجة القرار التمييزي' : 'ختام المرافعة';
    const FooterIcon = isCassationStage ? Gavel : Scale;

    return (
        <div className="shrink-0 px-3 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] print:hidden w-full space-y-2 relative z-20 border-t border-white/[0.06] bg-[#0F121E]/95 backdrop-blur-md sm:rounded-b-3xl">
            {isAppealStageName(displayStage?.stageName) &&
            displayStage?.appealMetadata &&
            crossAppealEligibility.showButton ? (
                <button
                    type="button"
                    onClick={() => setShowCrossAppealModal(true)}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold p-3 rounded-lg w-full shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
                >
                    <ArrowRightLeft size={20} />
                    🔄 تقديم استئناف متقابل
                </button>
            ) : null}

            {showPetitionVoidFooter ? (
                petitionVoidFooterPanel
            ) : showAbsentJudgmentFooter ? (
                absentJudgmentFooterPanel
            ) : showOpponentAppealBtnEffective ? (
                opponentAppealFooterPanel
            ) : showAppealStageFooter ? (
                appealStageFooterPanel
            ) : showPleadingCloseFooter ? (
                <button
                    type="button"
                    onClick={() => {
                        // #region debug-point A:pleadings-close-click
                        fetch('http://127.0.0.1:7778/event', {
                            method: 'POST',
                            body: JSON.stringify({
                                sessionId: 'pleadings-close-button',
                                runId: 'pre-fix',
                                hypothesisId: 'A',
                                location: 'SmartFileStageFooterBar.tsx:pleadings-close-button',
                                msg: '[DEBUG] pleadings close button clicked',
                                data: {
                                    stageName: displayStage?.stageName ?? null,
                                    isViewingArchived,
                                    showOpponentAppealBtnEffective,
                                    showAbsentJudgmentFooter,
                                    showAppealStageFooter,
                                    showPetitionVoidFooter,
                                    showPleadingCloseFooter,
                                    isPleadingsClosed: Boolean(displayStage?.isPleadingsClosed),
                                    isUnderObjection: Boolean(displayStage?.isUnderObjection),
                                },
                                ts: Date.now(),
                            }),
                        }).catch(() => {});
                        // #endregion
                        setShowJudgmentModal(true);
                    }}
                    className="group w-full py-4 rounded-2xl bg-[#0A0F1C]/40 backdrop-blur-xl border border-[#E6C673]/25 hover:border-[#E6C673]/45 hover:bg-[#E6C673]/[0.08] text-[#E6C673] font-bold text-lg shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_12px_48px_rgba(230,198,115,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all flex items-center justify-center gap-2.5"
                >
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/20 group-hover:bg-[#E6C673]/20 transition-colors">
                        <FooterIcon size={18} className="text-[#E6C673]" strokeWidth={2.25} />
                    </span>
                    {footerPrimaryLabel}
                </button>
            ) : null}
        </div>
    );
}
