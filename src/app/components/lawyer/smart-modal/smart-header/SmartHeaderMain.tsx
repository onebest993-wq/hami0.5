import React from 'react';
import { Clock } from '@/app/components/ui/icons/Clock';
import { Lock } from '@/app/components/ui/icons/Lock';
import { PauseCircle } from '@/app/components/ui/icons/PauseCircle';
import { Play } from '@/app/components/ui/icons/Play';
import { ArrowRightLeft } from '@/app/components/ui/icons/ArrowRightLeft';
import { ArrowLeftRight } from '@/app/components/ui/icons/ArrowLeftRight';
import { isAppealStageName } from '../smartFile/judgmentTypes';
import { HeaderPartiesStrip } from './HeaderPartiesStrip';
import {
    displayCaseNo,
    GLASS_CHIP,
} from './smartHeaderPresentation';
import type { SmartHeaderProps } from './smartHeaderTypes';
import { useSmartHeaderDerivedState } from './useSmartHeaderDerivedState';
import { SmartHeaderThirdPartyCases } from './SmartHeaderThirdPartyCases';
import { SmartHeaderCrossAppealCard } from './SmartHeaderCrossAppealCard';

export function SmartHeader({ formData, isPaused, incidentalCases = [], stages = [], currentStageId = '', pauseReason = '', onResume, onPause, status = 'نشطة', isInterrupted = false, interruptionData = null, linkedCaseNo = '', onInterrupt, onAbandon, onNotification, onStageClick, stageHistory = [], isReadOnly = false, hasCrossAppeal = false, onCancelCrossAppeal, onAddCrossAppeal, notificationStatus = 'waiting', onToggleNotification, caseType, onCassationDecision, isPleadingsClosed = false, wasReopened = false, onClosePleadings, onReopenPleadings, onRegisterOpponentAppeal, onCassationAppeal, hasJudgment = false, onDefaultObjection, onWaiveObjection, onOtherAppeals, provisionalOrders = [], onAddProvisionalOrder, thirdParties = [], representedParty = null, onUpdateIncidentalEntryDecision, crossAppealEligibility: crossAppealEligibilityProp }: SmartHeaderProps) {
    const derived = useSmartHeaderDerivedState({
        formData, isPaused, incidentalCases, stages, currentStageId, pauseReason, onResume, onPause, status,
        isInterrupted, interruptionData, linkedCaseNo, onInterrupt, onAbandon, onNotification, onStageClick,
        stageHistory, isReadOnly, hasCrossAppeal, onCancelCrossAppeal, onAddCrossAppeal, notificationStatus,
        onToggleNotification, caseType, onCassationDecision, isPleadingsClosed, wasReopened, onClosePleadings,
        onReopenPleadings, onRegisterOpponentAppeal, onCassationAppeal, hasJudgment, onDefaultObjection,
        onWaiveObjection, onOtherAppeals, provisionalOrders, onAddProvisionalOrder, thirdParties, representedParty,
        onUpdateIncidentalEntryDecision, crossAppealEligibility: crossAppealEligibilityProp,
    });

    const {
        openPartyKey, setOpenPartyKey, partiesSectionRef, showClaimValue, setShowClaimValue,
        showPreviousCourt, setShowPreviousCourt, plaintiffs, defendants, interpleaders,
        crossAppealEligibility, p1Role, p2Role, hasAppealContext, hasFirstInstanceData,
        isCassation, isAppealStage, courtReferralView, courtName, showJudgeChip, judgeChipValue,
        lawsuitTypeLabel, claimValueLabel, awaitingOpponentAppeal, showPleadingLockChrome,
        isLockedArchive, activeThirdPartyCases, affiliativeThirdParties, selfClaimThirdParties,
        hasHeaderActions, containerStyle, hasPartiesSection,
    } = derived;

    const scrollToPartiesSection = () => {
        if (onStageClick && currentStageId) {
            onStageClick(currentStageId);
        }
        partiesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    return (
        <>
            <div className={containerStyle}>
            <div className="px-3 py-2 relative z-10">
                <div className="flex items-start justify-between gap-2 border-b border-white/[0.05] pb-1.5 mb-1.5">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                type="button"
                                onClick={scrollToPartiesSection}
                                className="text-[22px] sm:text-[24px] font-black text-[#E6C673] tracking-wide font-sans leading-none truncate max-w-full text-right touch-manipulation min-h-[44px]"
                                title="الانتقال إلى أطراف الدعوى"
                                data-testid="smart-dossier-case-no"
                            >
                                <span className="inline-block max-w-full truncate" dir="auto">
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
            </div>

            {hasPartiesSection ? (
                <div
                    ref={partiesSectionRef}
                    id="smart-dossier-parties-section"
                    className="px-3 pb-2 border-t border-white/[0.05] pt-1.5 scroll-mt-24"
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
                    <SmartHeaderThirdPartyCases
                        affiliativeThirdParties={affiliativeThirdParties}
                        selfClaimThirdParties={selfClaimThirdParties}
                        activeThirdPartyCasesLength={activeThirdPartyCases.length}
                        thirdParties={thirdParties}
                        interpleadersLength={interpleaders.length}
                        plaintiffsLength={plaintiffs.length}
                        defendantsLength={defendants.length}
                        isReadOnly={isReadOnly}
                        onUpdateIncidentalEntryDecision={onUpdateIncidentalEntryDecision}
                    />
                </div>
            ) : null}
            </div>

            <SmartHeaderCrossAppealCard
                crossAppealEligibility={crossAppealEligibility}
                isAppealStage={isAppealStage}
            />
        </>
    );
}
