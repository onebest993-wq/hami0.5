import React, { useRef, useState } from 'react';
import {
    Clock, Lock, PauseCircle, Play, ArrowRightLeft, ArrowLeftRight,
} from '@/app/components/ui/lucideIcons';
import { getLegalRole } from '../../LawyerShared';
import { resolveHeaderPartyColumnLabel } from '../smartFile/partyRoleClassification';
import type { CaseStage, IncidentalCase, Party } from '../../LawyerShared';
import { filterHeaderIncidentalCases, groupPartiesForHeader } from '../smartFile/incidentalCaseLinking';
import { resolveDisplayParties } from '../smartFile/resolveDisplayParties';
import { resolveCrossAppealEligibility } from '../smartFile/crossAppealEngine';


import {
    shouldShowOpponentAppealRegisterButton,
    isAppealStageName,
    isCassationStageName,
} from '../smartFile/judgmentTypes';
import { isCassationCorrectionStageName } from '../smartFile/extraordinaryAppealGateway';
import { isLockedPriorStage, shouldShowFirstInstancePleadingLockUi } from '../smartFile/stageInit';

import { HeaderPartiesStrip } from './HeaderPartiesStrip';
import { PartyItem } from './PartyItem';
import { PARTY_STRIP_SHELL } from './smartHeaderPresentation';
import { PartyChip } from './PartyChip';
import {
    resolveLawsuitTypeLabel,
    formatClaimValueDisplay,
    displayCaseNo,
    GLASS_CHIP,
} from './smartHeaderPresentation';
import type { SmartHeaderProps } from './smartHeaderTypes';
import { resolveCourtReferralDisplay } from '@/app/domain/lawsuit/courtReferral';

export function SmartHeader({ formData, onToggleClient, isPaused, incidentalCases = [], stages = [], currentStageId = '', pauseReason = '', onResume, onPause, status = 'نشطة', isInterrupted = false, interruptionData = null, linkedCaseNo = '', onInterrupt, onAbandon, onNotification, onStageClick, stageHistory = [], isReadOnly = false, hasCrossAppeal = false, onCancelCrossAppeal, onAddCrossAppeal, notificationStatus = 'waiting', onToggleNotification, caseType, onCassationDecision, isPleadingsClosed = false, wasReopened = false, onClosePleadings, onReopenPleadings, onRegisterOpponentAppeal, onCassationAppeal, hasJudgment = false, onDefaultObjection, onWaiveObjection, onOtherAppeals, provisionalOrders = [], onAddProvisionalOrder, thirdParties = [], representedParty = null, onUpdateIncidentalEntryDecision, crossAppealEligibility: crossAppealEligibilityProp }: SmartHeaderProps) {
    const [openPartyKey, setOpenPartyKey] = useState<string | null>(null);
    const partiesSectionRef = useRef<HTMLDivElement>(null);
    const [showClaimValue, setShowClaimValue] = useState(false);
    const [showPreviousCourt, setShowPreviousCourt] = useState(false);
    const partiesList = Array.isArray(formData?.parties) && formData.parties.length > 0
        ? formData.parties
        : resolveDisplayParties({
            displayStage: formData,
            allStages: Array.isArray(stages) ? (stages as CaseStage[]) : [],
        });
    const { plaintiffs, defendants, interpleaders } = groupPartiesForHeader(partiesList);

    const crossAppealEligibility = crossAppealEligibilityProp ?? resolveCrossAppealEligibility({
        appealStage: formData as CaseStage,
        stages: [],
        appealStageIndex: -1,
    });

    const activeStage = formData.extraordinaryType || formData.stageName;
    const p1Role =
        resolveHeaderPartyColumnLabel(plaintiffs, plaintiffs.length)
        ?? getLegalRole(activeStage, 1, plaintiffs.length, formData.extraordinaryType);
    const p2Role =
        resolveHeaderPartyColumnLabel(defendants, defendants.length)
        ?? getLegalRole(activeStage, 2, defendants.length, formData.extraordinaryType);

    const notifStatuses = [
        { id: 'waiting', label: '⏳ بانتظار التبليغ', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
        { id: 'in_person', label: '🟢 متبلغ بالذات', color: 'bg-green-500/10 text-green-300 border-green-500/20' },
        { id: 'via_media', label: '🟡 تبليغ إعلامي', color: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' },
        { id: 'publication', label: '📰 نشر في الجريدة', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' }
    ];
    const currentNotif = notifStatuses.find(s => s.id === notificationStatus) || notifStatuses[0];

    const hasAppealContext =
        isAppealStageName(formData?.stageName) ||
        isCassationStageName(formData?.stageName) ||
        formData?.extraordinaryType ||
        formData?.extraordinaryAppealType;
    const hasFirstInstanceData = formData?.firstInstanceCaseNumber && formData?.firstInstanceCourt;
    
    const isCassation = isCassationStageName(formData?.stageName);
    const isCorrectionStage = isCassationCorrectionStageName(formData?.stageName);
    const isAppealStage = isAppealStageName(formData?.stageName);
    const rawCourtName = String(formData?.court || '').trim();
    const courtReferralView = resolveCourtReferralDisplay(formData ?? {});
    const rawJudgeName = String(
        formData?.judge ??
            formData?.judgeName ??
            (formData as Record<string, unknown> | undefined)?.judge_name ??
            (formData as Record<string, unknown> | undefined)?.judgeName_ar ??
            ((formData as Record<string, unknown> | undefined)?.details as Record<string, unknown> | undefined)?.judge ??
            ((formData as Record<string, unknown> | undefined)?.details as Record<string, unknown> | undefined)?.judgeName ??
            '',
    ).trim();
    const courtName =
        courtReferralView.displayCourt ||
        rawCourtName ||
        (isAppealStage ? '' : 'المحكمة المختصة');
    const judgeName = rawJudgeName;
    const showJudgeChip = !isCassation && !isCorrectionStage;
    const judgeChipValue = isAppealStage ? '' : judgeName;
    const lawsuitTypeLabel = resolveLawsuitTypeLabel(formData);
    const claimValueLabel = formatClaimValueDisplay(formData?.claimValue);
    const awaitingOpponentAppeal = shouldShowOpponentAppealRegisterButton(
        {
            finalDecision: formData?.finalDecision,
            isPleadingsClosed,
            appealDeadline: formData?.appealDeadline,
            wasReopened,
            awaitingOpponentAppeal: formData?.awaitingOpponentAppeal,
            stageName: formData?.stageName,
            status: formData?.status,
        },
        status,
    );
    const showPleadingLockChrome = shouldShowFirstInstancePleadingLockUi(
        formData as { isPleadingsClosed?: boolean; status?: string; stageName?: string; awaitingOpponentAppeal?: boolean },
    );
    const isLockedArchive = isLockedPriorStage(
        formData as { status?: string },
    );

    const activeThirdPartyCases = filterHeaderIncidentalCases(
        Array.isArray(incidentalCases) ? incidentalCases : [],
    ).filter(
        (c): c is IncidentalCase =>
            Boolean(
                c &&
                    typeof c === 'object' &&
                    c.type === 'thirdParty' &&
                    c.status === 'active',
            ),
    );
    const affiliativeThirdParties = activeThirdPartyCases.filter((c) => c.thirdPartyEntryMode === 'affiliative');
    const selfClaimThirdParties = activeThirdPartyCases.filter(
        (c) => c.thirdPartyEntryMode === 'selfClaim' || !c.thirdPartyEntryMode,
    );
    const hasHeaderActions =
        Boolean(
            !isCassation &&
                !isReadOnly &&
                (!isPleadingsClosed || isAppealStageName(formData?.stageName)) &&
                ((isAppealStageName(formData?.stageName) && crossAppealEligibility.showButton && onAddCrossAppeal) ||
                    (isAppealStageName(formData?.stageName) &&
                        crossAppealEligibility.filedCrossAppellants.length > 0 &&
                        onCancelCrossAppeal)),
        );

    const renderEntryDecisionActions = (c: IncidentalCase) => {
        if (isReadOnly || !onUpdateIncidentalEntryDecision) return null;
        if (c.entryDecision && c.entryDecision !== 'pending') {
            return (
                <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                        c.entryDecision === 'accepted'
                            ? 'bg-green-500/15 text-green-400 border-green-500/30'
                            : 'bg-red-500/15 text-red-300 border-red-500/30'
                    }`}
                >
                    {c.entryDecision === 'accepted' ? 'تم قبول الدخول' : 'تم رفض الدخول'}
                </span>
            );
        }
        return (
            <div className="flex gap-2 shrink-0">
                <button
                    type="button"
                    onClick={() => onUpdateIncidentalEntryDecision(c.id, 'accepted')}
                    className="px-2.5 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg text-[10px] font-bold hover:bg-green-500/20 transition-colors"
                >
                    قبول الدخول
                </button>
                <button
                    type="button"
                    onClick={() => onUpdateIncidentalEntryDecision(c.id, 'rejected')}
                    className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold hover:bg-red-500/20 transition-colors"
                >
                    رفض الدخول
                </button>
            </div>
        );
    };

    // 🔥 DYNAMIC STYLE — glass water
    const containerStyle = isPaused
        ? 'rounded-[22px] mb-1.5 relative group/card transition-all backdrop-blur-2xl bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.08),transparent_34%),linear-gradient(180deg,rgba(12,18,31,0.94),rgba(8,12,22,0.96))] border border-rose-500/18 shadow-[0_18px_40px_rgba(244,63,94,0.08)]'
        : 'rounded-[22px] mb-1.5 relative group/card transition-all backdrop-blur-2xl bg-[radial-gradient(circle_at_top,rgba(230,198,115,0.08),transparent_36%),linear-gradient(180deg,rgba(12,18,31,0.94),rgba(8,12,22,0.96))] border border-[#E6C673]/12 shadow-[0_18px_40px_rgba(0,0,0,0.24)] hover:border-[#E6C673]/18';

    const hasPartiesSection =
        plaintiffs.length > 0 || defendants.length > 0 || interpleaders.length > 0
        || (thirdParties && thirdParties.length > 0)
        || activeThirdPartyCases.length > 0;

    const scrollToPartiesSection = () => {
        if (onStageClick && currentStageId) {
            onStageClick(currentStageId);
        }
        partiesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    return (
        <>
            <div className={containerStyle}>
            <div className="px-3 py-2.5 relative z-10">
                <div className="flex items-start justify-between gap-2 border-b border-white/[0.05] pb-2 mb-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                type="button"
                                onClick={scrollToPartiesSection}
                                className="text-[22px] sm:text-[24px] font-black text-[#E6C673] tracking-wide font-sans leading-none truncate max-w-full text-right touch-manipulation min-h-[44px]"
                                title="الانتقال إلى أطراف الدعوى"
                                data-testid="smart-dossier-case-no"
                            >
                                <span dir="ltr" className="inline-block [unicode-bidi:bidi-override] [direction:ltr]">
                                    {displayCaseNo(formData.caseNo)}
                                </span>
                            </button>
                            {lawsuitTypeLabel ? (
                                <button
                                    type="button"
                                    onClick={() => setShowClaimValue((v) => !v)}
                                    className={`${GLASS_CHIP} bg-[#E6C673]/12 border-[#E6C673]/28 text-[#E6C673] max-w-[min(100%,20rem)] truncate touch-manipulation cursor-pointer hover:bg-[#E6C673]/18 transition-colors text-[11px] px-2 py-1`}
                                    title={lawsuitTypeLabel}
                                >
                                    <span className="text-[#E6C673]/60 font-bold text-[10px]">نوع الدعوى</span>
                                    <span className="truncate font-black text-[12px]">{lawsuitTypeLabel}</span>
                                </button>
                            ) : null}
                            {wasReopened ? (
                                <span className={`${GLASS_CHIP} bg-rose-500/8 border-rose-400/20 text-rose-300`}>
                                    معاد فتحها
                                </span>
                            ) : null}
                            {isPaused ? (
                                <span className={`${GLASS_CHIP} bg-rose-500/10 border-rose-400/25 text-rose-300`}>
                                    <PauseCircle size={10} />
                                    مستأخرة
                                </span>
                            ) : null}
                            {linkedCaseNo ? (
                                <span className={`${GLASS_CHIP} bg-teal-500/8 border-teal-400/20 text-teal-300`} dir="ltr">
                                    موحدة {linkedCaseNo}
                                </span>
                            ) : null}
                        </div>
                        {showClaimValue && lawsuitTypeLabel ? (
                            <p className="mt-1.5 text-[11px] text-white/40 leading-relaxed">
                                {claimValueLabel ? (
                                    <>
                                        القيمة التقديرية:{' '}
                                        <span className="font-bold text-[#E6C673]/90" dir="ltr">{claimValueLabel} د.ع</span>
                                    </>
                                ) : (
                                    <span className="text-white/30">القيمة التقديرية غير محددة</span>
                                )}
                            </p>
                        ) : null}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 min-w-0">
                            <div className="relative inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-1">
                                <span className="shrink-0 text-[9px] font-bold text-white/35">المحكمة</span>
                                <span className="truncate text-[11px] font-bold text-white/92 leading-snug" title={courtName}>
                                    {isCassation ? 'محكمة التمييز الاتحادية' : courtName}
                                </span>
                                {courtReferralView.previousCourt ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setShowPreviousCourt((v) => !v)}
                                            className="shrink-0 inline-flex items-center justify-center rounded-md border border-violet-400/25 bg-violet-500/10 p-1 text-violet-200/90 hover:bg-violet-500/16 transition-colors touch-manipulation"
                                            aria-label="عرض المحكمة السابقة"
                                            aria-expanded={showPreviousCourt}
                                            title="المحكمة السابقة"
                                        >
                                            <ArrowLeftRight size={10} aria-hidden />
                                        </button>
                                        {showPreviousCourt ? (
                                            <div className="absolute top-full right-0 z-20 mt-1 min-w-[10rem] max-w-[16rem] rounded-xl border border-white/[0.1] bg-[#0c1220]/98 px-2.5 py-2 shadow-lg">
                                                <p className="text-[8px] font-bold text-white/35 mb-0.5">المحكمة السابقة</p>
                                                <p className="text-[10px] font-bold text-white/85 leading-snug">{courtReferralView.previousCourt}</p>
                                            </div>
                                        ) : null}
                                    </>
                                ) : null}
                            </div>
                            {showJudgeChip ? (
                            <div className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-1">
                                <span className="shrink-0 text-[9px] font-bold text-white/35">القاضي</span>
                                <span
                                    className={`truncate text-[11px] font-semibold ${judgeChipValue ? 'text-white/80' : 'text-white/35'}`}
                                    title={judgeChipValue || 'اسم القاضي غير مدخل'}
                                >
                                    {judgeChipValue || '—'}
                                </span>
                            </div>
                            ) : null}
                            {hasAppealContext && hasFirstInstanceData ? (
                                <span className="inline-flex min-w-0 items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] text-white/40 truncate">
                                    <span className="shrink-0 text-white/30 font-bold">الأساس</span>
                                    <span dir="ltr">{formData.firstInstanceCaseNumber}</span>
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-start">
                        {!isCassation && !isReadOnly && !isPleadingsClosed && onClosePleadings ? (
                            <button
                                type="button"
                                onClick={onClosePleadings}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 text-[10px] font-bold hover:bg-[#E6C673]/10 hover:border-[#E6C673]/25 hover:text-[#E6C673] transition-all"
                                title="حجز الدعوى للقرار"
                            >
                                <Lock size={10} />
                                <span>حجز للقرار</span>
                            </button>
                        ) : null}
                        {isLockedArchive ? (
                            <span className={`${GLASS_CHIP} bg-slate-500/10 border-slate-400/25 text-slate-300`}>
                                <Lock size={10} />
                                مرحلة سابقة
                            </span>
                        ) : showPleadingLockChrome ? (
                            <div className="inline-flex items-center gap-1">
                                <span className={`${GLASS_CHIP} ${
                                    awaitingOpponentAppeal
                                        ? 'bg-indigo-500/10 border-indigo-400/25 text-indigo-200'
                                        : 'bg-[#E6C673]/10 border-[#E6C673]/22 text-[#E6C673]'
                                }`}
                                >
                                    {awaitingOpponentAppeal ? (
                                        <Clock size={10} />
                                    ) : (
                                        <Lock size={10} />
                                    )}
                                    {awaitingOpponentAppeal ? 'بانتظار طعن الخصم' : 'محجوزة'}
                                </span>
                                {onReopenPleadings && !awaitingOpponentAppeal ? (
                                    <button
                                        type="button"
                                        onClick={onReopenPleadings}
                                        className="text-[9px] text-white/40 hover:text-[#E6C673] transition-colors px-1"
                                    >
                                        فتح
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                        {isPaused && onResume && !isReadOnly ? (
                            <button
                                type="button"
                                onClick={onResume}
                                className={`${GLASS_CHIP} bg-emerald-500/10 border-emerald-400/25 text-emerald-300 hover:bg-emerald-500/15 transition-all`}
                            >
                                <Play size={10} />
                                استئناف
                            </button>
                        ) : null}
                    </div>
                </div>

                {hasHeaderActions ? (
                <div className="flex flex-wrap items-center gap-1.5 w-full mb-0.5">

                    {/* STANDARD ACTIONS (Hidden in Cassation OR Pleadings Closed) */}
                    {!isCassation && !isReadOnly && (!isPleadingsClosed || isAppealStageName(formData?.stageName)) && (
                        <>
                            {isAppealStageName(formData?.stageName) && crossAppealEligibility.showButton && onAddCrossAppeal && (
                                <button type="button" 
                                    onClick={onAddCrossAppeal} 
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20"
                                    title="إضافة استئناف متقابل"
                                >
                                    <ArrowRightLeft size={12} />
                                    <span className="leading-none">استئناف متقابل</span>
                                </button>
                            )}
                            {isAppealStageName(formData?.stageName) && crossAppealEligibility.filedCrossAppellants.length > 0 && onCancelCrossAppeal && (
                                <button type="button" 
                                    onClick={onCancelCrossAppeal} 
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer bg-indigo-500 text-white border-indigo-400 hover:bg-indigo-600"
                                    title="إلغاء الاستئناف المتقابل"
                                >
                                    <ArrowRightLeft size={12} />
                                    <span className="leading-none">✓ متقابل</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
                ) : null}

                {/* 4. END OF HEADER ACTIONS */}
            </div>

            {hasPartiesSection ? (
                <div
                    ref={partiesSectionRef}
                    id="smart-dossier-parties-section"
                    className="px-3 pb-2.5 border-t border-white/[0.05] pt-2 scroll-mt-24"
                    dir="rtl"
                >
                    <HeaderPartiesStrip
                        plaintiffs={plaintiffs}
                        defendants={defendants}
                        interpleaders={interpleaders}
                        p1Role={p1Role}
                        p2Role={p2Role}
                        openPartyKey={openPartyKey}
                        onToggleParty={(key) => setOpenPartyKey(key || null)}
                    />

                    {activeThirdPartyCases.length > 0 ? (
                        <div className="w-full mt-2 border-t border-white/[0.05] pt-2 space-y-1.5" dir="rtl">
                    {affiliativeThirdParties.map((c) => (
                        <div
                            key={c.id}
                            className={`${PARTY_STRIP_SHELL} px-2.5 py-2`}
                        >
                            <div className="flex items-center justify-between gap-2 min-w-0">
                                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                    <span className="shrink-0 rounded-md px-1 py-px text-[7px] font-black bg-indigo-500/22 text-indigo-200 border border-indigo-400/25">
                                        انضمام
                                    </span>
                                    <span className="text-[11px] font-bold text-white/85 truncate">{c.partyName}</span>
                                    <span className="text-white/20 shrink-0 text-[10px]">←</span>
                                    <span className="text-[10px] text-white/45 truncate">{c.affiliationPartyName || '—'}</span>
                                </div>
                                {renderEntryDecisionActions(c)}
                            </div>
                        </div>
                    ))}

                    {selfClaimThirdParties.map((c) => (
                        <div
                            key={c.id}
                            className={`${PARTY_STRIP_SHELL} px-2.5 py-2 flex items-center justify-between gap-2`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="shrink-0 rounded-md px-1 py-px text-[7px] font-black bg-[#E6C673]/12 text-[#E6C673] border border-[#E6C673]/28">
                                    اختصام
                                </span>
                                <span className="text-[11px] font-bold text-white/90 truncate">{c.partyName}</span>
                            </div>
                            {renderEntryDecisionActions(c)}
                        </div>
                    ))}
                </div>
            ) : null}

            {/* legacy thirdParties prop — only when not already in parties strip */}
            {thirdParties && thirdParties.length > 0 && interpleaders.length === 0 && plaintiffs.length === 0 && defendants.length === 0 ? (
                <div className="w-full mt-2 border-t border-white/[0.05] pt-2">
                    <div className="flex flex-wrap gap-1.5">
                        {thirdParties.map((party: { name?: string; role?: string; roleLabel?: string }, index: number) => (
                            <PartyChip
                                key={index}
                                party={party}
                                accent="gold"
                                isOpen={false}
                                onToggle={() => {}}
                            />
                        ))}
                    </div>
                </div>
            ) : null}
                </div>
            ) : null}
            </div>

                            {/* 3. CROSS-APPEAL SECTION (Dedicated Card) */}
            {crossAppealEligibility.filedCrossAppellants.length > 0 && isAppealStage && (
                 <div className="mt-4 mx-4 mb-4 border border-indigo-500/30 rounded-xl overflow-hidden relative shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                    <div className="bg-indigo-900/30 p-2.5 border-b border-indigo-500/20 flex items-center justify-center gap-2 backdrop-blur-md">
                        <ArrowRightLeft size={14} className="text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-300">أطراف الاستئناف المتقابل</span>
                    </div>
                    
                    <div className="grid grid-cols-2 divide-x divide-x-reverse divide-indigo-500/10 bg-black/40 backdrop-blur-md">
                         <div className="p-4 flex flex-col gap-3 group/cross-appellant hover:bg-white/[0.02] transition-colors">
                             <div className="flex items-center justify-end mb-1">
                                 <span className="text-[10px] font-bold text-indigo-400 tracking-wide uppercase opacity-80 text-right bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">المستأنف المتقابل</span>
                             </div>
                             {crossAppealEligibility.filedCrossAppellants.map((party: Party, index: number) => (
                                 <div key={String(party.id ?? index)} className="w-full">
                                     <PartyItem party={party} isEditing={false} align="right" />
                                     {index < crossAppealEligibility.filedCrossAppellants.length - 1 && <hr className="border-slate-700/50 my-2" />}
                                 </div>
                             ))}
                         </div>
                         
                         <div className="p-4 flex flex-col gap-3 group/cross-appellee hover:bg-white/[0.02] transition-colors">
                             <div className="flex items-center justify-end mb-1">
                                 <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase opacity-80 text-right bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20">المستأنف عليه المتقابل</span>
                             </div>
                             {crossAppealEligibility.crossAppellees.map((party: Party, index: number) => (
                                 <div key={String(party.id ?? index)} className="w-full">
                                     <PartyItem party={party} isEditing={false} align="left" />
                                     {index < crossAppealEligibility.crossAppellees.length - 1 && <hr className="border-slate-700/50 my-2" />}
                                 </div>
                             ))}
                         </div>
                    </div>
                 </div>
            )}
        </>
    );
};

