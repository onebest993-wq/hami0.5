import React from 'react';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import type { PhysicalLocation, StageConclusion } from './criminalStore';
import { isInvestigationStoredStage } from './criminalStageUtils';
import { useColleagueConsultation } from '@/app/components/lawyer/caseShare/ColleagueConsultationContext';
import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';
import { resolveDossierHeaderNavVisibility } from '@/app/components/lawyer/dashboard/resolveDossierHeaderNavVisibility';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';
import { finalDecisionButtonClass } from './criminalDashboardHeaderChrome';
import { CriminalDashboardHeaderToolbar } from './CriminalDashboardHeaderToolbar';
import {
    CriminalDashboardHeaderTitleBlock,
    type CriminalDashboardHeaderTitleSegment,
} from './CriminalDashboardHeaderTitleBlock';
import { CriminalDashboardHeaderStatusPills } from './CriminalDashboardHeaderStatusPills';

type CriminalDashboardHeaderTitle = {
    primary: string;
    /** يُعرض فقط عند وجود قيمة (لا شرطة —) */
    secondary?: string;
    secondaryLabel?: string;
    /** أسطر مرجعية إضافية (رقم الدعوى، الادعاء العام، …) */
    metaParts?: { label: string; value: string }[];
    /** اسم محكمة التحقيق/الموضوع — سطر مميز بجانب مكان الإيداع */
    courtLine?: string;
};

export type CriminalDashboardHeaderProps = {
    headerTitle: CriminalDashboardHeaderTitle;
    stage: string;
    activeLegalArticle: string;
    /**
     * ⚖️ شارة «الشكوى المتقابلة» تَظهر بجانب المادة في الترويسة بَدلاً من تكرارها
     * على بطاقات الأطراف — هي خاصية كيس (case-level) لا خاصية طرف.
     */
    isMutualComplaint?: boolean;
    isFrozen: boolean;
    hasPendingBail: boolean;
    canConfirmPendingBail: boolean;
    onConfirmPendingBail: () => void;
    showReopenClosedCase: boolean;
    onOpenReopenClosedCase: () => void;
    /** إجراءات إدارية مسموحة (غير مؤرشفة وغير مضمومة كتابة) */
    canManageDossier: boolean;
    showMergeCases: boolean;
    /**
     * عند `true`: بند «ضم إضبارة مرتبطة» يَظهر مُعطَّلاً مع شرح أنه لا توجد إضابير
     * بنفس المرحلة الإجرائية متاحة للضم — أوضح بكثير من إخفائه كلياً.
     */
    mergeCasesDisabled?: boolean;
    onOpenMergeCases: () => void;
    finalDecision?: StageConclusion;
    physicalLocation: PhysicalLocation;
    physicalLocationCustomName?: string;
    onUpdatePhysicalLocation: (location: PhysicalLocation, customName?: string) => void;
    mergedCaseDisplayLinks?: {
        id: string;
        caseNumber: string;
        defendants?: string[];
        primaryLabel?: string;
        detailLabel?: string;
        isResolved?: boolean;
    }[];
    /** إضبارة أم ضمت أضابير أخرى (ضم متعدد). */
    isUnifiedParentDossier?: boolean;
    /** فتح إضبارة مضمومة (الانتقال إلى لوحتها). */
    onOpenMergedChildCase?: (caseId: string) => void;
    canEditIdentity?: boolean;
    /** زر تعديل ظاهر على الترويسة — يفتح مودال تصحيح البيانات. */
    showEditHeaderInfo?: boolean;
    onEditHeaderInfo?: () => void;
    /** إظهار خيار «تفريق الدعوى (شطر إضبارة)» في القائمة المنسدلة. */
    showSeverance?: boolean;
    /** فتح مودال اختيار المتهمين المنقولين للإضبارة الجديدة. */
    onOpenSeverance?: () => void;
    /**
     * 🏛️ زِرّ «إصدار القرار الختامي» السيادي — يَحتلّ المَكان الذي كانت فيه شارة المرحلة
     *    الثابتة، ويُمَيَّز بِخَلفية ذَهَبية زجاجية. اختياري — يَظهر فَقَط حين تَسمح المرحلة.
     */
    showFinalDecisionAction?: boolean;
    /** نَصّ زِرّ القرار الختامي — يَتَغَيَّر حَسب سياق المرحلة. */
    finalDecisionLabel?: string;
    /** تَلميح (tooltip) لِزِرّ القرار الختامي. */
    finalDecisionTitle?: string;
    /** مُعالج فَتح مودال إصدار القرار الختامي / المعارضة الغيابية. */
    onOpenFinalDecision?: () => void;
    /** رسالة تشميع الإضبارة التحقيقية (نهائي / تنازل). */
    investigationDossierSealLabel?: string | null;
    investigationDossierIsFinalClosure?: boolean;
    onOpenTrash?: () => void;
    trashCount?: number;
    /** إضبارة تحقيق مُجمّدة بغلق مؤقت — زر إنهاء الغلق في زاوية الترويسة. */
    showEndTemporaryClosureAction?: boolean;
    onEndTemporaryClosure?: () => void;
    /** رجوع إلى مخزن الإضابير */
    onNavBack?: () => void;
    /** مغادرة إلى الواجهة الرئيسية */
    onNavExit?: () => void;
    /** تنقل متداخل داخل الإضبارة — يُظهر زر الرجوع بدل الإغلاق */
    dossierNestedNav?: boolean;
};

export const CriminalDashboardHeader = ({
    headerTitle,
    stage,
    activeLegalArticle,
    isMutualComplaint = false,
    isFrozen,
    hasPendingBail,
    canConfirmPendingBail,
    onConfirmPendingBail,
    showReopenClosedCase,
    onOpenReopenClosedCase,
    canManageDossier,
    showMergeCases,
    mergeCasesDisabled = false,
    onOpenMergeCases,
    finalDecision,
    physicalLocation,
    physicalLocationCustomName,
    onUpdatePhysicalLocation,
    mergedCaseDisplayLinks = [],
    isUnifiedParentDossier = false,
    onOpenMergedChildCase,
    canEditIdentity = false,
    showEditHeaderInfo = false,
    onEditHeaderInfo,
    showSeverance = false,
    onOpenSeverance,
    showFinalDecisionAction = false,
    finalDecisionLabel,
    finalDecisionTitle,
    onOpenFinalDecision,
    investigationDossierSealLabel = null,
    investigationDossierIsFinalClosure = false,
    onOpenTrash,
    trashCount = 0,
    showEndTemporaryClosureAction = false,
    onEndTemporaryClosure,
    onNavBack,
    onNavExit,
    dossierNestedNav = false,
}: CriminalDashboardHeaderProps) => {
    const consultation = useColleagueConsultation();

    const showDossierNav = Boolean(onNavExit);
    const dossierNavVisibility = resolveDossierHeaderNavVisibility(dossierNestedNav);
    const isInvestigationStage = isInvestigationStoredStage(stage);

    const canShowSeverance = Boolean(showSeverance && onOpenSeverance);

    const hasAdminMenu =
        canManageDossier ||
        showMergeCases ||
        showReopenClosedCase ||
        canShowSeverance;

    const displayCourtName = (() => {
        const raw = String(headerTitle.courtLine ?? '').trim();
        return raw || null;
    })();
    const titleText = displayCourtName ?? headerTitle.primary;
    const subtitleText =
        displayCourtName && headerTitle.primary && headerTitle.primary !== displayCourtName
            ? headerTitle.primary
            : null;

    const titleLineSegments: CriminalDashboardHeaderTitleSegment[] = [{ text: titleText, prominent: true }];
    if (subtitleText) titleLineSegments.push({ text: subtitleText });
    if (activeLegalArticle && activeLegalArticle !== '—') {
        titleLineSegments.push({ text: `المادة: ${activeLegalArticle}` });
    }
    if (headerTitle.metaParts?.length) {
        for (const part of headerTitle.metaParts) {
            const value = String(part.value ?? '').trim();
            if (!value) continue;
            const label = String(part.label ?? '').trim();
            titleLineSegments.push({
                text: label ? `${label}: ${value}` : value,
                compact: true,
            });
        }
    } else if (headerTitle.secondary) {
        titleLineSegments.push({
            text: `${headerTitle.secondaryLabel ?? 'رقم الدعوى'}: ${headerTitle.secondary}`,
            compact: true,
        });
    }

    const showFinalDecisionButton = Boolean(showFinalDecisionAction && onOpenFinalDecision);
    const showFrozenBadge = isFrozen && !showEndTemporaryClosureAction;
    const frozenBadgeLabel = String(investigationDossierSealLabel ?? '').trim() || 'مختومة إجرائياً';
    const frozenBadgeTitle = investigationDossierSealLabel
        ? `${investigationDossierSealLabel}${
              investigationDossierIsFinalClosure
                  ? ' — لا تُعاد الإضبارة إلا بنقض القرار بالتمييز.'
                  : ''
          }`
        : 'هذه الإضبارة مختومة ومغلقة إجرائياً';
    const hasHeaderToolbar =
        hasAdminMenu ||
        (showEditHeaderInfo && onEditHeaderInfo) ||
        isInvestigationStage ||
        Boolean(onOpenTrash) ||
        Boolean(consultation);
    const showHeaderToolbarRow = hasHeaderToolbar || showFinalDecisionButton || showFrozenBadge;
    const hasPills =
        isUnifiedParentDossier ||
        mergedCaseDisplayLinks.length > 0 ||
        hasPendingBail;

    return (
        <>
            <div className="w-full px-4 md:px-6 pt-3 pb-1.5 print:p-0">
                <div
                    className={`max-w-6xl mx-auto w-full flex flex-col gap-2.5 p-3 md:p-3.5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg print:bg-white print:border-slate-300 print:backdrop-blur-none print:shadow-none print:p-0 print:gap-3 relative min-h-[5.5rem] ${
                        showEndTemporaryClosureAction ? 'pe-2 ps-14 sm:ps-16' : ''
                    }`}
                    dir="rtl"
                >
                    {showEndTemporaryClosureAction && onEndTemporaryClosure ? (
                        <button
                            type="button"
                            onClick={onEndTemporaryClosure}
                            title="⏸️ الإضبارة التحقيقية مُجمّدة بسبب قرار الغلق المؤقت — لا يُتابع التحقيق حتى إنهاء الغلق أو نقض القرار بالتمييز."
                            className="absolute top-3 left-3 z-10 print:hidden rounded-xl border border-amber-500/45 bg-amber-950/70 px-2.5 py-1.5 text-[10px] md:text-[11px] font-black text-amber-100 hover:bg-amber-900/80 transition whitespace-normal break-words max-w-[min(52vw,15rem)] leading-snug"
                        >
                            إعادة الشكوى وإنهاء الغلق المؤقت
                        </button>
                    ) : null}
                    {showDossierNav ? (
                        <div className="flex w-full items-center gap-2 print:hidden shrink-0">
                            <DossierHeaderNavButtons
                                onBack={onNavBack}
                                onExit={onNavExit!}
                                showBack={dossierNavVisibility.showBack}
                                showExit={dossierNavVisibility.showExit}
                                backTestId={CRIMINAL_DOSSIER_TEST_IDS.back}
                                exitTestId={CRIMINAL_DOSSIER_TEST_IDS.exit}
                            />
                            <div className="min-w-0 flex-1" />
                            <span className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0" aria-hidden />
                            <span className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0" aria-hidden />
                        </div>
                    ) : null}
                    {showHeaderToolbarRow ? (
                        <div className="flex flex-row flex-wrap items-center gap-2 w-full min-w-0 print:hidden shrink-0">
                            {hasHeaderToolbar ? (
                                <div className="flex flex-row flex-wrap items-center gap-2 shrink-0 min-w-0">
                                    <CriminalDashboardHeaderToolbar
                                        hasAdminMenu={hasAdminMenu}
                                        showMergeCases={showMergeCases}
                                        mergeCasesDisabled={mergeCasesDisabled}
                                        onOpenMergeCases={onOpenMergeCases}
                                        showReopenClosedCase={showReopenClosedCase}
                                        onOpenReopenClosedCase={onOpenReopenClosedCase}
                                        canShowSeverance={canShowSeverance}
                                        onOpenSeverance={onOpenSeverance}
                                        showEditHeaderInfo={showEditHeaderInfo}
                                        onEditHeaderInfo={onEditHeaderInfo}
                                        isInvestigationStage={isInvestigationStage}
                                        physicalLocation={physicalLocation}
                                        physicalLocationCustomName={physicalLocationCustomName}
                                        onUpdatePhysicalLocation={onUpdatePhysicalLocation}
                                        onOpenTrash={onOpenTrash}
                                        trashCount={trashCount}
                                    />
                                </div>
                            ) : null}
                            {showFrozenBadge ? (
                                <span
                                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-500/35 bg-red-950/35 px-2 py-0.5 text-[10px] md:text-[11px] font-black text-red-200/95 whitespace-nowrap print:border-red-400/40 print:text-red-700"
                                    title={frozenBadgeTitle}
                                >
                                    <span aria-hidden>🔒</span>
                                    <span>{frozenBadgeLabel}</span>
                                </span>
                            ) : null}
                            {showFinalDecisionButton ? (
                                <button
                                    type="button"
                                    onClick={onOpenFinalDecision}
                                    title={finalDecisionTitle ?? 'إصدار القرار الختامي لِلإضبارة'}
                                    className={`${finalDecisionButtonClass} shrink-0 ${hasHeaderToolbar || showFrozenBadge ? 'ms-auto' : 'me-auto'}`}
                                >
                                    <Gavel className="h-4 w-4 shrink-0" aria-hidden />
                                    <span>{finalDecisionLabel ?? 'إصدار القرار الختامي'}</span>
                                </button>
                            ) : null}
                        </div>
                    ) : null}

                    <CriminalDashboardHeaderTitleBlock
                        titleText={titleText}
                        titleLineSegments={titleLineSegments}
                        isMutualComplaint={isMutualComplaint}
                    />

                    {hasPills ? (
                        <CriminalDashboardHeaderStatusPills
                            isUnifiedParentDossier={isUnifiedParentDossier}
                            mergedCaseDisplayLinks={mergedCaseDisplayLinks}
                            onOpenMergedChildCase={onOpenMergedChildCase}
                            hasPendingBail={hasPendingBail}
                            canConfirmPendingBail={canConfirmPendingBail}
                            onConfirmPendingBail={onConfirmPendingBail}
                        />
                    ) : null}
                </div>
            </div>
        </>
    );
};
