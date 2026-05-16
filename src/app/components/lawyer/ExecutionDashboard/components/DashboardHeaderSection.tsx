import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ElementType } from 'react';
import { type ExecutionFile } from '@/app/types/execution';
import type { DossierActionType } from './DossierActionsModal';
import {
    Link,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

interface StatuteStatus {
    daysRemaining: number;
    yearsRemaining: number;
    isCritical: boolean;
    isExpired: boolean;
}

interface AICitation {
    url?: string;
    title?: string;
}

interface AICopilotSuggestion {
    id?: string | number;
    title?: string;
    type?: string;
    priority?: string;
    rationale?: string;
    description?: string;
    citations?: AICitation[];
    draftText?: string;
}

interface AICopilotResult {
    summary?: string;
    suggestions?: AICopilotSuggestion[];
}

interface DashboardHeaderSectionProps {
    statuteStatus: StatuteStatus | null;
    isAlimonyClaim: boolean;
    executionPaused: boolean;
    handleResumeExecution: () => void;
    stayOfExecutionActive: boolean;
    executionData: ExecutionFile;
    handleLiftStayOfExecution: () => void;
    aiCopilotEnabled: boolean;
    Bot: ElementType;
    runExecutionAICopilot: (trigger: 'manual' | 'auto') => Promise<void> | void;
    aiCopilotLoading: boolean;
    aiCopilotError: string | null;
    aiCopilotResult: AICopilotResult | null;
    copyCopilotDraftText: (suggestion: AICopilotSuggestion) => Promise<void> | void;
    applyCopilotSuggestionAsTask: (suggestion: AICopilotSuggestion) => void;
    applyCopilotSuggestionAsNote: (suggestion: AICopilotSuggestion) => void;
    XCircle: ElementType;
    isHeaderExpanded: boolean;
    toggleHeaderExpanded: () => void;
    walnutHeaderClaimShort: string;
    walnutHeaderExecShort: string;
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
    evictionPremisesUseResolved: 'residential' | 'commercial';
    onDossierAction: (action: DossierActionType) => void;
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
}

export const DashboardHeaderSection: React.FC<DashboardHeaderSectionProps> = ({
    statuteStatus,
    isAlimonyClaim,
    executionPaused,
    handleResumeExecution,
    stayOfExecutionActive,
    executionData,
    handleLiftStayOfExecution,
    aiCopilotEnabled,
    Bot,
    runExecutionAICopilot,
    aiCopilotLoading,
    aiCopilotError,
    aiCopilotResult,
    copyCopilotDraftText,
    applyCopilotSuggestionAsTask,
    applyCopilotSuggestionAsNote,
    XCircle,
    isHeaderExpanded,
    toggleHeaderExpanded,
    walnutHeaderClaimShort,
    walnutHeaderExecShort,
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
    evictionPremisesUseResolved,
    onDossierAction,
    isSubFile,
    hasActiveInaba,
    delegationPurpose,
    linkToken,
    onCopyLinkToken,
    linkedDossiers,
    onOpenLinkedDossier,
    onRemoveLinkedDossier,
    onRequestTransferFileNumberChange,
}) => {
    const showTransferFileNumberChange =
        Boolean(executionData?.transferPendingFileNumberChange) && typeof onRequestTransferFileNumberChange === 'function';
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

            {aiCopilotEnabled && (
                <div className="mx-3 mt-3 rounded-2xl border border-slate-700/40 bg-slate-900/55 p-4 shadow-md shadow-black/20">
                    <div className="mb-2 flex items-center justify-between gap-2" dir="rtl">
                        <div className="flex items-center gap-2">
                            <Bot size={15} className="text-[#D4AF37]/90" />
                            <p className="text-xs font-bold text-slate-100">مُحلل حامي الذكي</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void runExecutionAICopilot('manual')}
                            disabled={aiCopilotLoading}
                            className="rounded-lg border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-2.5 py-1 text-[10px] font-bold text-[#D4AF37] transition hover:bg-[#D4AF37]/15 disabled:opacity-50"
                        >
                            {aiCopilotLoading ? 'جارٍ التحليل...' : 'تحليل الآن'}
                        </button>
                    </div>
                    {aiCopilotError ? (
                        <p className="mb-2 rounded-lg border border-rose-500/35 bg-rose-950/30 px-2.5 py-2 text-[10px] text-rose-200">
                            {aiCopilotError}
                        </p>
                    ) : null}
                    {aiCopilotError ? (
                        <p className="mb-2 rounded-lg border border-amber-500/35 bg-amber-950/25 px-2.5 py-2 text-[10px] text-amber-200">
                            لم يتم تحميل تحليل جديد حالياً. جرّب زر "تحليل الآن" بعد تحسن الاتصال.
                        </p>
                    ) : aiCopilotResult?.summary ? (
                        <p className="mb-2 text-[11px] leading-relaxed text-slate-200">
                            {aiCopilotResult.summary}
                        </p>
                    ) : (
                        <p className="mb-2 text-[10px] text-slate-400">
                            فعّل التحليل الآن للحصول على توصيات مرتبطة بحالة الإضبارة.
                        </p>
                    )}
                    {Array.isArray(aiCopilotResult?.suggestions) &&
                    aiCopilotResult.suggestions.length > 0 ? (
                        <div className="space-y-2">
                            {aiCopilotResult.suggestions.slice(0, 3).map((s, idx) => (
                                <div
                                    key={String(s?.id || idx)}
                                    className="rounded-xl border border-slate-600/30 bg-slate-900/50 p-2.5"
                                    dir="rtl"
                                >
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                        <p className="text-[11px] font-bold text-slate-100">
                                            {String(s?.title || 'إجراء مقترح')}
                                        </p>
                                        <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-300">
                                            {(() => {
                                                const normalizedType = String(
                                                    s?.type ||
                                                        (s?.priority === 'critical'
                                                            ? 'حرج'
                                                            : s?.priority === 'high'
                                                              ? 'مهم'
                                                              : 'تحسيني')
                                                );
                                                if (normalizedType === 'تحري_مالي')
                                                    return '🕵️‍♂️ تحري_مالي';
                                                if (normalizedType === 'إجراء_فوري')
                                                    return '⚡ إجراء_فوري';
                                                return normalizedType;
                                            })()}
                                        </span>
                                    </div>
                                    <p className="text-[10px] leading-relaxed text-slate-300">
                                        {String(s?.rationale || s?.description || '')}
                                    </p>
                                    {Array.isArray(s?.citations) && s.citations.length > 0 ? (
                                        <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
                                            {s.citations.slice(0, 2).map((c, cIdx) => (
                                                <a
                                                    key={`${idx}-${cIdx}`}
                                                    href={String(c?.url || '#')}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="rounded-md border border-slate-600/40 bg-slate-800/50 px-2 py-0.5 text-[9px] text-slate-300 hover:bg-slate-800/70"
                                                >
                                                    {String(c?.title || 'مصدر')}
                                                </a>
                                            ))}
                                        </div>
                                    ) : null}
                                    <div className="mt-2 flex flex-row-reverse gap-1.5">
                                        {String(s?.draftText || '').trim().length > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => void copyCopilotDraftText(s)}
                                                className="rounded-lg border border-slate-600/40 bg-slate-800/60 px-2 py-1 text-[10px] font-bold text-slate-200 hover:border-[#D4AF37]/30"
                                            >
                                                📝 توليد/نسخ الطلب
                                            </button>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => applyCopilotSuggestionAsTask(s)}
                                            className="rounded-lg border border-emerald-400/40 bg-emerald-900/25 px-2 py-1 text-[10px] font-bold text-emerald-100"
                                        >
                                            إضافة كتذكير
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyCopilotSuggestionAsNote(s)}
                                            className="rounded-lg border border-amber-400/40 bg-amber-900/25 px-2 py-1 text-[10px] font-bold text-amber-100"
                                        >
                                            حفظ كملاحظة
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            )}

            {/* 🆕 V19: FILE HEADER — المديرية ورقم الإضبارة + حالة الإضبارة (داخل الحاوية الجوزية) */}
            <div className="mx-3 mt-3">
                <div
                    className={`relative w-full overflow-hidden backdrop-blur-xl bg-[#0B1120]/65 border border-amber-500/35 px-3.5 py-2 shadow-lg shadow-amber-950/25 ring-1 ring-[#D4AF37]/10 sm:px-4 ${
                        isHeaderExpanded ? 'rounded-t-2xl rounded-b-none' : 'rounded-2xl'
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={toggleHeaderExpanded}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleHeaderExpanded();
                        }
                    }}
                    aria-label={isHeaderExpanded ? 'طيّ تفاصيل الإضبارة' : 'توسيع تفاصيل الإضبارة'}
                    title={isHeaderExpanded ? 'طيّ التفاصيل' : 'توسيع التفاصيل'}
                >
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-0 opacity-60 [background-image:repeating-linear-gradient(45deg,rgba(230,198,115,0.08)_0,rgba(230,198,115,0.08)_1px,transparent_1px,transparent_14px),repeating-linear-gradient(-45deg,rgba(230,198,115,0.06)_0,rgba(230,198,115,0.06)_1px,transparent_1px,transparent_14px)]" />
                        <div className="absolute -top-28 -right-28 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(230,198,115,0.22),transparent_65%)] blur-2xl" />
                        <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.14),transparent_62%)] blur-2xl" />
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/25 via-transparent to-slate-950/20" />
                    </div>
                    <div className="grid w-full min-w-0 grid-cols-[1fr,auto,1fr] items-center gap-2 cursor-pointer">
                        <div className="min-w-0 flex justify-start" aria-hidden dir="rtl">
                            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-950/20 px-2 py-1 text-[10px] font-bold text-amber-200/70">
                                {isHeaderExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                التفاصيل
                            </span>
                        </div>
                        <div className="flex min-w-0 items-center justify-center px-1 py-0" dir="rtl">
                            <div className="flex min-w-0 max-w-full items-center justify-center gap-x-2 overflow-hidden whitespace-nowrap text-center">
                                <span className="shrink-0 text-[1.0625rem] font-extrabold leading-tight text-amber-50 sm:text-lg">
                                    {executionData.directorate || 'تنفيذ الكرخ'}
                                </span>
                                <>
                                    <span className="shrink-0 text-amber-700/65" aria-hidden>·</span>
                                    <div className="flex flex-col items-center gap-0.5">
                                        {showTransferFileNumberChange ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRequestTransferFileNumberChange?.();
                                                }}
                                                className="text-[10px] font-bold text-amber-200/85 hover:text-amber-100 transition-colors"
                                            >
                                                هل تريد تغيير الرقم؟
                                            </button>
                                        ) : null}
                                        <span className="shrink-0 tabular-nums text-[1.0625rem] font-bold text-amber-200/95 sm:text-lg">
                                            {executionData.fileNumber || '0000'} / {executionData.fileYear || '2026'}
                                        </span>
                                    </div>
                                    {linkToken ? (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onCopyLinkToken?.(); }}
                                            className="inline-flex items-center gap-0.5 rounded-md border border-amber-500/20 bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-300/80 hover:bg-amber-950/50 hover:text-amber-200 transition-colors"
                                            title="نسخ رمز المشاركة"
                                        >
                                            <Link size={12} />
                                        </button>
                                    ) : null}
                                </>

                                {walnutHeaderClaimShort ? (
                                    <>
                                        <span className="shrink-0 text-amber-600/55" aria-hidden>
                                            ·
                                        </span>
                                        <span className="max-w-[min(14rem,50vw)] min-w-0 shrink truncate text-[1.0625rem] font-semibold text-amber-100/95 sm:max-w-[18rem] sm:text-lg">
                                            {walnutHeaderClaimShort}
                                        </span>
                                    </>
                                ) : null}
                                {walnutHeaderExecShort ? (
                                    <>
                                        <span className="shrink-0 text-amber-600/55" aria-hidden>
                                            ·
                                        </span>
                                        <span className="max-w-[min(12rem,44vw)] min-w-0 shrink truncate text-[1.0625rem] font-semibold text-amber-100/95 sm:max-w-[15rem] sm:text-lg">
                                            {walnutHeaderExecShort}
                                        </span>
                                    </>
                                ) : null}
                            </div>
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
                <AnimatePresence>
                    {isHeaderExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-[#0B1120]/55 border-2 border-t-0 border-amber-500/40 rounded-b-2xl -mt-[2px]"
                        >
                            <div className="grid grid-cols-2 gap-2 px-4 py-3 text-sm sm:grid-cols-4">
                                <div className="col-span-2 flex justify-end sm:col-span-4">
                                    <button
                                        type="button"
                                        onClick={openEditDossierMeta}
                                        className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-950/20 px-2.5 py-1.5 text-[10px] font-bold text-amber-200 transition hover:bg-amber-950/40"
                                    >
                                        <Pencil size={12} />
                                        {isEvictionExecutionModule
                                            ? 'تعديل رقم الإضبارة والمديرية والحكم والتخلية'
                                            : 'تعديل رقم الإضبارة والمديرية والحكم'}
                                    </button>
                                </div>
                                <div className="rounded-xl border border-amber-500/15 bg-black/20 px-2.5 py-2 text-right">
                                    <p className="text-gray-400 text-xs mb-1">نوع السند:</p>
                                    <p className="text-white font-semibold">
                                        {executionData.docType || 'قرار حكم قضائي'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-amber-500/15 bg-black/20 px-2.5 py-2 text-right">
                                    <p className="text-gray-400 text-xs mb-1">التصنيف:</p>
                                    <p className="text-white font-semibold">{classificationDisplay}</p>
                                </div>
                                {showJudgmentMeta ? (
                                    <div className="rounded-xl border border-amber-500/15 bg-black/20 px-2.5 py-2 text-right">
                                        <p className="text-gray-400 text-xs mb-1">رقم الحكم:</p>
                                        <p className="text-white font-semibold font-mono break-all">
                                            {docNumber?.trim() || '—'}
                                        </p>
                                    </div>
                                ) : null}
                                {showJudgmentMeta ? (
                                    <div className="rounded-xl border border-amber-500/15 bg-black/20 px-2.5 py-2 text-right">
                                        <p className="text-gray-400 text-xs mb-1">تاريخ الحكم:</p>
                                        <p className="text-white font-semibold">
                                            {judgmentDateDisplay || '—'}
                                        </p>
                                    </div>
                                ) : null}
                                <div className="col-span-2 rounded-xl border border-amber-500/15 bg-black/20 px-2.5 py-2 text-right sm:col-span-2">
                                    <p className="text-gray-400 text-xs mb-1">المطالبة:</p>
                                    <p className="text-white font-semibold break-words">
                                        {claimTypeArabicDisplay || executionData.executionType || '—'}
                                    </p>
                                </div>
                                {isEvictionExecutionModule &&
                                    (String(evictionPropertyNumber || '').trim() ||
                                        String(evictionPropertyDistrict || '').trim() ||
                                        String(evictionPropertyTypeField || '').trim() ||
                                        String(evictionFullAddressField || '').trim()) && (
                                        <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-3 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-4">
                                            {String(evictionPropertyNumber || '').trim() ? (
                                                <div className="rounded-xl border border-amber-500/15 bg-slate-900/35 px-2.5 py-2 text-right">
                                                    <p className="text-gray-400 text-xs mb-1">رقم العقار:</p>
                                                    <p className="text-white font-semibold break-words">
                                                        {evictionPropertyNumber}
                                                    </p>
                                                </div>
                                            ) : null}
                                            {String(evictionPropertyDistrict || '').trim() ? (
                                                <div className="rounded-xl border border-amber-500/15 bg-slate-900/35 px-2.5 py-2 text-right">
                                                    <p className="text-gray-400 text-xs mb-1">المقاطعة:</p>
                                                    <p className="text-white font-semibold break-words">
                                                        {evictionPropertyDistrict}
                                                    </p>
                                                </div>
                                            ) : null}
                                            {String(evictionPropertyTypeField || '').trim() ? (
                                                <div className="rounded-xl border border-amber-500/15 bg-slate-900/35 px-2.5 py-2 text-right">
                                                    <p className="text-gray-400 text-xs mb-1">صنف العقار:</p>
                                                    <p className="text-white font-semibold break-words">
                                                        {String(evictionPropertyTypeField || '').trim() || '—'}
                                                    </p>
                                                </div>
                                            ) : null}
                                            {isEvictionExecutionModule ? (
                                                <div className="rounded-xl border border-amber-500/15 bg-slate-900/35 px-2.5 py-2 text-right">
                                                    <p className="text-gray-400 text-xs mb-1">
                                                        استعمال العقار:
                                                    </p>
                                                    <p className="text-[#E6C673] text-xs font-semibold break-words">
                                                        {evictionPremisesUseResolved === 'commercial'
                                                            ? 'محل / تجاري'
                                                            : 'سكني'}
                                                    </p>
                                                </div>
                                            ) : null}
                                            {String(evictionFullAddressField || '').trim() ? (
                                                <div className="col-span-2 rounded-xl border border-amber-500/15 bg-slate-900/35 px-2.5 py-2 text-right sm:col-span-2 lg:col-span-2">
                                                    <p className="text-gray-400 text-xs mb-1">
                                                        مكان العقار (العنوان):
                                                    </p>
                                                    <p className="text-white font-semibold text-xs leading-relaxed break-words">
                                                        {evictionFullAddressField}
                                                    </p>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                {delegationPurpose ? (
                                    <div className="col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-2.5 py-2 text-right sm:col-span-4">
                                        <p className="text-gray-400 text-xs mb-1">الغاية من الإنابة:</p>
                                        <p className="text-white font-semibold break-words">{delegationPurpose}</p>
                                    </div>
                                ) : null}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};
