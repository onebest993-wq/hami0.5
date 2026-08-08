import { useState } from 'react';
import { Lock, Scale } from '@/app/components/ui/lucideIcons';
import {
    formatConsolidatedChipLabel,
    readConsolidationSecondaryRefs,
} from '../../smartFile/caseConsolidationLinking';
import { readIncidentalLink, readLinkedChildIncidentalCases } from '../../smartFile/incidentalCaseLinking';
import { readCaseLinks, resolveCaseLinkBrowseUi } from '../../smartFile/caseLinking';
import { shouldShowOpponentAppealRegisterButton, isFirstInstanceStageName, isCassationStageName, isPlaintiffFavorableFinalDecision } from '../../smartFile/judgmentTypes';
import { isPlaintiffRepresentedParty } from '../../smartFile/representedPartySide';
import { isPersonalStatusCoreStage } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { isCassationCorrectionStageName } from '../../smartFile/extraordinaryAppealGateway';
import {
    daysRemainingUntil,
    hasAbsentJudgmentNotificationRecorded,
    isAwaitingAbsentJudgmentNotification,
    resolveAbsentObjectionDeadline,
    shouldShowAbsentJudgmentFooter,
    isAbsentObjectionStageName,
} from '../../smartFile/absentJudgmentFlow';
import { isAppealDeadlineExpired } from '../../smartFile/appealDeadlineEngine';
import { shouldShowFirstInstanceIncidentalUi } from '../../smartFile/appealStageTransition';
import {
    resolveAppealStageFooterEligibility,
    shouldPreferPleadingCloseFooter,
} from '../../smartFile/appealStageFooter';
import { resolveCrossAppealEligibility } from '../../smartFile/crossAppealEngine';
import {
    daysRemainingPetitionVoidRevival,
    shouldShowPetitionVoidFooterPanel,
} from '../../smartFile/petitionVoidFlow';
import { resolveDisplayParties } from '../../smartFile/resolveDisplayParties';
import {
    isRetrialPleadingStageName,
    isThirdPartyObjectionStageName,
    resolvePleadingStageLabel,
} from '../../smartFile/pleadingStageClassification';
import { pickNonemptyString } from './smartFileMainPanelUtils';
import type { SmartFileMainPanelProps } from './smartFileMainPanelTypes';
import {
    shouldShowExtraordinaryPleadingPostJudgmentUi,
    shouldShowFirstInstancePleadingLockUi,
} from '../../smartFile/stageInit';

export function useSmartFileMainPanelLayout(p: SmartFileMainPanelProps) {
    const {
        file,
        status,
        isViewingArchived,
        parentData,
        displayStage,
        displayTimeline,
        currentStage,
        stages,
        activeStageIndex,
        viewingStageIndex,
        onAbsentJudgmentNotification,
        setShowAppealModal,
        isPaused,
        isInterrupted,
        setShowResumeInterruptionModal,
        setShowAbandonmentRenewalModal,
        setShowPauseResumeModal,
        handleOpenDefendantCassationAppeal,
        handlePetitionVoidAppeal,
        handlePetitionVoidOutcome,
        handleOpponentAppealWaived,
        handleReopenPleadings,
    } = p;

    const incidentalParentLink = readIncidentalLink(file);
    const linkedChildIncidentalCases = incidentalParentLink
        ? []
        : readLinkedChildIncidentalCases(displayStage?.incidentalCases);
    const caseLinks = (() => {
        const seen = new Set<string>();
        const merged = [...readCaseLinks(file), ...(parentData.caseLinks ?? [])];
        return merged.filter((link) => {
            if (!link?.id || seen.has(link.id)) return false;
            seen.add(link.id);
            return true;
        });
    })();
    const externalCaseLinks = caseLinks.filter((l) => l.isExternal);
    const internalCaseLink = resolveCaseLinkBrowseUi(
        file,
        parentData as Record<string, unknown> | null | undefined,
        p.lawsuitFiles ?? [],
    );
    const consolidationRefs = readConsolidationSecondaryRefs(
        { ...file, consolidationSecondaryRefs: parentData.consolidationSecondaryRefs },
        displayStage,
    );
    const consolidatedSecondaryLabel = formatConsolidatedChipLabel(consolidationRefs);
    const externalConsolidationRefs = consolidationRefs.filter((r) => r.isExternal);
    const primaryCaseNo = pickNonemptyString(displayStage?.caseNo, file?.caseNo, parentData.caseNo);
    const primaryDocType = pickNonemptyString(
        displayStage?.docType,
        (displayStage as { type?: string } | undefined)?.type,
        parentData.docType,
        file?.docType,
    );
    const headerParties = resolveDisplayParties({
        displayStage,
        file,
        parentData,
        allStages: stages,
    });
    const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);
    const timelineEventCount = displayTimeline.length;
    const crossAppealEligibility = resolveCrossAppealEligibility({
        appealStage: displayStage,
        stages,
        appealStageIndex: viewingStageIndex,
    });
    const displayStageLabel = resolvePleadingStageLabel(displayStage);
    const currentStageLabel = resolvePleadingStageLabel(currentStage);
    const stageLabelForAppeal = displayStageLabel || currentStageLabel;
    const isOpponentAppealWatchStage = (() => {
        const label = String(stageLabelForAppeal ?? '').trim();
        if (!label) return false;
        if (isFirstInstanceStageName(label)) return true;
        return isPersonalStatusCoreStage(label) && !isAbsentObjectionStageName(label);
    })();
    const showOpponentAppealBtn =
        viewingStageIndex === activeStageIndex &&
        isOpponentAppealWatchStage &&
        shouldShowOpponentAppealRegisterButton(
            {
                finalDecision: displayStage?.finalDecision ?? currentStage?.finalDecision,
                isPleadingsClosed: displayStage?.isPleadingsClosed ?? currentStage?.isPleadingsClosed,
                appealDeadline: displayStage?.appealDeadline ?? currentStage?.appealDeadline,
                wasReopened: displayStage?.wasReopened ?? currentStage?.wasReopened,
                awaitingOpponentAppeal:
                    displayStage?.awaitingOpponentAppeal ?? currentStage?.awaitingOpponentAppeal,
                stageName: displayStageLabel || currentStageLabel,
                status: displayStage?.status ?? currentStage?.status,
            },
            status,
            parentData.representedParty,
        );

    const showFirstInstanceIncidentalUi = shouldShowFirstInstanceIncidentalUi(
        displayStage?.stageName,
        displayStage?.isPleadingsClosed,
    );

    const showAbsentJudgmentFooter =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        shouldShowAbsentJudgmentFooter(displayStage, stages, parentData.representedParty);

    const showOpponentAppealBtnEffective =
        showOpponentAppealBtn && !showAbsentJudgmentFooter;

    const appealStageFooter = resolveAppealStageFooterEligibility(
        displayStage,
        status,
        stages,
    );
    const preferPleadingCloseFooter = shouldPreferPleadingCloseFooter(displayStage);
    const showAppealStageFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && appealStageFooter.show
        && !preferPleadingCloseFooter
        && !showAbsentJudgmentFooter
        && !showOpponentAppealBtnEffective;

    const showPetitionVoidFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && shouldShowPetitionVoidFooterPanel(displayStage);

    const awaitingOpponentAppeal =
        viewingStageIndex === activeStageIndex &&
        isOpponentAppealWatchStage &&
        shouldShowOpponentAppealRegisterButton(
            {
                finalDecision: displayStage?.finalDecision ?? currentStage?.finalDecision,
                isPleadingsClosed: displayStage?.isPleadingsClosed ?? currentStage?.isPleadingsClosed,
                appealDeadline: displayStage?.appealDeadline ?? currentStage?.appealDeadline,
                wasReopened: displayStage?.wasReopened ?? currentStage?.wasReopened,
                awaitingOpponentAppeal:
                    displayStage?.awaitingOpponentAppeal ?? currentStage?.awaitingOpponentAppeal,
                stageName: displayStageLabel || currentStageLabel,
                status: displayStage?.status ?? currentStage?.status,
            },
            status,
            parentData.representedParty,
        );

    const showPostJudgmentAppealFooter =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        (
            shouldShowFirstInstancePleadingLockUi(displayStage)
            || shouldShowExtraordinaryPleadingPostJudgmentUi(displayStage)
        ) &&
        !isCassationStageName(displayStage?.stageName) &&
        Boolean(displayStage?.isPleadingsClosed) &&
        !showAbsentJudgmentFooter &&
        !showOpponentAppealBtnEffective &&
        !showAppealStageFooter &&
        !showPetitionVoidFooter &&
        !awaitingOpponentAppeal;

    const petitionVoidFlow = displayStage?.petitionVoidFlow;
    const petitionVoidRevivalDaysLeft =
        petitionVoidFlow?.status === 'quash_revived'
            ? daysRemainingPetitionVoidRevival(petitionVoidFlow.revivalDeadline)
            : null;

    const isNoPleadingLitigationStage =
        isCassationStageName(displayStage?.stageName)
        || isCassationCorrectionStageName(displayStage?.stageName);
    const showNoPleadingJudgmentFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && isNoPleadingLitigationStage
        && displayStage?.status === 'active';

    const showFlowInterruptionFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && !displayStage?.abandonmentDate
        && (
            Boolean(displayStage?.interruptionDate)
            || isInterrupted
            || status === 'منقطعة'
        );

    const showFlowAbandonmentFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && status === 'متروكة للمراجعة'
        && Boolean(displayStage?.abandonmentDate);

    const showFlowPauseFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && (
            isPaused
            || status === 'مستأخرة'
            || status === 'موقوفة اتفاقياً'
        );

    const isCaseFlowSuspended =
        showFlowInterruptionFooter
        || showFlowAbandonmentFooter
        || showFlowPauseFooter
        || isInterrupted
        || isPaused
        || status === 'منقطعة'
        || status === 'مستأخرة'
        || status === 'موقوفة اتفاقياً'
        || status === 'متروكة للمراجعة';

    const showFlowStatusFooter =
        showFlowInterruptionFooter || showFlowAbandonmentFooter || showFlowPauseFooter;

    const showPleadingCloseFooter =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        !showAbsentJudgmentFooter &&
        !showOpponentAppealBtnEffective &&
        !showAppealStageFooter &&
        !showPetitionVoidFooter &&
        !showFlowStatusFooter &&
        !showPostJudgmentAppealFooter &&
        !isCaseFlowSuspended &&
        (showNoPleadingJudgmentFooter
            || preferPleadingCloseFooter
            || !displayStage?.isPleadingsClosed
            || Boolean(displayStage?.isUnderObjection)
            || isAbsentObjectionStageName(displayStageLabel)
            || isThirdPartyObjectionStageName(displayStageLabel)
            || isRetrialPleadingStageName(displayStageLabel));

    const quickActionsVariant = displayStage?.isPleadingsClosed ? 'notes-only' : 'full';

    const absentObjectionDeadline = showAbsentJudgmentFooter
        ? resolveAbsentObjectionDeadline(displayStage)
        : null;
    const absentObjectionDaysLeft = absentObjectionDeadline
        ? daysRemainingUntil(absentObjectionDeadline)
        : null;

    const absentJudgmentFooterPanel = showAbsentJudgmentFooter ? (
        isAwaitingAbsentJudgmentNotification(displayStage, stages) && onAbsentJudgmentNotification ? (
            <button
                type="button"
                onClick={onAbsentJudgmentNotification}
                onPointerEnter={() => {
                    void import('../../modals/appealObjectionModals').catch(() => undefined);
                }}
                className="w-full py-3 rounded-xl border border-amber-400/25 bg-amber-500/10 text-amber-100 text-sm font-bold hover:bg-amber-500/15 transition-colors"
            >
                التبليغ بالحكم الغيابي
            </button>
        ) : hasAbsentJudgmentNotificationRecorded(displayStage) ? (
            <div className="space-y-2">
                {absentObjectionDeadline && absentObjectionDaysLeft !== null ? (
                    <p className="text-[11px] text-white/50 text-right px-0.5 tabular-nums">
                        تبليغ: {displayStage?.absentJudgmentNotificationDate}
                        {' · '}
                        {absentObjectionDaysLeft < 0
                            ? 'انتهت مهلة الاعتراض'
                            : `مهلة الاعتراض: ${absentObjectionDaysLeft} يوم`}
                    </p>
                ) : null}
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
            </div>
        ) : null
    ) : null;

    const opponentAppealDeadline =
        displayStage?.appealDeadline ?? currentStage?.appealDeadline ?? null;
    const opponentAppealDaysLeft = opponentAppealDeadline
        ? daysRemainingUntil(String(opponentAppealDeadline).slice(0, 10))
        : null;
    const opponentAppealExpired = isAppealDeadlineExpired(opponentAppealDeadline);

    const opponentAppealFooterPanel = showOpponentAppealBtnEffective ? (
        <div className="space-y-2">
            <p className="text-sm font-bold text-indigo-100/95 text-right px-0.5">
                {opponentAppealExpired
                    ? 'انتهت مهلة الاستئناف — لم يطعن الخصم'
                    : 'محسومة لصالح الموكل — بانتظار طعن الخصم'}
            </p>
            {opponentAppealDeadline && !opponentAppealExpired ? (
                <p className="text-[10px] text-indigo-200/55 text-right px-0.5 tabular-nums">
                    مهلة الاستئناف حتى {String(opponentAppealDeadline).slice(0, 10)}
                    {opponentAppealDaysLeft !== null ? ` (متبقي ${opponentAppealDaysLeft} يوم)` : ''}
                </p>
            ) : null}
            {opponentAppealExpired ? (
                <button
                    type="button"
                    onClick={handleOpponentAppealWaived}
                    className="w-full rounded-xl border border-emerald-400/35 bg-emerald-500/15 py-3.5 text-[15px] font-bold text-emerald-50 transition-colors hover:bg-emerald-500/22"
                >
                    لم يطعن الخصم بالاستئناف — تثبيت الدرجة القطعية
                </button>
            ) : (
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
            )}
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
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-xl px-3 py-2.5">
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
                {petitionVoidRevivalDaysLeft !== null ? (
                    <p
                        className={`text-[10px] font-bold mt-1 tabular-nums ${
                            petitionVoidRevivalDaysLeft < 0
                                ? 'text-rose-300/90'
                                : petitionVoidRevivalDaysLeft <= 2
                                  ? 'text-amber-300/90'
                                  : 'text-white/45'
                        }`}
                    >
                        {petitionVoidRevivalDaysLeft < 0
                            ? 'انتهت مهلة الطعن — سقوط الحق'
                            : `متبقي ${petitionVoidRevivalDaysLeft} يوم`}
                    </p>
                ) : null}
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
    const postJudgmentAppealFooterPanel = showPostJudgmentAppealFooter ? (
        isPlaintiffRepresentedParty(representedParty) && isPlaintiffFavorableFinalDecision(displayStage?.finalDecision) ? (
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
        ) : representedParty === 'المدعى عليه' &&
          isPlaintiffFavorableFinalDecision(displayStage?.finalDecision) ? (
            <button
                type="button"
                onClick={handleOpenDefendantCassationAppeal}
                onPointerEnter={() => {
                    void import('../../AppealTransitionModal').catch(() => undefined);
                }}
                className="w-full rounded-xl border border-indigo-400/35 bg-indigo-500/15 py-3.5 text-[15px] font-bold text-indigo-50 transition-colors hover:bg-indigo-500/22"
            >
                <span className="inline-flex items-center justify-center gap-2">
                    <Scale size={16} />
                    تقديم طعن (استئناف / تمييز)
                </span>
            </button>
        ) : (
            <button
                type="button"
                onClick={handleReopenPleadings}
                onPointerEnter={() => {
                    void import('../../AppealTransitionModal').catch(() => undefined);
                }}
                className={`w-full rounded-xl border py-3.5 text-[15px] font-bold transition-colors ${
                    representedParty === 'المدعى عليه'
                        ? 'border-indigo-400/35 bg-indigo-500/15 text-indigo-50 hover:bg-indigo-500/22'
                        : 'border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white'
                }`}
            >
                <span className="inline-flex items-center justify-center gap-2">
                    {representedParty === 'المدعى عليه' ? (
                        <>
                            <Scale size={16} />
                            تقديم طعن (استئناف / تمييز)
                        </>
                    ) : (
                        <>
                            <Lock size={14} />
                            فك القفل لمتابعة الإجراءات
                        </>
                    )}
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

    return {
        incidentalParentLink,
        linkedChildIncidentalCases,
        externalCaseLinks,
        internalCaseLink,
        consolidatedSecondaryLabel,
        externalConsolidationRefs,
        primaryCaseNo,
        primaryDocType,
        headerParties,
        isTimelineExpanded,
        setIsTimelineExpanded,
        timelineEventCount,
        crossAppealEligibility,
        showOpponentAppealBtn,
        showFirstInstanceIncidentalUi,
        showAbsentJudgmentFooter,
        showOpponentAppealBtnEffective,
        showPostJudgmentAppealFooter,
        appealStageFooter,
        showAppealStageFooter,
        showPetitionVoidFooter,
        showPleadingCloseFooter,
        showFlowStatusFooter,
        quickActionsVariant,
        absentJudgmentFooterPanel,
        opponentAppealFooterPanel,
        appealStageFooterPanel,
        petitionVoidFooterPanel,
        postJudgmentAppealFooterPanel,
        flowStatusFooterPanel,
    };
}
