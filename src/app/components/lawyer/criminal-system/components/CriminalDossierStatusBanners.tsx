import type { ReactNode } from 'react';
import { PendingSeveranceResumeBar } from './PendingSeveranceResumeBar';

export type InAbsentiaBannerItem = {
    id: string;
    name: string;
    isExpired?: boolean;
    needsNotification?: boolean;
    daysLeft?: number | string;
    objectionDeadline?: string;
};

export type CriminalDossierTopBannersProps = {
    shouldShowMandatoryCassationBanner: boolean;
    shouldShowArticle3DeadlineBanner: boolean;
    article3ElapsedDays: number | null | undefined;
    pendingSeveranceParentMatch: boolean;
    isInlineSeveranceFormOpen: boolean;
    parentCaseId: string;
    onResumeSeverance: () => void;
    isPrejudicialFrozen: boolean;
    isInterventionReview: boolean;
    isCassationFilterReadOnly: boolean;
    selectedJourneyNodeLabel?: string;
    isOwnerAccessDenied?: boolean;
    isOrphanLegacyCase?: boolean;
    onClaimCaseOwnership?: () => void;
};

export type CriminalDossierMidBannersProps = {
    isDashboardReadOnly: boolean;
    mergedIntoCaseId: string;
    mergedIntoCaseNumber: string;
    onOpenMergedParent?: (caseId: string) => void;
    isSentToCassation: boolean;
    cassationNumber?: string;
    cassationSentDate?: string;
    inAbsentiaBanners: InAbsentiaBannerItem[];
    isDefense: boolean;
    onFileInAbsentiaObjection: (defendantId: string) => void;
};

/** لافتات أعلى الهيدر */
export function CriminalDossierTopBanners(props: CriminalDossierTopBannersProps): ReactNode {
    const {
        shouldShowMandatoryCassationBanner,
        shouldShowArticle3DeadlineBanner,
        article3ElapsedDays,
        pendingSeveranceParentMatch,
        isInlineSeveranceFormOpen,
        parentCaseId,
        onResumeSeverance,
        isPrejudicialFrozen,
        isInterventionReview,
        isCassationFilterReadOnly,
        selectedJourneyNodeLabel,
        isOwnerAccessDenied = false,
        isOrphanLegacyCase = false,
        onClaimCaseOwnership,
    } = props;

    return (
        <>
            {isOwnerAccessDenied ? (
                <div className="w-full border-b-2 border-rose-400/50 bg-rose-950/45 text-rose-100 print:hidden">
                    <div className="max-w-6xl mx-auto w-full px-4 py-3 font-black text-sm text-center whitespace-normal break-words">
                        {isOrphanLegacyCase
                            ? 'إضبارة تراثية بلا مالك مسجّل — للعرض فقط حتى تملّكها للتعديل.'
                            : 'هذه الإضبارة للعرض فقط — لا يمكن تعديلها (ملكية محامٍ آخر).'}
                        {isOrphanLegacyCase && onClaimCaseOwnership ? (
                            <button
                                type="button"
                                onClick={onClaimCaseOwnership}
                                className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#E6C673] px-4 py-2 text-[#0B1021] font-black text-sm hover:brightness-110 active:brightness-95 transition touch-manipulation"
                            >
                                تملّك الإضبارة للتعديل
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}
            {shouldShowMandatoryCassationBanner ? (
                <div className="w-full border-b-2 border-red-300 bg-red-600 text-white print:hidden">
                    <div className="max-w-6xl mx-auto w-full px-4 py-3 font-black text-sm text-center whitespace-normal break-words">
                        تنبيه: يُستحسن توثيق إرسال الإضبارة إلى محكمة التمييز خلال المهلة القانونية (10 أيام).
                    </div>
                </div>
            ) : null}
            {shouldShowArticle3DeadlineBanner ? (
                <div className="w-full border-b border-amber-500/40 bg-amber-500/15 text-amber-100 print:hidden">
                    <div className="max-w-6xl mx-auto w-full px-4 py-3 font-black text-sm text-center whitespace-normal break-words">
                        تنبيه (المادة 3/6 أصول): مضى أكثر من 90 يوماً على تاريخ العلم بالواقعة
                        {typeof article3ElapsedDays === 'number' ? ` (${article3ElapsedDays} يوم)` : ''}.
                    </div>
                </div>
            ) : null}
            {pendingSeveranceParentMatch && !isInlineSeveranceFormOpen ? (
                <PendingSeveranceResumeBar parentCaseId={parentCaseId} onResume={onResumeSeverance} />
            ) : null}
            {isPrejudicialFrozen ? (
                <div className="w-full border-b-2 border-red-500/50 bg-red-950/40 text-red-100 print:hidden">
                    <div className="max-w-6xl mx-auto w-full px-4 py-3 font-black text-sm text-center whitespace-normal break-words">
                        ⏳ الدعوى مستأخرة جزائياً بقرار قضائي لحين الفصل بالدعوى المرتبطة
                    </div>
                </div>
            ) : null}
            {isInterventionReview ? (
                <div className="w-full border-b-2 border-yellow-400/60 bg-yellow-400/15 text-yellow-100 print:hidden">
                    <div className="max-w-6xl mx-auto w-full px-4 py-3 font-black text-sm text-center whitespace-normal break-words">
                        تدخل تمييزي (م 264/ب): الإضبارة قيد مراجعة التدخل؛ تعليق الإجراءات المادية لحين سحب أصل الأوراق.
                    </div>
                </div>
            ) : null}
            {isCassationFilterReadOnly ? (
                <div className="w-full border-b border-violet-500/35 bg-violet-500/10 print:hidden">
                    <div className="max-w-6xl mx-auto w-full px-4 py-2 text-violet-100 font-black text-xs text-center whitespace-normal break-words">
                        فلتر لوائح التمييز — «{selectedJourneyNodeLabel ?? '—'}» (قراءة فقط)
                    </div>
                </div>
            ) : null}
        </>
    );
}

/** لافتات بعد شريط الرحلة وقبل شبكة الأطراف */
export function CriminalDossierMidBanners(props: CriminalDossierMidBannersProps): ReactNode {
    const {
        isDashboardReadOnly,
        mergedIntoCaseId,
        mergedIntoCaseNumber,
        onOpenMergedParent,
        isSentToCassation,
        cassationNumber,
        cassationSentDate,
        inAbsentiaBanners,
        isDefense,
        onFileInAbsentiaObjection,
    } = props;

    return (
        <>
            {isDashboardReadOnly && mergedIntoCaseId ? (
                <div className="w-full border-b-2 border-amber-500/50 bg-amber-950/40 print:hidden">
                    <div className="max-w-5xl mx-auto w-full px-4 py-4 text-center">
                        <p className="text-amber-100 font-black text-sm md:text-base whitespace-normal break-words leading-relaxed">
                            ⚠️ هذه الإضبارة مغلقة إدارياً لصدور قرار قضائي بضمها إلى الإضبارة{' '}
                            <span className="text-white">{mergedIntoCaseNumber || '—'}</span>. لمتابعة الإجراءات
                            والتايم لاين الحالي، اضغط هنا:{' '}
                            <button
                                type="button"
                                onClick={() => onOpenMergedParent?.(mergedIntoCaseId)}
                                className="inline text-[#E6C673] font-black underline underline-offset-2 hover:brightness-110 transition"
                            >
                                الانتقال للإضبارة الأم
                            </button>
                        </p>
                    </div>
                </div>
            ) : null}
            {isSentToCassation ? (
                <div className="w-full border-b border-slate-700 bg-blue-500/10 p-4">
                    <div className="max-w-5xl mx-auto w-full">
                        <div className="rounded-2xl border border-blue-500/30 bg-blue-950/30 p-4 text-blue-100 font-black text-sm whitespace-normal break-words text-center">
                            ✈️ الأوراق أرسلت إلى محكمة التمييز بموجب الكتاب المرقم{' '}
                            {String(cassationNumber ?? '').trim() || '—'} بتاريخ{' '}
                            {String(cassationSentDate ?? '').trim() || '—'} — الإضبارة المحلية معلقة بانتظار التدقيق
                            التمييزي
                        </div>
                    </div>
                </div>
            ) : null}
            {inAbsentiaBanners.length ? (
                <div className="w-full border-b border-slate-700 p-4">
                    <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-3">
                        <div
                            className={
                                inAbsentiaBanners[0]?.isExpired
                                    ? 'rounded-2xl border border-red-500/40 bg-red-900/20 px-4 py-2 text-red-200 font-black text-sm whitespace-normal break-words'
                                    : 'rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-amber-200 font-black text-sm whitespace-normal break-words'
                            }
                        >
                            {inAbsentiaBanners[0]?.needsNotification
                                ? `⏳ حكم غيابي بحق المتهم (${inAbsentiaBanners[0]?.name}) — بانتظار تسجيل التبليغ الرسمي لبدء احتساب ميعاد الاعتراض (م 243).`
                                : inAbsentiaBanners[0]?.isExpired
                                  ? 'ℹ️ تنبيه استرشادي: تجاوز ميعاد الاعتراض؛ قد يُرد شكلاً (مع إمكانية الدفع ببطلان التبليغ/عذر مشروع).'
                                  : `⚠️ صدر حكم غيابي بحق المتهم (${inAbsentiaBanners[0]?.name}) — متبقي ${
                                        inAbsentiaBanners[0]?.daysLeft ?? '—'
                                    } يوم للاعتراض حتى ${inAbsentiaBanners[0]?.objectionDeadline || '—'}.`}
                        </div>
                        {isDefense ? (
                            <button
                                type="button"
                                onClick={() => onFileInAbsentiaObjection(inAbsentiaBanners[0]!.id)}
                                className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black px-4 py-2 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                            >
                                📝 تقديم لائحة الاعتراض وتسليم المتهم
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </>
    );
}
