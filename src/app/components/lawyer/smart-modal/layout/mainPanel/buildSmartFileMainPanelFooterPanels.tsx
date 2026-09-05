import type { ReactNode } from 'react';
import { Lock } from '@/app/components/ui/icons/Lock';
import { Scale } from '@/app/components/ui/icons/Scale';
import {
    hasAbsentJudgmentNotificationRecorded,
} from '../../smartFile/absentJudgmentFlow';
import {
    hasMeritJudgmentRecorded,
    isClientWonAwaitingOpponentFinalDecision,
    isPartialBothInterestStage,
    shouldShowClientAppealPostJudgmentFooter,
    shouldShowOpponentAppealWatchPostJudgmentFooter,
} from '../../smartFile/judgmentTypes';
import type { SmartFileMainPanelProps } from './smartFileMainPanelTypes';
import type { SmartFileMainPanelFooterFlags } from './resolveSmartFileMainPanelFooterFlags';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import { JoinCoObjectorFooterControl } from './JoinCoObjectorFooterControl';
import { SMART_FILE_FOOTER_CHIP, SMART_FILE_FOOTER_CHIP_ACCENT } from './smartFileFooterChip';
import { shouldSpawnIndependentChallengeDossier } from '@/app/domain/lawsuit/independentChallengeDossier';

export type SmartFileMainPanelFooterPanelsInput = Pick<
    SmartFileMainPanelProps,
    | 'displayStage'
    | 'currentStage'
    | 'stages'
    | 'parentData'
    | 'onAbsentJudgmentNotification'
    | 'setShowAppealModal'
    | 'setShowResumeInterruptionModal'
    | 'setShowAbandonmentRenewalModal'
    | 'setShowPauseResumeModal'
    | 'handleOpenDefendantCassationAppeal'
    | 'handlePetitionVoidAppeal'
    | 'handlePetitionVoidOutcome'
    | 'handleOpponentAppealWaived'
    | 'handleReopenPleadings'
    | 'handleJoinCoObjector'
> &
    Pick<
        SmartFileMainPanelFooterFlags,
        | 'showAbsentJudgmentFooter'
        | 'showAbsentJudgmentNotificationAction'
        | 'showOpponentAppealBtnEffective'
        | 'showAppealStageFooter'
        | 'appealStageFooter'
        | 'showPetitionVoidFooter'
        | 'showPostJudgmentAppealFooter'
        | 'showFlowStatusFooter'
        | 'showFlowAbandonmentFooter'
        | 'showFlowPauseFooter'
        | 'showRemainingOpponentChallenge'
        | 'remainingOpponentChallengeLabel'
        | 'showIndependentClientChallenge'
        | 'showJoinCoObjectorFooter'
        | 'joinCoObjectorCandidates'
    >;

export type SmartFileMainPanelFooterPanels = {
    absentJudgmentFooterPanel: ReactNode;
    opponentAppealFooterPanel: ReactNode;
    appealStageFooterPanel: ReactNode;
    petitionVoidFooterPanel: ReactNode;
    postJudgmentAppealFooterPanel: ReactNode;
    flowStatusFooterPanel: ReactNode;
    remainingOpponentChallengeFooterPanel: ReactNode;
    independentClientChallengeFooterPanel: ReactNode;
    joinCoObjectorFooterPanel: ReactNode;
};

export function buildSmartFileMainPanelFooterPanels(
    input: SmartFileMainPanelFooterPanelsInput,
): SmartFileMainPanelFooterPanels {
    const {
        displayStage,
        currentStage,
        stages,
        parentData,
        onAbsentJudgmentNotification,
        setShowAppealModal,
        setShowResumeInterruptionModal,
        setShowAbandonmentRenewalModal,
        setShowPauseResumeModal,
        handleOpenDefendantCassationAppeal,
        handlePetitionVoidAppeal,
        handlePetitionVoidOutcome,
        handleReopenPleadings,
        showAbsentJudgmentFooter,
        showAbsentJudgmentNotificationAction,
        showOpponentAppealBtnEffective,
        showAppealStageFooter,
        appealStageFooter,
        showPetitionVoidFooter,
        showPostJudgmentAppealFooter,
        showFlowStatusFooter,
        showFlowAbandonmentFooter,
        showFlowPauseFooter,
        showRemainingOpponentChallenge: _showRemainingOpponentChallenge,
        remainingOpponentChallengeLabel: _remainingOpponentChallengeLabel,
        showIndependentClientChallenge: _showIndependentClientChallenge,
        showJoinCoObjectorFooter,
        joinCoObjectorCandidates,
        handleJoinCoObjector,
    } = input;
    void _showRemainingOpponentChallenge;
    void _remainingOpponentChallengeLabel;
    void _showIndependentClientChallenge;

    const petitionVoidFlow = displayStage?.petitionVoidFlow;

    const absentNotificationButton =
        showAbsentJudgmentNotificationAction && onAbsentJudgmentNotification ? (
            <button
                type="button"
                data-testid={CIVIL_LAWSUIT_TEST_IDS.absentJudgmentNotice}
                onClick={onAbsentJudgmentNotification}
                onPointerEnter={() => {
                    void import('../../modals/appealObjectionModals').catch(() => undefined);
                }}
                className="w-full min-h-[44px] rounded-xl border border-amber-400/30 bg-amber-500/12 py-3 text-[15px] font-bold text-amber-50 transition-colors hover:bg-amber-500/18"
            >
                التبليغ بالحكم الغيابي
            </button>
        ) : null;

    const opponentAppealButton = showOpponentAppealBtnEffective ? (
        <button
            type="button"
            data-testid="smart-opponent-appeal-trigger"
            onClick={() => setShowAppealModal(true)}
            onPointerEnter={() => {
                void import('../../AppealTransitionModal').catch(() => undefined);
            }}
            className="w-full min-h-[44px] rounded-xl border border-indigo-400/30 bg-indigo-500/12 py-3.5 text-[15px] font-bold text-indigo-50 transition-colors hover:bg-indigo-500/18"
        >
            {displayStage?.appealWindowLapsed ? 'قام الخصم بالتمييز' : 'قام الخصم بالطعن'}
        </button>
    ) : null;

    const absentObjectionButton = showAbsentJudgmentFooter ? (
        <button
            type="button"
            onClick={() => setShowAppealModal(true)}
            onPointerEnter={() => {
                void import('../../AppealTransitionModal').catch(() => undefined);
            }}
            className="w-full rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C]/55 py-3.5 text-base font-bold text-[#E6C673] transition-colors hover:border-[#E6C673]/45 hover:bg-[#E6C673]/[0.08]"
        >
            تسجيل طعن المدعى عليه
        </button>
    ) : null;

    const absentJudgmentFooterPanel =
        showAbsentJudgmentNotificationAction && absentNotificationButton && opponentAppealButton ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {absentNotificationButton}
                {opponentAppealButton}
            </div>
        ) : showAbsentJudgmentFooter &&
          showAbsentJudgmentNotificationAction &&
          absentNotificationButton ? (
            hasAbsentJudgmentNotificationRecorded(displayStage) ? (
                <div className="space-y-2">
                    {absentNotificationButton}
                    {absentObjectionButton}
                </div>
            ) : (
                absentNotificationButton
            )
        ) : showAbsentJudgmentFooter ? (
            hasAbsentJudgmentNotificationRecorded(displayStage) ? (
                <div className="space-y-2">{absentObjectionButton}</div>
            ) : null
        ) : showAbsentJudgmentNotificationAction ? (
            absentNotificationButton
        ) : null;

    const opponentAppealFooterPanel =
        showOpponentAppealBtnEffective &&
        !(showAbsentJudgmentNotificationAction && absentNotificationButton) ? (
            <div className="space-y-2">
                <p className="text-sm font-bold text-indigo-100/95 text-right px-0.5">
                    {displayStage?.appealWindowLapsed
                        ? 'انتهت مدة الاستئناف — يبقى طريق التمييز'
                        : 'محسومة لصالح الموكل — بانتظار طعن الخصم'}
                </p>
                {opponentAppealButton}
            </div>
        ) : null;

    const appealStageFooterPanel = showAppealStageFooter && appealStageFooter.kind ? (
        appealStageFooter.kind === 'register_opponent_cassation' ? (
            <div className="space-y-2">
                <p className="text-sm font-bold text-violet-100/95 text-right px-0.5">
                    محسومة لصالح الموكل — بانتظار تمييز الخصم
                </p>
                <button
                    type="button"
                    onClick={() => setShowAppealModal(true)}
                    onPointerEnter={() => {
                        void import('../../AppealTransitionModal').catch(() => undefined);
                    }}
                    className="w-full rounded-xl border border-violet-400/35 bg-violet-500/15 py-3.5 text-[15px] font-bold text-violet-50 transition-colors hover:bg-violet-500/22"
                >
                    قام الخصم بالتمييز
                </button>
            </div>
        ) : (
            <div className="space-y-2">
                <p className="text-sm font-bold text-[#E6C673] text-right px-0.5">
                    يحق لموكلك الطعن تمييزاً
                </p>
                <button
                    type="button"
                    onClick={handleOpenDefendantCassationAppeal}
                    onPointerEnter={() => {
                        void import('../../AppealTransitionModal').catch(() => undefined);
                    }}
                    className="w-full rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/12 py-3.5 text-[15px] font-bold text-[#E6C673] transition-colors hover:bg-[#E6C673]/18"
                >
                    الانتقال لمحكمة التمييز
                </button>
            </div>
        )
    ) : null;

    const petitionVoidFooterPanel = showPetitionVoidFooter && petitionVoidFlow ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm px-3 py-2.5">
            <div className="mb-2 text-right">
                <p className="text-[11px] font-bold text-white/80 leading-snug">
                    {petitionVoidFlow.voidLabel}
                </p>
                <p className="text-[10px] text-white/40 mt-0.5 leading-relaxed">
                    {petitionVoidFlow.status === 'registered'
                        ? 'تم تسجيل الإبطال — يحق تقديم الطعن.'
                        : petitionVoidFlow.status === 'appeal_pending'
                          ? 'طعن مُقدَّم — سجّل نتيجة محكمة الطعن.'
                          : 'نُقض الإبطال — الإضبارة حية للمرافعة.'}
                </p>
            </div>

            {petitionVoidFlow.status === 'registered' ? (
                <button
                    type="button"
                    onClick={handlePetitionVoidAppeal}
                    className="w-full py-2 rounded-lg border border-indigo-400/22 bg-indigo-500/10 text-indigo-100/90 text-[11px] font-bold hover:bg-indigo-500/15 transition-colors flex items-center justify-center gap-1.5"
                >
                    <Scale size={13} />
                    تقديم الطعن في قرار الإبطال
                </button>
            ) : null}

            {petitionVoidFlow.status === 'appeal_pending' ? (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => handlePetitionVoidOutcome('upheld')}
                        className="flex-1 py-2 rounded-lg border border-white/[0.1] bg-white/[0.04] text-white/75 text-[10px] font-bold hover:bg-white/[0.07] transition-colors leading-snug"
                    >
                        تأييد الإبطال
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePetitionVoidOutcome('quashed')}
                        className="flex-1 py-2 rounded-lg border border-emerald-400/20 bg-emerald-500/8 text-emerald-100/85 text-[10px] font-bold hover:bg-emerald-500/12 transition-colors leading-snug"
                    >
                        نقض الإبطال
                    </button>
                </div>
            ) : null}
        </div>
    ) : null;

    const representedParty = parentData.representedParty;
    const finalDecision = displayStage?.finalDecision;
    const spawnIndependent = shouldSpawnIndependentChallengeDossier({
        stages,
        sourceStage: displayStage,
        appealType: 'استئناف',
    });
    const clientAppealButton = (
        <button
            type="button"
            {...(spawnIndependent
                ? { 'data-testid': CIVIL_LAWSUIT_TEST_IDS.independentChallengeSpawn }
                : {})}
            onClick={() =>
                handleOpenDefendantCassationAppeal(
                    undefined,
                    spawnIndependent ? { forceIndependentSpawn: true } : undefined,
                )
            }
            onPointerEnter={() => {
                void import('../../AppealTransitionModal').catch(() => undefined);
            }}
            className={
                isPartialBothInterestStage(displayStage)
                    ? SMART_FILE_FOOTER_CHIP_ACCENT
                    : 'w-full rounded-xl border border-indigo-400/35 bg-indigo-500/15 py-3.5 text-[15px] font-bold text-indigo-50 transition-colors hover:bg-indigo-500/22'
            }
        >
            {spawnIndependent ? 'إنشاء طعن استئنافي مستقل' : 'تقديم طعن (استئناف / تمييز)'}
        </button>
    );

    const postJudgmentAppealFooterPanel = showPostJudgmentAppealFooter ? (
        isPartialBothInterestStage(displayStage) ? (
            <div
                className="flex flex-wrap gap-1.5 items-stretch"
                data-testid={CIVIL_LAWSUIT_TEST_IDS.postJudgmentPartialTracks}
            >
                <div className="flex-1 min-w-[7.5rem]">{clientAppealButton}</div>
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.postJudgmentOpponentChallenge}
                    onClick={() => setShowAppealModal(true)}
                    onPointerEnter={() => {
                        void import('../../AppealTransitionModal').catch(() => undefined);
                    }}
                    className={`flex-1 min-w-[7.5rem] ${SMART_FILE_FOOTER_CHIP}`}
                >
                    قام الخصم بالطعن
                </button>
            </div>
        ) : shouldShowOpponentAppealWatchPostJudgmentFooter(
            representedParty,
            finalDecision,
            displayStage,
        ) ? (
            <div className="space-y-2">
                <p className="text-sm font-bold text-indigo-100/95 text-right px-0.5">
                    محسومة لصالح الموكل — بانتظار طعن الخصم
                </p>
                <button
                    type="button"
                    onClick={() => setShowAppealModal(true)}
                    onPointerEnter={() => {
                        void import('../../AppealTransitionModal').catch(() => undefined);
                    }}
                    className="w-full rounded-xl border border-indigo-400/35 bg-indigo-500/15 py-3.5 text-[15px] font-bold text-indigo-50 transition-colors hover:bg-indigo-500/22"
                >
                    قام الخصم بالطعن
                </button>
            </div>
        ) : shouldShowClientAppealPostJudgmentFooter(
              representedParty,
              finalDecision,
              displayStage,
          ) ? (
            <div className="space-y-2">
                <p className="text-sm font-bold text-indigo-100/95 text-right px-0.5">
                    صدر قرار — يحق لموكلك الطعن
                </p>
                {clientAppealButton}
            </div>
        ) : hasMeritJudgmentRecorded(displayStage) &&
          !isClientWonAwaitingOpponentFinalDecision(finalDecision) ? (
            <div className="space-y-2">
                <p className="text-sm font-bold text-white/80 text-right px-0.5">
                    صدر قرار — انتقل لمرحلة الطعن
                </p>
                {clientAppealButton}
            </div>
        ) : hasMeritJudgmentRecorded(displayStage) ? (
            <div className="space-y-2">
                <p className="text-sm font-bold text-indigo-100/95 text-right px-0.5">
                    محسومة لصالح الموكل — بانتظار طعن الخصم
                </p>
                <button
                    type="button"
                    onClick={() => setShowAppealModal(true)}
                    onPointerEnter={() => {
                        void import('../../AppealTransitionModal').catch(() => undefined);
                    }}
                    className="w-full rounded-xl border border-indigo-400/35 bg-indigo-500/15 py-3.5 text-[15px] font-bold text-indigo-50 transition-colors hover:bg-indigo-500/22"
                >
                    قام الخصم بالطعن
                </button>
            </div>
        ) : (
            <button
                type="button"
                onClick={handleReopenPleadings}
                className="w-full rounded-xl border py-3.5 text-[15px] font-bold transition-colors border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
            >
                <span className="inline-flex items-center justify-center gap-2">
                    <Lock size={14} />
                    فك القفل لمتابعة الإجراءات
                </span>
            </button>
        )
    ) : null;

    const flowStatusFooterPanel = showFlowStatusFooter ? (
        showFlowAbandonmentFooter ? (
            <button
                type="button"
                onClick={() => setShowAbandonmentRenewalModal(true)}
                className="w-full rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C]/55 py-3.5 text-base font-bold text-[#E6C673] transition-colors hover:border-[#E6C673]/45 hover:bg-[#E6C673]/[0.08]"
            >
                فتح باب المراجعة
            </button>
        ) : showFlowPauseFooter ? (
            <button
                type="button"
                onClick={() => setShowPauseResumeModal(true)}
                className="w-full rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C]/55 py-3.5 text-base font-bold text-[#E6C673] transition-colors hover:border-[#E6C673]/45 hover:bg-[#E6C673]/[0.08]"
            >
                استئناف السير
            </button>
        ) : (
            <button
                type="button"
                onClick={() => setShowResumeInterruptionModal(true)}
                className="w-full rounded-xl border border-[#E6C673]/30 bg-[#0A0F1C]/55 py-3.5 text-base font-bold text-[#E6C673] transition-colors hover:border-[#E6C673]/45 hover:bg-[#E6C673]/[0.08]"
            >
                استئناف السير
            </button>
        )
    ) : null;

    const remainingOpponentChallengeFooterPanel = null;

    const independentClientChallengeFooterPanel = null;

    const joinCoObjectorFooterPanel = showJoinCoObjectorFooter ? (
        <JoinCoObjectorFooterControl
            candidates={joinCoObjectorCandidates}
            onJoin={handleJoinCoObjector}
        />
    ) : null;

    return {
        absentJudgmentFooterPanel,
        opponentAppealFooterPanel,
        appealStageFooterPanel,
        petitionVoidFooterPanel,
        postJudgmentAppealFooterPanel,
        flowStatusFooterPanel,
        remainingOpponentChallengeFooterPanel,
        independentClientChallengeFooterPanel,
        joinCoObjectorFooterPanel,
    };
}
