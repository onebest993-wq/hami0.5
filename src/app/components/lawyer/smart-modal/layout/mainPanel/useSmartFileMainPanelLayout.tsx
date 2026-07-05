import { useState } from 'react';
import { Bell, Clock, Scale, Shield } from 'lucide-react';
import {
    formatConsolidatedChipLabel,
    readConsolidationSecondaryRefs,
} from '../../smartFile/caseConsolidationLinking';
import { readIncidentalLink, readLinkedChildIncidentalCases } from '../../smartFile/incidentalCaseLinking';
import { readCaseLinks } from '../../smartFile/caseLinking';
import { shouldShowOpponentAppealRegisterButton, isFirstInstanceStageName } from '../../smartFile/judgmentTypes';
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
    const primaryDocType = pickNonemptyString(displayStage?.docType, file?.docType, parentData.docType);
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

    const showPleadingCloseFooter =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        !showAbsentJudgmentFooter &&
        !showOpponentAppealBtnEffective &&
        !showAppealStageFooter &&
        !showPetitionVoidFooter &&
        (preferPleadingCloseFooter
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
        <div className="rounded-xl border border-amber-400/15 bg-white/[0.025] backdrop-blur-xl px-3 py-2.5 shadow-[0_4px_16px_rgba(245,158,11,0.06)]">
            {isAwaitingAbsentJudgmentNotification(displayStage) && onAbsentJudgmentNotification ? (
                <button
                    type="button"
                    onClick={onAbsentJudgmentNotification}
                    className="w-full py-2 rounded-lg border border-amber-400/25 bg-amber-500/10 text-amber-100 text-[11px] font-bold hover:bg-amber-500/15 transition-colors flex items-center justify-center gap-1.5"
                >
                    <Bell size={13} />
                    التبليغ بالحكم الغيابي
                </button>
            ) : hasAbsentJudgmentNotificationRecorded(displayStage) ? (
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px]">
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
                        className="w-full py-2 rounded-lg border border-orange-400/22 bg-orange-500/8 text-orange-100/90 text-[11px] font-bold hover:bg-orange-500/12 transition-colors flex items-center justify-center gap-1.5"
                    >
                        <Shield size={13} />
                        تسجيل طعن المدعى عليه (اعتراض / استئناف / تمييز)
                    </button>
                </div>
            ) : null}
        </div>
    ) : null;

    const opponentAppealFooterPanel = showOpponentAppealBtnEffective ? (
        <div className="rounded-2xl border border-indigo-400/22 bg-gradient-to-br from-indigo-500/10 via-[#0A0F1C]/55 to-[#0A0F1C]/75 backdrop-blur-2xl p-4 shadow-[0_12px_44px_rgba(79,70,229,0.14),inset_0_1px_0_rgba(255,255,255,0.07)]">
            <div className="flex items-start gap-3 mb-3.5">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-500/12 border border-indigo-400/28 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Clock size={17} className="text-indigo-300" strokeWidth={2} />
                </div>
                <div className="min-w-0 text-right">
                    <p className="text-sm font-bold text-indigo-100 leading-snug">
                        محسومة لصالح الموكل — بانتظار طعن الخصم
                    </p>
                    <p className="text-[11px] text-indigo-200/55 mt-1 leading-relaxed">
                        إضبارة البداءة مقفولة. عند تبليغك بطعن الخصم، سجّله من الزر أدناه.
                    </p>
                </div>
            </div>
            <button
                type="button"
                        onClick={() => {
                            // #region debug-point A:opponent-appeal-button
                            fetch('http://127.0.0.1:7777/event', {
                                method: 'POST',
                                body: JSON.stringify({
                                    sessionId: 'opponent-appeal-crash',
                                    runId: 'pre-fix',
                                    hypothesisId: 'A',
                                    location: 'useSmartFileMainPanelLayout.tsx:opponentAppealFooterPanel',
                                    msg: '[DEBUG] opponent appeal button clicked',
                                    data: {
                                        stageName: displayStage?.stageName ?? null,
                                        finalDecision: displayStage?.finalDecision ?? null,
                                        isPleadingsClosed: Boolean(displayStage?.isPleadingsClosed),
                                        partyCount: Array.isArray(displayStage?.parties) ? displayStage.parties.length : 0,
                                    },
                                    ts: Date.now(),
                                }),
                            }).catch(() => {});
                            // #endregion
                            setShowAppealModal(true);
                        }}
                className="group w-full py-3.5 rounded-xl bg-gradient-to-l from-indigo-500/22 via-indigo-500/14 to-indigo-400/8 backdrop-blur-md border border-indigo-400/35 text-indigo-50 font-bold text-[15px] shadow-[0_8px_28px_rgba(99,102,241,0.22),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-indigo-300/50 hover:from-indigo-500/30 hover:to-indigo-400/12 transition-all flex items-center justify-center gap-2.5"
            >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 border border-white/15 group-hover:bg-white/15 transition-colors">
                    <Scale size={16} strokeWidth={2.25} />
                </span>
                قام الخصم بالطعن
            </button>
        </div>
    ) : null;

    const appealStageFooterPanel = showAppealStageFooter && appealStageFooter.kind ? (
        appealStageFooter.kind === 'register_opponent_cassation' ? (
            <div className="rounded-2xl border border-violet-400/22 bg-gradient-to-br from-violet-500/10 via-[#0A0F1C]/55 to-[#0A0F1C]/75 backdrop-blur-2xl p-4 shadow-[0_12px_44px_rgba(139,92,246,0.14),inset_0_1px_0_rgba(255,255,255,0.07)]">
                <div className="flex items-start gap-3 mb-3.5">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-violet-500/12 border border-violet-400/28 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <Clock size={17} className="text-violet-300" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 text-right">
                        <p className="text-sm font-bold text-violet-100 leading-snug">
                            محسومة لصالح الموكل — بانتظار تمييز الخصم
                        </p>
                        <p className="text-[11px] text-violet-200/55 mt-1 leading-relaxed">
                            مرحلة الاستئناف مقفولة. عند تبليغك بتمييز الخصم، سجّله من الزر أدناه.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setShowAppealModal(true)}
                    className="group w-full py-3.5 rounded-xl bg-gradient-to-l from-violet-500/22 via-violet-500/14 to-violet-400/8 backdrop-blur-md border border-violet-400/35 text-violet-50 font-bold text-[15px] shadow-[0_8px_28px_rgba(139,92,246,0.22),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-violet-300/50 hover:from-violet-500/30 hover:to-violet-400/12 transition-all flex items-center justify-center gap-2.5"
                >
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 border border-white/15 group-hover:bg-white/15 transition-colors">
                        <Scale size={16} strokeWidth={2.25} />
                    </span>
                    قام الخصم بالتمييز
                </button>
            </div>
        ) : (
            <div className="rounded-2xl border border-[#E6C673]/22 bg-gradient-to-br from-[#E6C673]/8 via-[#0A0F1C]/55 to-[#0A0F1C]/75 backdrop-blur-2xl p-4 shadow-[0_12px_44px_rgba(230,198,115,0.12),inset_0_1px_0_rgba(255,255,255,0.07)]">
                <div className="flex items-start gap-3 mb-3.5">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/25 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                        <Scale size={17} className="text-[#E6C673]" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 text-right">
                        <p className="text-sm font-bold text-[#E6C673] leading-snug">
                            يحق لموكلك الطعن تمييزاً
                        </p>
                        <p className="text-[11px] text-white/45 mt-1 leading-relaxed">
                            صدر حكم الاستئناف — انتقل لمحكمة التمييز لتسجيل الطعن.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleOpenDefendantCassationAppeal}
                    className="group w-full py-3.5 rounded-xl bg-gradient-to-l from-[#E6C673]/20 via-[#E6C673]/12 to-[#E6C673]/6 backdrop-blur-md border border-[#E6C673]/35 text-[#E6C673] font-bold text-[15px] shadow-[0_8px_28px_rgba(230,198,115,0.18),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-[#E6C673]/50 transition-all flex items-center justify-center gap-2.5"
                >
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#E6C673]/10 border border-[#E6C673]/20 group-hover:bg-[#E6C673]/20 transition-colors">
                        <Scale size={16} strokeWidth={2.25} />
                    </span>
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
