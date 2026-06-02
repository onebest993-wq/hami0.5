import React, { Fragment, useEffect, useState } from 'react';
import { ChevronDown, Gavel, GitMerge, MapPin, Pencil, Scissors, Trash2, Unlock, Zap } from 'lucide-react';
import type { PhysicalLocation, StageConclusion } from './criminalStore';
import { isInvestigationStoredStage } from './criminalStageUtils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

const PHYSICAL_LOCATION_PRESETS: ReadonlyArray<{ value: PhysicalLocation; label: string }> = [
    { value: 'prosecution', label: 'لدى الادعاء العام' },
    { value: 'judge_desk', label: 'على مكتب القاضي' },
    { value: 'investigator_room', label: 'في غرفة المحقق' },
    { value: 'police_station', label: 'في مركز الشرطة' },
    { value: 'archive', label: 'في الأرشيف' },
    { value: 'custom', label: 'مكان مخصص...' },
];

export type CriminalDashboardHeaderTitle = {
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
}: CriminalDashboardHeaderProps) => {
    const [locationLocal, setLocationLocal] = useState<PhysicalLocation>(physicalLocation);
    const [customNameLocal, setCustomNameLocal] = useState<string>(String(physicalLocationCustomName ?? ''));

    useEffect(() => {
        setLocationLocal(physicalLocation);
        setCustomNameLocal(String(physicalLocationCustomName ?? ''));
    }, [physicalLocation, physicalLocationCustomName]);

    const locationLabel = (loc: PhysicalLocation, custom: string) => {
        if (loc === 'judge_desk') return 'على مكتب القاضي';
        if (loc === 'investigator_room') return 'في غرفة المحقق';
        if (loc === 'prosecution') return 'لدى الادعاء العام';
        if (loc === 'police_station') return 'في مركز الشرطة';
        if (loc === 'archive') return 'في الأرشيف';
        return custom.trim() ? custom.trim() : 'مكان مخصص';
    };

    const isInvestigationStage = isInvestigationStoredStage(stage);

    const canShowSeverance = Boolean(showSeverance && onOpenSeverance);

    const hasAdminMenu =
        canManageDossier ||
        showMergeCases ||
        showReopenClosedCase ||
        canShowSeverance;

    const applyPhysicalLocation = (loc: PhysicalLocation, customName?: string) => {
        setLocationLocal(loc);
        if (loc !== 'custom') {
            setCustomNameLocal('');
            onUpdatePhysicalLocation(loc);
            return;
        }
        const name = String(customName ?? customNameLocal).trim();
        setCustomNameLocal(name);
        onUpdatePhysicalLocation('custom', name);
    };

    const infoPillClass =
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 whitespace-normal break-words print:border-slate-300 print:bg-white print:text-black';

    /**
     * 💎 شَريط القيادة السيادي العلوي — أَزرار مُوَحَّدة الارتفاع (h-10) والزوايا (rounded-xl)
     *    بِثيم Diamond Glassmorphism. هذا الـ class الأَساسي يَنطبق على كُلّ زِرّ في الشَريط،
     *    وَيُستَكمل بِأَلوان مُتَخَصِّصة (ذَهَبية لِلسيادي، رَمادية شَفافة لِلإجرائية).
     */
    const unifiedHeaderButtonBase =
        'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0 disabled:opacity-40 disabled:pointer-events-none';

    /** زِرّ القرار الختامي — خَلفية ذَهَبية زُجاجية (السيادي الحَدث الأكبر للإضبارة). */
    const finalDecisionButtonClass =
        `${unifiedHeaderButtonBase} bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/25 data-[state=open]:bg-[#d4af37]/25`;

    /** أَزرار الإجراءات/الموقع — زُجاج رَمادي/أَبيض شَفاف مُوَحَّد. */
    const glassHeaderButtonClass =
        `${unifiedHeaderButtonBase} bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 data-[state=open]:bg-white/10 data-[state=open]:ring-1 data-[state=open]:ring-white/20`;

    const adminButtonClass = glassHeaderButtonClass;
    const locationButtonClass = glassHeaderButtonClass;

    const displayCourtName = (() => {
        const raw = String(headerTitle.courtLine ?? '').trim();
        return raw || null;
    })();
    const titleText = displayCourtName ?? headerTitle.primary;
    const subtitleText =
        displayCourtName && headerTitle.primary && headerTitle.primary !== displayCourtName
            ? headerTitle.primary
            : null;

    type TitleLineSegment = { text: string; prominent?: boolean; compact?: boolean };
    const titleLineSegments: TitleLineSegment[] = [{ text: titleText, prominent: true }];
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
        Boolean(onOpenTrash);
    const showHeaderToolbarRow = hasHeaderToolbar || showFinalDecisionButton || showFrozenBadge;
    const hasPills =
        isUnifiedParentDossier ||
        mergedCaseDisplayLinks.length > 0 ||
        hasPendingBail;

    const titleLineClass = (segment: TitleLineSegment) =>
        segment.prominent
            ? 'text-xl md:text-2xl font-bold leading-tight whitespace-normal break-words bg-gradient-to-b from-white to-white/85 bg-clip-text text-transparent [text-shadow:0_0_14px_rgba(255,255,255,0.12)] print:text-black print:bg-none print:text-black'
            : segment.compact
              ? 'text-sm font-semibold text-gray-300/90 whitespace-normal break-words min-w-0 print:text-black/70'
              : 'text-sm md:text-base font-medium text-gray-300 whitespace-normal break-words print:text-black/70';

    const renderHeaderToolbar = () => (
        <>
            {hasAdminMenu ? (
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className={adminButtonClass}
                            title="إجراءات إدارية على الإضبارة"
                        >
                            <Zap className="h-4 w-4 shrink-0 opacity-90" />
                            <span>إجراءات الإضبارة</span>
                            <ChevronDown className="h-4 w-4 shrink-0 opacity-80" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        sideOffset={8}
                        collisionPadding={16}
                        className="z-[300] min-w-[18rem] border border-white/10 bg-slate-900/95 backdrop-blur-md text-white font-['Tajawal'] shadow-xl shadow-black/40 p-1"
                    >
                        {showMergeCases ? (
                            <DropdownMenuItem
                                disabled={mergeCasesDisabled}
                                onSelect={(e) => {
                                    e.preventDefault();
                                    if (mergeCasesDisabled) return;
                                    window.setTimeout(() => onOpenMergeCases(), 0);
                                }}
                                title={
                                    mergeCasesDisabled
                                        ? 'لا توجد إضابير أخرى بنفس المرحلة الإجرائية لضمها'
                                        : undefined
                                }
                                className="gap-2 text-sm font-bold focus:bg-white/10 focus:text-white data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
                            >
                                <GitMerge className="h-4 w-4 text-fuchsia-300" />
                                <span className="flex flex-col gap-0.5 items-start">
                                    <span>ضم إضبارة مرتبطة</span>
                                    {mergeCasesDisabled ? (
                                        <span className="text-[10px] font-bold text-white/45 whitespace-normal break-words">
                                            لا توجد إضابير بنفس المرحلة الإجرائية متاحة للضم
                                        </span>
                                    ) : null}
                                </span>
                            </DropdownMenuItem>
                        ) : null}
                        {showReopenClosedCase ? (
                            <DropdownMenuItem
                                onSelect={(e) => {
                                    e.preventDefault();
                                    window.setTimeout(() => onOpenReopenClosedCase(), 0);
                                }}
                                className="cursor-pointer gap-2 text-sm font-bold focus:bg-white/10 focus:text-white"
                            >
                                <Unlock className="h-4 w-4 text-amber-300" />
                                إعادة فتح الدعوى
                            </DropdownMenuItem>
                        ) : null}
                        {canShowSeverance ? (
                            <DropdownMenuItem
                                onSelect={(e) => {
                                    e.preventDefault();
                                    window.setTimeout(() => onOpenSeverance?.(), 0);
                                }}
                                className="cursor-pointer gap-2 text-sm font-bold focus:bg-white/10 focus:text-white"
                            >
                                <Scissors className="h-4 w-4 text-sky-300" />
                                تفريق الإضبارة
                            </DropdownMenuItem>
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : null}

            {showEditHeaderInfo && onEditHeaderInfo ? (
                <button
                    type="button"
                    onClick={onEditHeaderInfo}
                    title="تعديل اسم المحكمة والمادة وأرقام الإضبارة"
                    aria-label="تعديل الترويسة"
                    className={`${unifiedHeaderButtonBase} !h-10 !w-10 !px-0 bg-[#E6C673]/12 border border-[#E6C673]/45 text-[#E6C673] hover:bg-[#E6C673]/22`}
                >
                    <Pencil className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                </button>
            ) : null}

            {isInvestigationStage ? (
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            title="موقع الإضبارة المادي — اضغط لتغيير الموضع"
                            className={locationButtonClass}
                        >
                            <MapPin className="h-4 w-4 shrink-0 opacity-90" />
                            <span className="truncate max-w-[9rem]">
                                {locationLabel(
                                    physicalLocation,
                                    String(physicalLocationCustomName ?? ''),
                                )}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 opacity-80" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        sideOffset={8}
                        collisionPadding={16}
                        className="z-[300] min-w-[14rem] border border-white/10 bg-slate-900/95 backdrop-blur-md text-white font-['Tajawal'] shadow-xl shadow-black/40 p-1"
                    >
                        <div className="px-2 py-1.5 text-[10px] font-black text-white/45">
                            موقع الإضبارة
                        </div>
                        {PHYSICAL_LOCATION_PRESETS.map((opt) => (
                            <DropdownMenuItem
                                key={opt.value}
                                onSelect={() => applyPhysicalLocation(opt.value)}
                                className={`cursor-pointer text-sm font-bold focus:bg-white/10 focus:text-white ${
                                    locationLocal === opt.value ? 'bg-white/10 text-white' : ''
                                }`}
                            >
                                {opt.label}
                            </DropdownMenuItem>
                        ))}
                        <div
                            className="border-t border-white/10 p-2 space-y-1.5"
                            onPointerDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                        >
                            <div className="text-[10px] font-black text-white/45">
                                تسمية مكان مخصص
                            </div>
                            <input
                                value={customNameLocal}
                                onChange={(e) => setCustomNameLocal(e.target.value)}
                                onBlur={() => {
                                    if (locationLocal === 'custom' || customNameLocal.trim()) {
                                        applyPhysicalLocation('custom', customNameLocal);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        applyPhysicalLocation('custom', customNameLocal);
                                    }
                                }}
                                placeholder="اكتب المكان..."
                                className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs font-bold text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/25"
                            />
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : null}

            {onOpenTrash ? (
                <button
                    type="button"
                    onClick={onOpenTrash}
                    title="فتح سلة المهملات"
                    className={`${glassHeaderButtonClass} !h-10 !w-10 !px-0 relative text-white/80 hover:text-[#E6C673]`}
                >
                    {trashCount > 0 ? (
                        <span
                            className="pointer-events-none absolute -top-1.5 left-1/2 z-10 flex h-4 min-w-4 -translate-x-1/2 items-center justify-center rounded-full bg-[#E6C673] px-1 text-[9px] font-black leading-none text-[#0B1021]"
                            aria-hidden
                        >
                            {trashCount > 99 ? '99+' : trashCount}
                        </span>
                    ) : null}
                    <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                </button>
            ) : null}
        </>
    );

    return (
        <>
            <div className="w-full px-4 md:px-6 pt-3 pb-1.5 print:p-0">
                <div
                    className="max-w-6xl mx-auto w-full flex flex-col gap-2 p-3 md:p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl print:bg-white print:border-slate-300 print:backdrop-blur-none print:shadow-none print:p-0 print:gap-3 relative"
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
                    {showHeaderToolbarRow ? (
                        <div className="flex flex-row flex-wrap items-center gap-2 w-full min-w-0 print:hidden">
                            {hasHeaderToolbar ? (
                                <div className="flex flex-row flex-wrap items-center gap-2 shrink-0 min-w-0">
                                    {renderHeaderToolbar()}
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

                    <div className="flex flex-row flex-wrap items-baseline gap-x-2 gap-y-1 w-full min-w-0">
                        {titleLineSegments.map((segment, i) => (
                            <Fragment key={`${segment.text}-${i}`}>
                                {i > 0 ? (
                                    <span
                                        className="text-[#E6C673]/45 text-xs shrink-0 select-none"
                                        aria-hidden
                                    >
                                        ·
                                    </span>
                                ) : null}
                                <span className={`${titleLineClass(segment)} ${segment.compact ? 'min-w-0' : 'shrink-0'}`}>
                                    {segment.text}
                                </span>
                            </Fragment>
                        ))}
                        {isMutualComplaint ? (
                            <>
                                <span className="text-[#E6C673]/45 text-sm shrink-0 select-none" aria-hidden>
                                    ·
                                </span>
                                <span
                                    className="inline-flex shrink-0 items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] md:text-[11px] font-black text-amber-100 whitespace-nowrap print:border-amber-500/40 print:text-amber-700"
                                    title="إضبارة جزائية ناشئة عن شكوى متقابلة (ازدواجية الصفة)"
                                >
                                    ⚖️ شكوى متقابلة
                                </span>
                            </>
                        ) : null}
                    </div>

                    {hasPills ? (
                        <div className="flex flex-wrap gap-2 items-center">
                            {isUnifiedParentDossier ? (
                                <span className={infoPillClass} title="إضبارة موحدة">
                                    📂 إضبارة موحدة (جامعة)
                                </span>
                            ) : null}
                            {mergedCaseDisplayLinks.map((link) => {
                                /**
                                 * نص الشارة المعروض: يَستعمل عند توفّره `primaryLabel`
                                 * (الذي يَتسامح مع غياب رقم الإضبارة بعرض أسماء المتهمين بَدلاً)،
                                 * وإلا يَعود إلى السلوك القديم.
                                 */
                                const primary =
                                    String(link.primaryLabel ?? '').trim() ||
                                    (link.caseNumber && link.caseNumber !== '—'
                                        ? link.caseNumber
                                        : 'إضبارة دون رقم');
                                const tooltip = link.detailLabel || `إضبارة مضمومة: ${primary}`;
                                const clickable = Boolean(onOpenMergedChildCase && link.isResolved !== false);
                                const content = (
                                    <>
                                        <span aria-hidden>🔗</span>
                                        <span className="text-gray-400 font-bold">ضمّ:</span>
                                        <span className="text-white">{primary}</span>
                                    </>
                                );
                                return clickable ? (
                                    <button
                                        key={link.id}
                                        type="button"
                                        title={tooltip}
                                        onClick={() => onOpenMergedChildCase?.(link.id)}
                                        className={`${infoPillClass} cursor-pointer hover:bg-white/10 transition`}
                                    >
                                        {content}
                                    </button>
                                ) : (
                                    <span
                                        key={link.id}
                                        title={tooltip}
                                        className={`${infoPillClass} opacity-70`}
                                    >
                                        {content}
                                    </span>
                                );
                            })}
                            {hasPendingBail ? (
                                <>
                                    <span
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-b from-amber-900/30 to-amber-950/45 border border-amber-700/35 text-sm font-bold text-amber-200 whitespace-normal break-words"
                                        title="كفالة معلقة (مهلة 72 ساعة)"
                                    >
                                        ⏳ كفالة معلقة (72 ساعة)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={onConfirmPendingBail}
                                        disabled={!canConfirmPendingBail}
                                        className="print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-b from-emerald-900/35 to-emerald-950/55 border border-emerald-700/35 text-sm font-bold text-emerald-200 hover:from-emerald-800/50 hover:border-emerald-600/50 hover:text-emerald-100 transition-all disabled:opacity-40 disabled:pointer-events-none"
                                    >
                                        مضي المدة وتصديق الكفالة
                                    </button>
                                </>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    );
};
