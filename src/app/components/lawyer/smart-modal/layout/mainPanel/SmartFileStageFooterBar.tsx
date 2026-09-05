import type { ReactNode } from 'react';
import type { CaseStage } from '../../../LawyerShared';
import { isAppealStageName, isCassationStageName } from '../../smartFile/judgmentTypes';
import { isAbsentObjectionStageName } from '../../smartFile/absentJudgmentStageNames';
import { isCassationCorrectionStageName } from '../../smartFile/extraordinaryAppealGateway';
import type { CrossAppealEligibility } from '../../smartFile/crossAppealEngine';
import { SmartFilePleadingFooterActions } from './SmartFilePleadingFooterActions';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import {
    ART172_RESUME_LABEL,
    ART172_STAY_TEACHING_HINT,
    isArt172AppealStayActive,
} from '../../smartFile/art172AppealStay';

export type SmartFileStageFooterBarProps = {
    isViewingArchived: boolean;
    showOpponentAppealBtnEffective: boolean;
    showAbsentJudgmentFooter: boolean;
    showAbsentJudgmentNotificationAction?: boolean;
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
    showArt172StayFooter?: boolean;
    showArt172ResumeFooter?: boolean;
    onArt172Stay?: () => void;
    onArt172Resume?: () => void;
    showRemainingOpponentChallenge?: boolean;
    remainingOpponentChallengeFooterPanel?: ReactNode;
    showIndependentClientChallenge?: boolean;
    independentClientChallengeFooterPanel?: ReactNode;
    showJoinCoObjectorFooter?: boolean;
    joinCoObjectorFooterPanel?: ReactNode;
    showFlowStatusFooter: boolean;
    setShowJudgmentModal: (v: boolean) => void;
    setShowAdjournPleadingModal: (v: boolean) => void;
    setPendingJudgmentDate?: (date: string) => void;
    flowStatusFooterPanel: ReactNode;
};

export function SmartFileStageFooterBar({
    isViewingArchived,
    showOpponentAppealBtnEffective,
    showAbsentJudgmentFooter,
    showAbsentJudgmentNotificationAction = false,
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
    showArt172StayFooter = false,
    showArt172ResumeFooter = false,
    onArt172Stay,
    onArt172Resume,
    showRemainingOpponentChallenge = false,
    remainingOpponentChallengeFooterPanel = null,
    showIndependentClientChallenge = false,
    independentClientChallengeFooterPanel = null,
    showJoinCoObjectorFooter = false,
    joinCoObjectorFooterPanel = null,
    showFlowStatusFooter,
    setShowJudgmentModal,
    setShowAdjournPleadingModal,
    setPendingJudgmentDate,
    flowStatusFooterPanel,
}: SmartFileStageFooterBarProps) {
    if (
        isViewingArchived &&
        !showOpponentAppealBtnEffective &&
        !showAbsentJudgmentFooter &&
        !showAbsentJudgmentNotificationAction &&
        !showPostJudgmentAppealFooter &&
        !showAppealStageFooter &&
        !showPetitionVoidFooter &&
        !showArt172StayFooter &&
        !showArt172ResumeFooter &&
        !showRemainingOpponentChallenge &&
        !showIndependentClientChallenge &&
        !showJoinCoObjectorFooter
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

    const showNotifyBesideOpponent =
        Boolean(absentJudgmentFooterPanel) &&
        (showAbsentJudgmentNotificationAction || showAbsentJudgmentFooter) &&
        showOpponentAppealBtnEffective &&
        !opponentAppealFooterPanel;

    const stackRemainingOnChallenge =
        showRemainingOpponentChallenge
        || showIndependentClientChallenge
        || showArt172StayFooter
        || (
            showAbsentJudgmentNotificationAction
            && (
                isAppealStageName(displayStage?.stageName)
                || isAbsentObjectionStageName(displayStage?.stageName)
            )
        );

    return (
        <div className="shrink-0 px-3 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] print:hidden w-full relative z-20 border-t border-white/[0.06] bg-[#0F121E]">
            {showPetitionVoidFooter ? (
                petitionVoidFooterPanel
            ) : (showNotifyBesideOpponent || showAbsentJudgmentFooter || showAbsentJudgmentNotificationAction)
                && !stackRemainingOnChallenge ? (
                <div onPointerEnter={prefetchAppeal}>{absentJudgmentFooterPanel}</div>
            ) : showOpponentAppealBtnEffective ? (
                <div onPointerEnter={prefetchAppeal}>{opponentAppealFooterPanel}</div>
            ) : showAppealStageFooter ? (
                <div onPointerEnter={prefetchAppeal}>{appealStageFooterPanel}</div>
            ) : showPostJudgmentAppealFooter ? (
                <div onPointerEnter={prefetchAppeal}>{postJudgmentAppealFooterPanel}</div>
            ) : showArt172ResumeFooter && onArt172Resume ? (
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.art172Resume}
                    onClick={onArt172Resume}
                    className="w-full min-h-[44px] rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C]/55 py-3.5 text-base font-bold text-[#E6C673] transition-colors hover:border-[#E6C673]/45 hover:bg-[#E6C673]/[0.08]"
                >
                    {ART172_RESUME_LABEL}
                </button>
            ) : showFlowStatusFooter ? (
                flowStatusFooterPanel
            ) : showPleadingCloseFooter || stackRemainingOnChallenge ? (
                <div className="flex flex-wrap gap-1.5 items-stretch">
                    {showArt172StayFooter ? (
                        <button
                            type="button"
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.art172StayHint}
                            onClick={onArt172Stay}
                            className="basis-full min-h-[44px] rounded-xl border border-amber-500/28 bg-amber-500/[0.07] px-3 py-2.5 text-[13px] font-bold text-amber-100/90 transition-colors hover:border-amber-400/40 hover:bg-amber-500/[0.11] touch-manipulation flex items-center justify-center gap-2"
                            aria-label={ART172_STAY_TEACHING_HINT}
                            title={ART172_STAY_TEACHING_HINT}
                        >
                            <span
                                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-400/45 bg-amber-500/20 text-[11px] font-black leading-none"
                                aria-hidden
                            >
                                !
                            </span>
                            <span className="min-w-0 text-center">{ART172_STAY_TEACHING_HINT}</span>
                        </button>
                    ) : null}
                    {stackRemainingOnChallenge && showAbsentJudgmentNotificationAction
                        ? <div className="basis-full">{absentJudgmentFooterPanel}</div>
                        : null}
                    {showIndependentClientChallenge
                        ? <div className="flex-1 min-w-[7.5rem]">{independentClientChallengeFooterPanel}</div>
                        : null}
                    {showRemainingOpponentChallenge
                        ? <div className="flex-1 min-w-[7.5rem]">{remainingOpponentChallengeFooterPanel}</div>
                        : null}
                    {showPleadingCloseFooter ? (
                        <div className="flex-1 min-w-[7.5rem] contents">
                            <SmartFilePleadingFooterActions
                                displayStage={displayStage}
                                footerPrimaryLabel={footerPrimaryLabel}
                                compactRow
                                onAdjournPleading={() => setShowAdjournPleadingModal(true)}
                                onOpenJudgment={(decisionDate) => {
                                    setPendingJudgmentDate?.(decisionDate);
                                    prefetchJudgment();
                                    setShowJudgmentModal(true);
                                }}
                            />
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
