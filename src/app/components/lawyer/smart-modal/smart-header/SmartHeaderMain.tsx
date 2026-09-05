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
    GLASS_CHIP,
} from './smartHeaderPresentation';
import { IraqiCaseNoDisplay } from './IraqiCaseNoDisplay';
import type { SmartHeaderProps } from './smartHeaderTypes';
import { useSmartHeaderDerivedState } from './useSmartHeaderDerivedState';
import { SmartHeaderThirdPartyCases } from './SmartHeaderThirdPartyCases';
import { SmartHeaderCrossAppealCard } from './SmartHeaderCrossAppealCard';

export function SmartHeader({ formData, isPaused, incidentalCases = [], stages = [], currentStageId = '', pauseReason = '', onResume, onPause, status = 'نشطة', isInterrupted = false, interruptionData = null, linkedCaseNo = '', onInterrupt, onAbandon, onNotification, onStageClick, stageHistory = [], isReadOnly = false, hasCrossAppeal = false, onCancelCrossAppeal, onAddCrossAppeal, notificationStatus = 'waiting', onToggleNotification, caseType, onCassationDecision, isPleadingsClosed = false, pleadingDoorReopened = false, onReopenPleadings, onRegisterOpponentAppeal, onCassationAppeal, hasJudgment = false, onDefaultObjection, onWaiveObjection, onOtherAppeals, provisionalOrders = [], onAddProvisionalOrder, thirdParties = [], representedParty = null, onUpdateIncidentalEntryDecision, crossAppealEligibility: crossAppealEligibilityProp }: SmartHeaderProps) {
    const derived = useSmartHeaderDerivedState({
        formData, isPaused, incidentalCases, stages, currentStageId, pauseReason, onResume, onPause, status,
        isInterrupted, interruptionData, linkedCaseNo, onInterrupt, onAbandon, onNotification, onStageClick,
        stageHistory, isReadOnly, hasCrossAppeal, onCancelCrossAppeal, onAddCrossAppeal, notificationStatus,
        onToggleNotification, caseType, onCassationDecision, isPleadingsClosed, pleadingDoorReopened,
        onReopenPleadings, onRegisterOpponentAppeal, onCassationAppeal, hasJudgment, onDefaultObjection,
        onWaiveObjection, onOtherAppeals, provisionalOrders, onAddProvisionalOrder, thirdParties, representedParty,
        onUpdateIncidentalEntryDecision, crossAppealEligibility: crossAppealEligibilityProp,
    });

    const {
        partiesSectionRef, showClaimValue, setShowClaimValue,
        showPreviousCourt, setShowPreviousCourt, plaintiffs, defendants, interpleaders,
        crossAppealEligibility, p1Role, p2Role, hasAppealContext, hasFirstInstanceData,
        isCassation: _isCassation, isAppealStage, courtReferralView, courtName, showCourtChip, showJudgeChip, judgeChipValue,
        lawsuitTypeLabel, claimValueLabel, awaitingOpponentAppeal, showPleadingLockChrome,
        isLockedArchive, activeThirdPartyCases, affiliativeThirdParties, selfClaimThirdParties,
        hasHeaderActions: _hasHeaderActions, containerStyle, hasPartiesSection,
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
            <div className={`px-3 relative z-10 ${hasPartiesSection ? 'pt-2 pb-1.5' : 'py-2'}`}>
                <div className={`flex items-start justify-between gap-2 ${hasPartiesSection ? '' : ''}`}>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                type="button"
                                onClick={scrollToPartiesSection}
                                className="text-[22px] sm:text-[24px] font-black text-[#E6C673] tracking-wide font-sans leading-none truncate max-w-full text-right touch-manipulation min-h-[44px]"
                                title="الانتقال إلى أطراف الدعوى"
                                data-testid="smart-dossier-case-no"
                            >
                                <span className="inline-block max-w-full truncate">
                                    <IraqiCaseNoDisplay caseNo={formData.caseNo} />
                                </span>
                            </button>
                            {lawsuitTypeLabel ? (
                                <button
                                    type="button"
                                    onClick={() => setShowClaimValue((v) => !v)}
                                    className={`${GLASS_CHIP} bg-[#E6C673]/12 border-[#E6C673]/28 text-[#E6C673] max-w-[min(100%,20rem)] touch-manipulation cursor-pointer hover:bg-[#E6C673]/18 transition-colors text-[11px] px-2 py-1 inline-flex items-center gap-1 min-w-0`}
                                    title={lawsuitTypeLabel}
                                >
                                    <span className="text-[#E6C673]/60 font-bold text-[10px] shrink-0">نوع الدعوى</span>
                                    <span className="font-black text-[12px] truncate min-w-0">{lawsuitTypeLabel}</span>
                                </button>
                            ) : null}
                            {pleadingDoorReopened ? (
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
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 min-w-0">
                            {showCourtChip ? (
                            <div
                                className="relative inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-1"
                                data-testid="smart-dossier-court"
                            >
                                <span className="shrink-0 text-[9px] font-bold text-white/35">المحكمة</span>
                                <span className="truncate text-[11px] font-bold text-white/92 leading-snug" title={courtName || 'اسم المحكمة غير مدخل'}>
                                    {courtName || '—'}
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
                            ) : null}
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
                                <span className="inline-flex min-w-0 items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] text-white/40">
                                    <span className="shrink-0 text-white/30 font-bold">الأساس</span>
                                    <span dir="ltr" className="tabular-nums">
                                        <IraqiCaseNoDisplay caseNo={formData.firstInstanceCaseNumber} />
                                    </span>
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-start">
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
                        {isAppealStageName(formData?.stageName) && crossAppealEligibility.filedCrossAppellants.length > 0 && onCancelCrossAppeal && !isReadOnly ? (
                            <button type="button"
                                onClick={onCancelCrossAppeal}
                                className={`${GLASS_CHIP} bg-indigo-500/15 border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/22`}
                                title="إلغاء الاستئناف المتقابل"
                            >
                                <ArrowRightLeft size={10} />
                                متقابل
                            </button>
                        ) : null}
                    </div>
                </div>
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
