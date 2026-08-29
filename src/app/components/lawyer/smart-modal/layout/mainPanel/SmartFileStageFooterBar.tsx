import type { ReactNode } from 'react';
import type { CaseStage } from '../../../LawyerShared';
import { isAppealStageName, isCassationStageName } from '../../smartFile/judgmentTypes';
import { isCassationCorrectionStageName } from '../../smartFile/extraordinaryAppealGateway';
import type { CrossAppealEligibility } from '../../smartFile/crossAppealEngine';

export type SmartFileStageFooterBarProps = {
    isViewingArchived: boolean;
    showOpponentAppealBtnEffective: boolean;
    showAbsentJudgmentFooter: boolean;
    showPostJudgmentAppealFooter: boolean;
    showAppealStageFooter: boolean;
    showPetitionVoidFooter: boolean;
    displayStage: CaseStage;
    crossAppealEligibility: CrossAppealEligibility;
    setShowCrossAppealModal: (v: boolean) => void;
    petitionVoidFooterPanel: ReactNode;
    absentJudgmentFooterPanel: ReactNode;
    opponentAppealFooterPanel: ReactNode;
    appealStageFooterPanel: ReactNode;
    postJudgmentAppealFooterPanel: ReactNode;
    showPleadingCloseFooter: boolean;
    showFlowStatusFooter: boolean;
    setShowJudgmentModal: (v: boolean) => void;
    flowStatusFooterPanel: ReactNode;
};

export function SmartFileStageFooterBar({
    isViewingArchived,
    showOpponentAppealBtnEffective,
    showAbsentJudgmentFooter,
    showPostJudgmentAppealFooter,
    showAppealStageFooter,
    showPetitionVoidFooter,
    displayStage,
    crossAppealEligibility,
    setShowCrossAppealModal,
    petitionVoidFooterPanel,
    absentJudgmentFooterPanel,
    opponentAppealFooterPanel,
    appealStageFooterPanel,
    postJudgmentAppealFooterPanel,
    showPleadingCloseFooter,
    showFlowStatusFooter,
    setShowJudgmentModal,
    flowStatusFooterPanel,
}: SmartFileStageFooterBarProps) {
    if (
        isViewingArchived &&
        !showOpponentAppealBtnEffective &&
        !showAbsentJudgmentFooter &&
        !showPostJudgmentAppealFooter &&
        !showAppealStageFooter &&
        !showPetitionVoidFooter
    ) {
        return null;
    }

    const isCorrectionStage = isCassationCorrectionStageName(displayStage?.stageName);
    const isCassationStage = isCassationStageName(displayStage?.stageName);
    const footerPrimaryLabel = isCorrectionStage
        ? 'تحديد نتيجة طلب التصحيح'
        : isCassationStage
          ? 'تحديد نتيجة القرار التمييزي'
          : 'ختام المرافعة';

    const prefetchJudgment = () => {
        void import('../../SmartJudgmentModal').catch(() => undefined);
    };
    const prefetchAppeal = () => {
        void import('../../AppealTransitionModal').catch(() => undefined);
    };
    const prefetchCrossAppeal = () => {
        void import('../../CrossAppealModal').catch(() => undefined);
    };

    return (
        <div className="shrink-0 px-3 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] print:hidden w-full relative z-20 border-t border-white/[0.06] bg-[#0F121E] sm:rounded-b-3xl">
            {isAppealStageName(displayStage?.stageName) &&
            displayStage?.appealMetadata &&
            crossAppealEligibility.showButton ? (
                <button
                    type="button"
                    onPointerEnter={prefetchCrossAppeal}
                    onFocus={prefetchCrossAppeal}
                    onClick={() => {
                        prefetchCrossAppeal();
                        setShowCrossAppealModal(true);
                    }}
                    className="mb-2 w-full rounded-xl border border-teal-400/30 bg-teal-600/90 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-500"
                >
                    تقديم استئناف متقابل
                </button>
            ) : null}

            {showPetitionVoidFooter ? (
                petitionVoidFooterPanel
            ) : showAbsentJudgmentFooter ? (
                absentJudgmentFooterPanel
            ) : showOpponentAppealBtnEffective ? (
                <div onPointerEnter={prefetchAppeal}>{opponentAppealFooterPanel}</div>
            ) : showAppealStageFooter ? (
                <div onPointerEnter={prefetchAppeal}>{appealStageFooterPanel}</div>
            ) : showPostJudgmentAppealFooter ? (
                <div onPointerEnter={prefetchAppeal}>{postJudgmentAppealFooterPanel}</div>
            ) : showFlowStatusFooter ? (
                flowStatusFooterPanel
            ) : showPleadingCloseFooter ? (
                <button
                    type="button"
                    onPointerEnter={prefetchJudgment}
                    onFocus={prefetchJudgment}
                    onClick={() => {
                        prefetchJudgment();
                        setShowJudgmentModal(true);
                    }}
                    className="w-full rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C]/55 py-3.5 text-base font-bold text-[#E6C673] transition-colors hover:border-[#E6C673]/45 hover:bg-[#E6C673]/[0.08]"
                >
                    {footerPrimaryLabel}
                </button>
            ) : null}
        </div>
    );
}
