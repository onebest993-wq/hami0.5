import React, { useEffect, useState } from 'react';
import type { InvestigationPapersAt } from '../../criminalStore';

export type VenueIdentityCorrectionModalProps = {
    open: boolean;
    error?: string;
    showInvestigationCourt: boolean;
    investigationCourtName: string;
    showTrialCourt: boolean;
    trialCourtName: string;
    showDeposition: boolean;
    papersAt: InvestigationPapersAt;
    depositionEntityName: string;
    showLegalArticle?: boolean;
    legalArticle?: string;
    showReferenceNumbers?: boolean;
    courtCaseNumber?: string;
    publicProsecutionNumber?: string;
    onClose: () => void;
    onSubmit: (payload: {
        investigationCourtName?: string;
        trialCourtName?: string;
        papersAt?: InvestigationPapersAt;
        depositionEntityName?: string;
        legalArticle?: string;
        courtCaseNumber?: string;
        publicProsecutionNumber?: string;
        reason?: string;
    }) => void;
};

export const VenueIdentityCorrectionModal = ({
    open,
    error,
    showInvestigationCourt,
    investigationCourtName,
    showTrialCourt,
    trialCourtName,
    showDeposition,
    papersAt,
    depositionEntityName,
    showLegalArticle = true,
    legalArticle = '',
    showReferenceNumbers = false,
    courtCaseNumber = '',
    publicProsecutionNumber = '',
    onClose,
    onSubmit,
}: VenueIdentityCorrectionModalProps) => {
    const [invCourt, setInvCourt] = useState('');
    const [trialCourt, setTrialCourt] = useState('');
    const [localPapersAt, setLocalPapersAt] = useState<InvestigationPapersAt>('مركز شرطة');
    const [entityName, setEntityName] = useState('');
    const [localLegalArticle, setLocalLegalArticle] = useState('');
    const [localCourtCaseNumber, setLocalCourtCaseNumber] = useState('');
    const [localPublicProsecutionNumber, setLocalPublicProsecutionNumber] = useState('');
    const [reason, setReason] = useState('');
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (!open) return;
        setInvCourt(String(investigationCourtName ?? '').trim());
        setTrialCourt(String(trialCourtName ?? '').trim());
        setLocalPapersAt(papersAt === 'مكتب تحقيق قضائي' ? 'مكتب تحقيق قضائي' : 'مركز شرطة');
        setEntityName(String(depositionEntityName ?? '').trim());
        setLocalLegalArticle(String(legalArticle ?? '').trim());
        setLocalCourtCaseNumber(String(courtCaseNumber ?? '').trim());
        setLocalPublicProsecutionNumber(String(publicProsecutionNumber ?? '').trim());
        setReason('');
        setLocalError('');
    }, [
        open,
        investigationCourtName,
        trialCourtName,
        papersAt,
        depositionEntityName,
        legalArticle,
        courtCaseNumber,
        publicProsecutionNumber,
    ]);

    if (!open) return null;

    const entityLabel =
        localPapersAt === 'مكتب تحقيق قضائي' ? 'اسم مكتب التحقيق' : 'اسم مركز الشرطة';
    const displayedError = error || localError;

    const handleSubmit = () => {
        const why = reason.trim();

        const payload: {
            investigationCourtName?: string;
            trialCourtName?: string;
            papersAt?: InvestigationPapersAt;
            depositionEntityName?: string;
            legalArticle?: string;
            courtCaseNumber?: string;
            publicProsecutionNumber?: string;
            reason?: string;
        } = why ? { reason: why } : {};

        let hasChange = false;

        if (showInvestigationCourt) {
            const next = invCourt.trim();
            if (!next) {
                setLocalError('أدخل اسم محكمة التحقيق.');
                return;
            }
            if (next !== String(investigationCourtName ?? '').trim()) {
                payload.investigationCourtName = next;
                hasChange = true;
            }
        }

        if (showTrialCourt) {
            const next = trialCourt.trim();
            if (!next) {
                setLocalError('أدخل اسم المحكمة.');
                return;
            }
            if (next !== String(trialCourtName ?? '').trim()) {
                payload.trialCourtName = next;
                hasChange = true;
            }
        }

        if (showDeposition) {
            const nextName = entityName.trim();
            if (!nextName) {
                setLocalError(`أدخل ${entityLabel}.`);
                return;
            }
            const papersChanged = localPapersAt !== papersAt;
            const nameChanged = nextName !== String(depositionEntityName ?? '').trim();
            if (papersChanged || nameChanged) {
                payload.papersAt = localPapersAt;
                payload.depositionEntityName = nextName;
                hasChange = true;
            }
        }

        if (showLegalArticle) {
            const nextArticle = localLegalArticle.trim();
            const priorArticle = String(legalArticle ?? '').trim();
            if (nextArticle !== priorArticle) {
                if (!nextArticle) {
                    setLocalError('أدخل مادة الاتهام.');
                    return;
                }
                payload.legalArticle = nextArticle;
                hasChange = true;
            }
        }

        if (showReferenceNumbers) {
            const nextCourtNum = localCourtCaseNumber.trim();
            const nextPp = localPublicProsecutionNumber.trim();
            const priorCourtNum = String(courtCaseNumber ?? '').trim();
            const priorPp = String(publicProsecutionNumber ?? '').trim();
            if (nextCourtNum !== priorCourtNum) {
                payload.courtCaseNumber = nextCourtNum;
                hasChange = true;
            }
            if (nextPp !== priorPp) {
                payload.publicProsecutionNumber = nextPp;
                hasChange = true;
            }
        }

        if (!hasChange) {
            setLocalError('لم يُجرَ أي تغيير — عدّل البيانات أو ألغِ.');
            return;
        }

        setLocalError('');
        onSubmit(payload);
    };

    return (
        <div
            className="fixed inset-0 z-[240] bg-black/62 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden shadow-lg">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm whitespace-normal break-words">
                        تعديل بيانات الترويسة
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] min-w-[44px] px-3 text-white/60 hover:text-white transition text-xs font-bold rounded-md hover:bg-slate-700/60 touch-manipulation"
                    >
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-4 max-h-[min(80vh,640px)] overflow-y-auto">
                    {showReferenceNumbers ? (
                        <div className="space-y-3 rounded-xl border border-sky-500/30 bg-sky-950/20 p-3">
                            <div className="text-sky-200 text-xs font-black">أرقام الإضبارة</div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1">رقم الدعوى</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={localCourtCaseNumber}
                                    onChange={(e) => setLocalCourtCaseNumber(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1">رقم الادعاء العام</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={localPublicProsecutionNumber}
                                    onChange={(e) => setLocalPublicProsecutionNumber(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    ) : null}

                    {showLegalArticle ? (
                        <div className="space-y-2 rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/5 p-3">
                            <div className="text-[#E6C673] text-xs font-black">مادة الاتهام</div>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 placeholder:text-white/30"
                                value={localLegalArticle}
                                onChange={(e) => setLocalLegalArticle(e.target.value)}
                                placeholder="413 ق.ع — يمكن تعديل المادة يدوياً إذا غيّر القاضي الوصف"
                                autoComplete="off"
                            />
                        </div>
                    ) : null}

                    {showInvestigationCourt ? (
                        <div className="space-y-2 rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/5 p-3">
                            <div className="text-[#E6C673] text-xs font-black">محكمة التحقيق</div>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={invCourt}
                                onChange={(e) => setInvCourt(e.target.value)}
                                autoComplete="off"
                            />
                        </div>
                    ) : null}

                    {showTrialCourt ? (
                        <div className="space-y-2 rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/5 p-3">
                            <div className="text-[#E6C673] text-xs font-black">محكمة الموضوع</div>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={trialCourt}
                                onChange={(e) => setTrialCourt(e.target.value)}
                                autoComplete="off"
                            />
                        </div>
                    ) : null}

                    {showDeposition ? (
                        <div className="space-y-3 rounded-xl border border-slate-600/50 bg-slate-800/30 p-3">
                            <div className="text-white/80 text-xs font-black">جهة إيداع الإضبارة</div>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={localPapersAt}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setLocalPapersAt(v === 'مكتب تحقيق قضائي' ? 'مكتب تحقيق قضائي' : 'مركز شرطة');
                                }}
                            >
                                <option value="مركز شرطة">مركز شرطة</option>
                                <option value="مكتب تحقيق قضائي">مكتب تحقيق قضائي</option>
                            </select>
                            <div>
                                <label className="block text-white/70 text-xs mb-1">{entityLabel}</label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={entityName}
                                    onChange={(e) => setEntityName(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    ) : null}

                    <div>
                        <label className="block text-white/70 text-xs mb-1">سبب التصحيح (اختياري)</label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[88px] resize-none"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="مثال: خطأ مطبعي في اسم المحكمة أو مركز الشرطة..."
                        />
                    </div>

                    {displayedError ? (
                        <div className="text-red-300 text-xs font-bold whitespace-normal break-words">{displayedError}</div>
                    ) : null}

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="min-h-[44px] px-4 rounded-xl border border-slate-700 bg-slate-900 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition touch-manipulation"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition"
                        >
                            حفظ التصحيح
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
