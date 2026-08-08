import React, { memo, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ElementType } from 'react';
import { type ExecutionFile } from '@/app/types/execution';
import {
    fileHasSpecificDeliveryClaim,
    resolveDossierHeaderFields,
    type DossierHeaderResolved,
} from '@/app/utils/executionDossierHeaderFields';
import {
    Link,
} from '@/app/components/ui/lucideIcons';

interface StatuteStatus {
    daysRemaining: number;
    yearsRemaining: number;
    isCritical: boolean;
    isExpired: boolean;
}

const DetailCell = memo(function DetailCell({
    label,
    value,
    className = '',
    valueClassName = '',
    /** عند false تُعرض الخلية حتى لو فارغة (رقم/تاريخ الحكم) */
    hideIfEmpty = true,
}: {
    label: string;
    value: string;
    className?: string;
    valueClassName?: string;
    hideIfEmpty?: boolean;
}) {
    const trimmed = String(value || '').trim();
    if (hideIfEmpty && (!trimmed || trimmed === '—')) return null;
    const display = trimmed || '—';
    const empty = !trimmed || trimmed === '—';
    return (
        <div
            className={`rounded-md border border-amber-500/22 bg-[#0B1120]/50 px-2 py-1 text-right leading-snug ${className}`}
            dir="rtl"
        >
            <p className="text-[10px] leading-none text-amber-200/55">{label}</p>
            <p
                className={`mt-0.5 text-[12px] font-semibold whitespace-normal [unicode-bidi:plaintext] [word-break:keep-all] [overflow-wrap:normal] ${
                    empty ? 'text-slate-500' : 'text-white'
                } ${valueClassName}`}
            >
                {display}
            </p>
        </div>
    );
});

interface DashboardHeaderSectionProps {
    statuteStatus: StatuteStatus | null;
    isAlimonyClaim: boolean;
    executionPaused: boolean;
    handleResumeExecution: () => void;
    stayOfExecutionActive: boolean;
    executionData: ExecutionFile;
    handleLiftStayOfExecution: () => void;
    XCircle: ElementType;
    isHeaderExpanded: boolean;
    toggleHeaderExpanded: () => void;
    /** حقول الشريط من نموذج الإنشاء (بدون قيم افتراضية وهمية) */
    headerFields: DossierHeaderResolved;
    openEditDossierMeta: () => void;
    Pencil: ElementType;
    isEvictionExecutionModule: boolean;
    classificationDisplay: string;
    showJudgmentMeta: boolean;
    docNumber?: string;
    judgmentDateDisplay: string;
    claimTypeArabicDisplay: string;
    evictionPropertyNumber: string;
    evictionPropertyDistrict: string;
    evictionPropertyTypeField: string;
    evictionFullAddressField: string;
    /** هل هذه إضبارة فرعية (إنابة) */
    isSubFile?: boolean;
    /** إنابة نشطة للإضبارة الأم (لإظهار زر مخاطبة الإنابة) */
    hasActiveInaba?: boolean;
    /** الغاية من الإنابة — تُعرض في الحالة الموسعة فقط */
    delegationPurpose?: string;
    /** رمز مشاركة الإضبارة (طلب توحيد الأضابير) */
    linkToken?: string;
    /** نسخ رمز المشاركة */
    onCopyLinkToken?: () => void;
    /** الأضابير الموحّدة */
    linkedDossiers?: ExecutionFile['linkedDossiers'];
    /** فتح إضبارة موحّدة (قراءة السجل الزمني فقط للزميل) */
    onOpenLinkedDossier?: (dossier: NonNullable<ExecutionFile['linkedDossiers']>[number]) => void;
    onRemoveLinkedDossier?: (linkedId: string) => void;
    onRequestTransferFileNumberChange?: () => void;
    /** حفظ رقم/سنة الإضبارة الفرعية */
    onSaveSubFileNumber?: (fileNumber: string, fileYear: string) => void;
    /** تفاصيل الحاوية الموسّعة من الإضبارة الأم (إنابة) — المديرية والرقم يبقيان للفرعية */
    expandedDossierFromParent?: {
        headerFields: DossierHeaderResolved;
        classificationDisplay: string;
        claimTypeArabicDisplay: string;
        showJudgmentMeta: boolean;
        judgmentDateDisplay: string;
        docNumber?: string;
        evictionPropertyNumber: string;
        evictionPropertyDistrict: string;
        evictionPropertyTypeField: string;
        evictionFullAddressField: string;
        isEvictionExecutionModule: boolean;
        openEditDossierMeta: () => void;
        showSpecificDeliveryMeta?: boolean;
    };
}

export const DashboardHeaderSection = memo(function DashboardHeaderSection({
    statuteStatus,
    isAlimonyClaim,
    executionPaused,
    handleResumeExecution,
    stayOfExecutionActive,
    executionData,
    handleLiftStayOfExecution,
    XCircle,
    isHeaderExpanded,
    toggleHeaderExpanded,
    headerFields,
    openEditDossierMeta,
    Pencil,
    isEvictionExecutionModule,
    classificationDisplay,
    showJudgmentMeta,
    docNumber,
    judgmentDateDisplay,
    claimTypeArabicDisplay,
    evictionPropertyNumber,
    evictionPropertyDistrict,
    evictionPropertyTypeField,
    evictionFullAddressField,
    isSubFile,
    hasActiveInaba,
    delegationPurpose,
    linkToken,
    onCopyLinkToken,
    linkedDossiers,
    onOpenLinkedDossier,
    onRemoveLinkedDossier,
    onRequestTransferFileNumberChange,
    onSaveSubFileNumber,
    expandedDossierFromParent,
}: DashboardHeaderSectionProps) {
    const resolvedFromExecution = useMemo(
        () => resolveDossierHeaderFields(executionData),
        [executionData],
    );
    const effectiveHeaderFields = useMemo((): DossierHeaderResolved => {
        const hasIncoming =
            Boolean(headerFields.directorate?.trim()) ||
            Boolean(headerFields.fileNumber?.trim()) ||
            Boolean(headerFields.fileYear?.trim()) ||
            Boolean(headerFields.fileRefDisplay?.trim() && headerFields.fileRefDisplay !== '—');
        if (hasIncoming) return headerFields;
        return resolvedFromExecution;
    }, [headerFields, resolvedFromExecution]);

    const [localHeaderExpanded, setLocalHeaderExpanded] = useState(isHeaderExpanded);
    useEffect(() => {
        setLocalHeaderExpanded(isHeaderExpanded);
    }, [isHeaderExpanded]);
    const headerExpanded = localHeaderExpanded;

    const showSpecificDeliveryMeta = fileHasSpecificDeliveryClaim(executionData);
    const expanded = expandedDossierFromParent ?? {
        headerFields: effectiveHeaderFields,
        classificationDisplay,
        claimTypeArabicDisplay,
        showJudgmentMeta,
        judgmentDateDisplay,
        docNumber,
        evictionPropertyNumber,
        evictionPropertyDistrict,
        evictionPropertyTypeField,
        evictionFullAddressField,
        isEvictionExecutionModule,
        openEditDossierMeta,
        showSpecificDeliveryMeta,
    };
    const showTransferFileNumberChange =
        Boolean(executionData?.transferPendingFileNumberChange) && typeof onRequestTransferFileNumberChange === 'function';
    const [subFileNumberEditorOpen, setSubFileNumberEditorOpen] = useState(false);
    const [subFileNumberDraft, setSubFileNumberDraft] = useState('');
    const [subFileYearDraft, setSubFileYearDraft] = useState('');

    useEffect(() => {
        if (!isSubFile) {
            setSubFileNumberEditorOpen(false);
            return;
        }
        setSubFileNumberDraft(headerFields.fileNumber || '');
        setSubFileYearDraft(headerFields.fileYear || '');
    }, [isSubFile, effectiveHeaderFields.fileNumber, effectiveHeaderFields.fileYear]);

    const subFileRefFilled = Boolean(
        String(effectiveHeaderFields.fileNumber || '').trim() ||
            String(effectiveHeaderFields.fileYear || '').trim()
    );
    const subFileRefDisplay = subFileRefFilled
        ? `${effectiveHeaderFields.fileNumber || '—'} / ${effectiveHeaderFields.fileYear || '—'}`
        : '';

    const handleSaveSubFileNumber = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        e?.preventDefault();
        const num = subFileNumberDraft.trim();
        const year = subFileYearDraft.trim();
        if (!num && !year) return;
        onSaveSubFileNumber?.(num, year);
        setSubFileNumberEditorOpen(false);
    };

    return (
        <>
            {/* STATUTE EXPIRED BANNER */}
            {statuteStatus && statuteStatus.isExpired && !isAlimonyClaim && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-3 mt-3 bg-gradient-to-r from-rose-950/80 to-gray-950/80 border-2 border-rose-500/80 rounded-2xl p-4 shadow-lg shadow-rose-500/30"
                >
                    <div className="flex items-center justify-end gap-3 mb-2">
                        <div className="flex items-center gap-2">
                            <XCircle size={24} className="text-rose-400" />
                            <h3 className="text-rose-400 font-bold text-sm">❌ سقطت قوة التنفيذ</h3>
                        </div>
                    </div>
                    <p className="text-white text-sm text-right mb-2">
                        مضى أكثر من 7 سنوات على آخر إجراء - الإضبارة فقدت قوتها التنفيذية
                    </p>
                    <p className="text-gray-300 text-xs text-right">
                        استشر المحكمة لتحديد الخيارات القانونية المتاحة
                    </p>
                </motion.div>
            )}

            {/* 🆕 V8: EXECUTION PAUSED BANNER */}
            {executionPaused && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-3 mt-3 bg-gradient-to-r from-orange-950/60 to-amber-950/60 border-2 border-amber-500/60 rounded-2xl p-4 shadow-lg shadow-amber-500/20"
                >
                    <div className="flex items-center justify-center gap-3">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-amber-400 animate-pulse"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="10" y1="15" x2="10" y2="9" />
                            <line x1="14" y1="15" x2="14" y2="9" />
                        </svg>
                        <p className="text-amber-300 font-bold text-sm">⏸️ الإضبارة موقوفة للمراجعة</p>
                    </div>
                    <p className="text-gray-300 text-xs text-center mt-2">
                        تم إيقاف جميع المهل الزمنية والإجراءات الجبرية
                    </p>
                    <button
                        type="button"
                        onClick={handleResumeExecution}
                        className="mt-3 w-full rounded-lg border border-emerald-500/40 bg-emerald-950/50 py-2 text-[10px] font-bold text-emerald-100 hover:bg-emerald-950/65"
                    >
                        استئناف التنفيذ
                    </button>
                </motion.div>
            )}

            {stayOfExecutionActive && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sticky top-0 z-30 mx-3 mt-2 rounded-xl border border-yellow-500/40 bg-amber-950/70 p-2.5 shadow-md shadow-yellow-950/20"
                >
                    <div className="flex flex-col gap-1.5 text-right">
                        <p className="text-center text-[11px] font-bold text-yellow-200">تفاصيل الاستئخار</p>
                        {executionData?.stay_of_execution?.court_name && (
                            <p className="text-[9px] leading-snug text-slate-400">
                                {executionData.stay_of_execution.court_name}
                                {executionData.stay_of_execution.decision_number
                                    ? ` — ${executionData.stay_of_execution.decision_number}`
                                    : ''}
                                {executionData.stay_of_execution.next_hearing_date
                                    ? ` — جلسة: ${executionData.stay_of_execution.next_hearing_date}`
                                    : ''}
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={handleLiftStayOfExecution}
                            className="w-full rounded-lg border border-emerald-500/35 bg-emerald-950/50 py-2 text-[10px] font-bold text-emerald-100"
                        >
                            رفع الاستئخار
                        </button>
                    </div>
                </motion.div>
            )}


            {/* 🆕 V19: FILE HEADER — المديرية ورقم الإضبارة + حالة الإضبارة (داخل الحاوية الجوزية) */}
            <div className="mx-3 mt-1.5 mb-1.5">
                <div
                    className={`relative w-full overflow-hidden backdrop-blur-xl bg-[#0B1120]/65 border border-amber-500/35 px-3 py-2.5 shadow-lg shadow-amber-950/25 ring-1 ring-[#D4AF37]/10 touch-manipulation ${
                        headerExpanded ? 'rounded-t-2xl rounded-b-none' : 'rounded-2xl'
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setLocalHeaderExpanded((open) => !open)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setLocalHeaderExpanded((open) => !open);
                        }
                    }}
                    aria-expanded={headerExpanded}
                    aria-label={headerExpanded ? 'طيّ تفاصيل الإضبارة' : 'توسيع تفاصيل الإضبارة'}
                    title={headerExpanded ? 'طيّ التفاصيل' : 'توسيع التفاصيل'}
                >
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-0 opacity-60 [background-image:repeating-linear-gradient(45deg,rgba(230,198,115,0.08)_0,rgba(230,198,115,0.08)_1px,transparent_1px,transparent_14px),repeating-linear-gradient(-45deg,rgba(230,198,115,0.06)_0,rgba(230,198,115,0.06)_1px,transparent_1px,transparent_14px)]" />
                        <div className="absolute -top-28 -right-28 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(230,198,115,0.22),transparent_65%)] blur-2xl" />
                        <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.14),transparent_62%)] blur-2xl" />
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/25 via-transparent to-slate-950/20" />
                    </div>
                    <div
                        className="relative z-10 flex min-h-9 w-full items-center gap-2 cursor-pointer"
                        dir="rtl"
                    >
                        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-0 overflow-hidden text-center leading-none">
                            <span className="shrink-0 text-[1.0625rem] font-extrabold leading-tight text-amber-50 sm:text-lg">
                                {effectiveHeaderFields.directorate || '—'}
                            </span>
                            <span className="shrink-0 text-amber-700/65" aria-hidden>
                                ·
                            </span>
                            <span className="inline-flex shrink-0 flex-col items-center gap-0 leading-none">
                                {isSubFile ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSubFileNumberEditorOpen((v) => !v);
                                            }}
                                            className={`pointer-events-auto shrink-0 tabular-nums text-[1.0625rem] font-bold leading-none transition-all sm:text-lg ${
                                                subFileRefFilled
                                                    ? 'text-indigo-200/95 hover:text-indigo-100'
                                                    : 'animate-pulse text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-violet-200 to-indigo-300 drop-shadow-[0_0_12px_rgba(129,140,248,0.55)] hover:from-indigo-100 hover:to-violet-100'
                                            }`}
                                            title="رقم الإضبارة الفرعية — اضغط للتعديل"
                                        >
                                            {subFileRefFilled ? subFileRefDisplay : 'رقم الإضبارة الفرعية'}
                                        </button>
                                        {subFileNumberEditorOpen ? (
                                            <div
                                                className="pointer-events-auto mt-2 w-full min-w-[220px] rounded-xl border border-indigo-400/35 bg-[#0B1120]/90 p-2.5 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-400/20"
                                                onClick={(e) => e.stopPropagation()}
                                                dir="rtl"
                                            >
                                                <p className="mb-2 text-center text-[10px] font-bold text-indigo-200/90">
                                                    رقم الإضبارة الفرعية
                                                </p>
                                                <div className="flex items-center justify-center gap-2">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={subFileNumberDraft}
                                                        onChange={(e) => setSubFileNumberDraft(e.target.value)}
                                                        placeholder="الرقم"
                                                        className="w-20 rounded-lg border border-indigo-500/30 bg-black/30 px-2 py-1.5 text-center text-sm font-bold text-white outline-none focus:border-indigo-400/60"
                                                    />
                                                    <span className="text-indigo-300/70">/</span>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={subFileYearDraft}
                                                        onChange={(e) => setSubFileYearDraft(e.target.value)}
                                                        placeholder="السنة"
                                                        className="w-16 rounded-lg border border-indigo-500/30 bg-black/30 px-2 py-1.5 text-center text-sm font-bold text-white outline-none focus:border-indigo-400/60"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleSaveSubFileNumber(e)}
                                                    className="mt-2 w-full rounded-lg border border-emerald-500/35 bg-emerald-950/45 py-1.5 text-[10px] font-bold text-emerald-100 hover:bg-emerald-950/60"
                                                >
                                                    حفظ الرقم
                                                </button>
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        {showTransferFileNumberChange ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRequestTransferFileNumberChange?.();
                                                }}
                                                className="pointer-events-auto mb-0.5 text-[10px] font-bold leading-none text-amber-200/85 hover:text-amber-100 transition-colors"
                                            >
                                                هل تريد تغيير الرقم؟
                                            </button>
                                        ) : null}
                                        <span className="shrink-0 tabular-nums text-[1.0625rem] font-bold leading-none text-amber-200/95 sm:text-lg">
                                            {effectiveHeaderFields.fileRefDisplay}
                                        </span>
                                    </>
                                )}
                            </span>
                            {linkToken ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCopyLinkToken?.();
                                    }}
                                    className="pointer-events-auto inline-flex shrink-0 items-center gap-0.5 rounded-md border border-amber-500/20 bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-300/80 hover:bg-amber-950/50 hover:text-amber-200 transition-colors"
                                    title="نسخ رمز المشاركة"
                                >
                                    <Link size={12} />
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {linkedDossiers && linkedDossiers.length > 0 && (
                        <div className="mt-3" dir="rtl">
                            <p className="mb-1.5 text-[10px] font-bold text-amber-400/80 tracking-wide text-center">🔗 الأضابير الموحّدة</p>
                            <div className="flex flex-row flex-wrap items-center justify-center gap-2">
                                {linkedDossiers.map((d) => (
                                    <div
                                        key={d.linkedId}
                                        className="inline-flex items-stretch overflow-hidden rounded-lg border border-blue-500/25 bg-blue-950/25 text-[10px] font-bold text-blue-200/85"
                                    >
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onOpenLinkedDossier?.(d); }}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 transition hover:bg-blue-950/45"
                                        >
                                            <Link size={13} className="text-blue-400" />
                                            {d.fileNumber || '---'} / {d.fileYear || '---'} — {d.directorate || '---'}
                                            {d.type === 'colleague' ? (
                                                <span className="text-[8px] text-yellow-400/70">(زميل)</span>
                                            ) : null}
                                        </button>
                                        {onRemoveLinkedDossier ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemoveLinkedDossier(d.linkedId);
                                                }}
                                                className="inline-flex items-center justify-center border-l border-blue-500/20 px-2 transition hover:bg-blue-950/45"
                                                aria-label="إلغاء الربط"
                                                title="إلغاء الربط"
                                            >
                                                <XCircle size={12} className="text-blue-300/90" />
                                            </button>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* EXPANDED STATE: Document Details Grid */}
                <AnimatePresence initial={false}>
                    {headerExpanded && (
                        <motion.div
                            key="dossier-header-expanded"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="overflow-hidden bg-[#0B1120]/55 border border-t-0 border-amber-500/35 rounded-b-2xl -mt-px"
                        >
                            <div className="space-y-1 px-3 py-2" dir="rtl">
                                {isSubFile ? (
                                    delegationPurpose ? (
                                        <DetailCell
                                            label="الغاية من الإضبارة الفرعية"
                                            value={delegationPurpose}
                                            className="border-emerald-500/25 text-emerald-100/95"
                                        />
                                    ) : (
                                        <p className="text-right text-[10px] text-slate-500">—</p>
                                    )
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            data-exec-interactive="true"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                expanded.openEditDossierMeta();
                                            }}
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-200/90 transition hover:text-amber-100"
                                        >
                                            <Pencil size={12} />
                                            {expanded.isEvictionExecutionModule
                                                ? 'تعديل الإضبارة والحكم والتخلية'
                                                : 'تعديل الإضبارة والحكم'}
                                        </button>
                                        <div className="grid grid-cols-2 gap-1 auto-rows-min">
                                            <DetailCell
                                                label="نوع السند"
                                                value={expanded.headerFields.docType || '—'}
                                            />
                                            <DetailCell
                                                label="التصنيف"
                                                value={expanded.classificationDisplay}
                                            />
                                            <DetailCell
                                                label="المطالبة"
                                                value={expanded.claimTypeArabicDisplay}
                                                className="col-span-2"
                                            />
                                            {expanded.showSpecificDeliveryMeta ? (
                                                <>
                                                    <DetailCell
                                                        label="طبيعة الشيء"
                                                        value={
                                                            expanded.headerFields
                                                                .specificDeliveryItemNatureDisplay ||
                                                            'غير محدد'
                                                        }
                                                        className="col-span-2"
                                                    />
                                                    {!expanded.headerFields
                                                        .specificDeliveryItemNatureDisplay ? (
                                                        <p
                                                            className="col-span-2 rounded-lg border border-amber-500/25 bg-amber-950/20 px-2 py-1.5 text-[10px] leading-relaxed text-amber-200/90"
                                                        >
                                                            إجراءات التسليم في{' '}
                                                            <span className="font-bold">محضر المتابعة</span>
                                                            {' → '}
                                                            <span className="font-bold">الإجراءات الجبرية</span>
                                                            {' — حدّد طبيعة الشيء (منقول / غير منقول) لتفعيلها.'}
                                                        </p>
                                                    ) : null}
                                                    {expanded.headerFields.specificDeliveryItemName ? (
                                                        <DetailCell
                                                            label="الأشياء المراد تسليمها"
                                                            value={
                                                                expanded.headerFields
                                                                    .specificDeliveryItemName
                                                            }
                                                            className="col-span-2"
                                                        />
                                                    ) : null}
                                                </>
                                            ) : null}
                                            {expanded.showJudgmentMeta ? (
                                                <DetailCell
                                                    label="رقم الحكم"
                                                    value={expanded.headerFields.docNumber || '—'}
                                                    valueClassName="font-mono"
                                                    hideIfEmpty={false}
                                                />
                                            ) : null}
                                            {expanded.showJudgmentMeta ? (
                                                <DetailCell
                                                    label="تاريخ الحكم"
                                                    value={expanded.judgmentDateDisplay || '—'}
                                                    hideIfEmpty={false}
                                                />
                                            ) : null}
                                            {expanded.isEvictionExecutionModule ? (
                                                <>
                                                    <DetailCell
                                                        label="رقم العقار"
                                                        value={String(expanded.evictionPropertyNumber || '').trim()}
                                                    />
                                                    <DetailCell
                                                        label="المقاطعة"
                                                        value={String(expanded.evictionPropertyDistrict || '').trim()}
                                                    />
                                                    <div className="col-span-2 grid grid-cols-2 gap-1">
                                                        <DetailCell
                                                            label="صنف العقار"
                                                            value={String(expanded.evictionPropertyTypeField || '').trim()}
                                                        />
                                                        <DetailCell
                                                            label="مكان العقار"
                                                            value={String(expanded.evictionFullAddressField || '').trim()}
                                                        />
                                                    </div>
                                                </>
                                            ) : null}
                                            {delegationPurpose ? (
                                                <DetailCell
                                                    label="الغاية من الإنابة"
                                                    value={delegationPurpose}
                                                    className="col-span-2 border-emerald-500/25 text-emerald-100/95"
                                                />
                                            ) : null}
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
});
