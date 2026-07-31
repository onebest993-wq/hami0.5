import { useState } from 'react';
import { Scale } from 'lucide-react';
import {
    formatConsolidatedChipLabel,
    readConsolidationSecondaryRefs,
} from '../../smartFile/caseConsolidationLinking';
import { readIncidentalLink, readLinkedChildIncidentalCases } from '../../smartFile/incidentalCaseLinking';
import { readCaseLinks } from '../../smartFile/caseLinking';
import { shouldShowOpponentAppealRegisterButton, isFirstInstanceStageName, isCassationStageName } from '../../smartFile/judgmentTypes';
import { isCassationCorrectionStageName } from '../../smartFile/extraordinaryAppealGateway';
import {
    daysRemainingUntil,
    hasAbsentJudgmentNotificationRecorded,
    isAwaitingAbsentJudgmentNotification,
    resolveAbsentObjectionDeadline,
    shouldShowAbsentJudgmentFooter,
    isAbsentObjectionStageName,
} from '../../smartFile/absentJudgmentFlow';
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
import { pickNonemptyString } from './smartFileMainPanelUtils';
import type { SmartFileMainPanelProps } from './smartFileMainPanelTypes';

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
        handleOpenDefendantCassationAppeal,
        handlePetitionVoidAppeal,
        handlePetitionVoidOutcome,
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
    const internalCaseLink = caseLinks.find((l) => !l.isExternal && l.peerFileId);
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
    const showOpponentAppealBtn =
        viewingStageIndex === activeStageIndex &&
        isFirstInstanceStageName(displayStage?.stageName ?? currentStage?.stageName) &&
        shouldShowOpponentAppealRegisterButton(
            {
                finalDecision: displayStage?.finalDecision ?? currentStage?.finalDecision,
                isPleadingsClosed: displayStage?.isPleadingsClosed ?? currentStage?.isPleadingsClosed,
                appealDeadline: displayStage?.appealDeadline ?? currentStage?.appealDeadline,
                wasReopened: displayStage?.wasReopened ?? currentStage?.wasReopened,
                awaitingOpponentAppeal:
                    displayStage?.awaitingOpponentAppeal ?? currentStage?.awaitingOpponentAppeal,
                stageName: displayStage?.stageName ?? currentStage?.stageName,
                status: displayStage?.status ?? currentStage?.status,
            },
            status,
        );

    const showFirstInstanceIncidentalUi = shouldShowFirstInstanceIncidentalUi(
        displayStage?.stageName,
        displayStage?.isPleadingsClosed,
    );

    const showAbsentJudgmentFooter =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        shouldShowAbsentJudgmentFooter(displayStage);

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

    const showPleadingCloseFooter =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        !showAbsentJudgmentFooter &&
        !showOpponentAppealBtnEffective &&
        !showAppealStageFooter &&
        !showPetitionVoidFooter &&
        (showNoPleadingJudgmentFooter
            || preferPleadingCloseFooter
            || !displayStage?.isPleadingsClosed
            || Boolean(displayStage?.isUnderObjection)
            || isAbsentObjectionStageName(displayStage?.stageName));

    const quickActionsVariant = displayStage?.isPleadingsClosed ? 'notes-only' : 'full';

    const absentObjectionDeadline = showAbsentJudgmentFooter
        ? resolveAbsentObjectionDeadline(displayStage)
        : null;
    const absentObjectionDaysLeft = absentObjectionDeadline
        ? daysRemainingUntil(absentObjectionDeadline)
        : null;

    const absentJudgmentFooterPanel = showAbsentJudgmentFooter ? (
        isAwaitingAbsentJudgmentNotification(displayStage) && onAbsentJudgmentNotification ? (
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
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] px-0.5">
                    <span className="text-white/45">
                        تبليغ:{' '}
                        <span className="text-amber-100/90 font-bold tabular-nums">
                            {displayStage?.absentJudgmentNotificationDate}
                        </span>
                    </span>
                    {absentObjectionDeadline && absentObjectionDaysLeft !== null ? (
                        <span
                            className={`font-bold tabular-nums ${
                                absentObjectionDaysLeft < 0
                                    ? 'text-rose-300'
                                    : absentObjectionDaysLeft <= 3
                                      ? 'text-amber-300'
                                      : 'text-white/50'
                            }`}
                        >
                            {absentObjectionDaysLeft < 0
                                ? 'انتهت مهلة الاعتراض'
                                : `مهلة الاعتراض: ${absentObjectionDaysLeft} يوم`}
                        </span>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={() => setShowAppealModal(true)}
                    onPointerEnter={() => {
                        void import('../../AppealTransitionModal').catch(() => undefined);
                    }}
                    className="w-full py-3 rounded-xl border border-orange-400/22 bg-orange-500/8 text-orange-100/90 text-sm font-bold hover:bg-orange-500/12 transition-colors"
                >
                    تسجيل طعن المدعى عليه (اعتراض / استئناف / تمييز)
                </button>
            </div>
        ) : null
    ) : null;

    const opponentAppealFooterPanel = showOpponentAppealBtnEffective ? (
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
        appealStageFooter,
        showAppealStageFooter,
        showPetitionVoidFooter,
        showPleadingCloseFooter,
        quickActionsVariant,
        absentJudgmentFooterPanel,
        opponentAppealFooterPanel,
        appealStageFooterPanel,
        petitionVoidFooterPanel,
    };
}
