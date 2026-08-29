import React, { useEffect, useMemo, useState } from 'react';
import { Scissors } from '@/app/components/ui/icons/Scissors';
import type { CriminalDefendant, JudicialSeveranceDraft } from '../../criminalStore';
import { resolveDefendantFullName } from '../../criminalUnknownDefendant';
import {
    INVESTIGATION_DOSSIER_SEVERANCE_HINT,
    INVESTIGATION_MIXED_JUVENILE_ADULT_SEVERANCE_GUIDANCE,
    INVESTIGATION_MIXED_UNKNOWN_IDENTIFIED_SEVERANCE_GUIDANCE,
} from '../../investigationPhaseGuidance';
import { investigationDossierHasMixedUnknownAndIdentified } from '../../criminalUnknownDefendant';
import type { InvestigationDefendantsPartyMix } from '../../juvenileInvestigationRules';
import { filterSeveranceSelectableDefendants } from '../../investigationDefendantPurge';
import { ModalIsoDateInput } from '../ModalIsoDateInput';

export type SeveranceTargetPickerModalProps = {
    open: boolean;
    onClose: () => void;
    defendants: CriminalDefendant[];
    defendantsPartyMix?: InvestigationDefendantsPartyMix;
    /**
     * يُستدعى عند الضغط على «متابعة لإنشاء الإضبارة» بعد اختيار متهمين صالحين
     * وبيانات قرار التفريق (تاريخ، تفاصيل، قابلية التمييز).
     */
    onContinue: (defendantIds: string[], judicialSeveranceDraft: JudicialSeveranceDraft) => void;
    error?: string;
};

function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * مودال صغير بثيم زجاجي أنيق لاختيار المتهم/المتهمين المراد شطر إضبارتهم
 * إلى إضبارة جديدة مستقلة. هو نقطة الانطلاق الوحيدة لمسار «تفريق الدعوى».
 */
export const SeveranceTargetPickerModal = ({
    open,
    onClose,
    defendants,
    defendantsPartyMix = 'adults_only',
    onContinue,
    error,
}: SeveranceTargetPickerModalProps) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [localError, setLocalError] = useState('');
    const [requestDate, setRequestDate] = useState(todayIsoDate);
    const [lawyerNote, setLawyerNote] = useState('');
    const [isAppealable, setIsAppealable] = useState(true);

    useEffect(() => {
        if (!open) return;
        setSelectedIds([]);
        setLocalError('');
        setRequestDate(todayIsoDate());
        setLawyerNote('');
        setIsAppealable(true);
    }, [open]);

    const selectable = useMemo(
        () => filterSeveranceSelectableDefendants(defendants),
        [defendants],
    );

    if (!open) return null;

    const toggle = (id: string) => {
        setLocalError('');
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const handleContinue = () => {
        const ids = selectedIds.filter((id) => selectable.some((d) => d.id === id));
        if (!ids.length) {
            setLocalError('اختر متهماً واحداً على الأقل للتفريق.');
            return;
        }
        if (ids.length >= selectable.length) {
            setLocalError('لا يمكن شطر كل المتهمين — يجب أن يبقى متهم واحد في الإضبارة الأم.');
            return;
        }
        if (!requestDate.trim()) {
            setLocalError('أدخل تاريخ قرار التفريق.');
            return;
        }
        if (!lawyerNote.trim()) {
            setLocalError('أدخل تفاصيل / وقائع قرار التفريق.');
            return;
        }
        onContinue(ids, {
            requestDate: requestDate.trim(),
            lawyerNote: lawyerNote.trim(),
            isAppealable,
        });
    };

    const displayedError = error || localError;
    const isContinueDisabled =
        !selectedIds.length || selectedIds.length >= selectable.length;

    return (
        <div
            className="fixed inset-0 z-[500] isolate bg-black/62 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="severance-modal-title"
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative z-[501] w-full max-w-md max-h-[min(88vh,640px)] flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-slate-900/85 backdrop-blur-sm shadow-lg shadow-black/35"
            >
                <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E6C673]/40 to-transparent"
                />
                <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid place-items-center h-8 w-8 rounded-full bg-[#E6C673]/15 border border-[#E6C673]/30">
                            <Scissors className="h-4 w-4 text-[#E6C673]" aria-hidden />
                        </span>
                        <div className="min-w-0">
                            <div
                                id="severance-modal-title"
                                className="text-white font-black text-sm whitespace-normal break-words"
                            >
                                تفريق الدعوى (شطر إضبارة)
                            </div>
                            <div className="text-[10px] font-bold text-white/45 whitespace-normal break-words mt-0.5">
                                نقل متهم/أكثر إلى إضبارة مستقلة جديدة
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] min-w-[44px] px-3 text-white/65 hover:text-white text-xs font-bold rounded-md hover:bg-white/5 transition touch-manipulation"
                    >
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    {displayedError ? (
                        <div className="rounded-xl border border-red-500/40 bg-red-900/20 p-3 text-red-200 font-black text-xs whitespace-normal break-words">
                            {displayedError}
                        </div>
                    ) : null}

                    <p className="text-[10px] font-bold text-white/45 whitespace-normal break-words leading-relaxed">
                        {INVESTIGATION_DOSSIER_SEVERANCE_HINT}
                    </p>

                    {defendantsPartyMix === 'mixed' ? (
                        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100/90 text-[11px] font-bold leading-relaxed whitespace-normal break-words">
                            {INVESTIGATION_MIXED_JUVENILE_ADULT_SEVERANCE_GUIDANCE}
                        </p>
                    ) : null}

                    {investigationDossierHasMixedUnknownAndIdentified(defendants) ? (
                        <p className="rounded-xl border border-red-500/30 bg-red-900/15 p-3 text-red-100/90 text-[11px] font-bold leading-relaxed whitespace-normal break-words">
                            {INVESTIGATION_MIXED_UNKNOWN_IDENTIFIED_SEVERANCE_GUIDANCE}
                        </p>
                    ) : null}

                    <div className="text-white/80 font-black text-xs whitespace-normal break-words">
                        حدد المتهم/المتهمين المراد تفريق قضيتهم:
                    </div>

                    {selectable.length === 0 ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100 text-xs font-bold whitespace-normal break-words">
                            لا يوجد متهمون قابلون للتفريق في هذه الإضبارة.
                        </div>
                    ) : selectable.length === 1 ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100 text-xs font-bold whitespace-normal break-words">
                            توجد متهم واحد فقط في الإضبارة — لا يمكن إجراء التفريق (يجب وجود متهمَين أو أكثر).
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {selectable.map((d) => {
                                const checked = selectedIds.includes(d.id);
                                const label = resolveDefendantFullName(d) || '—';
                                return (
                                    <label
                                        key={d.id}
                                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-bold cursor-pointer transition-colors ${
                                            checked
                                                ? 'border-[#E6C673]/50 bg-[#E6C673]/[0.06] text-white'
                                                : 'border-white/10 bg-white/[0.02] text-white/85 hover:border-white/20 hover:bg-white/[0.05]'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 accent-[#E6C673] shrink-0"
                                            checked={checked}
                                            onChange={() => toggle(d.id)}
                                        />
                                        <span className="whitespace-normal break-words min-w-0 flex-1">
                                            {label}
                                            {defendantsPartyMix === 'mixed' ? (
                                                <span className="text-white/45 font-bold text-[10px] mr-1">
                                                    {d.isJuvenile ? ' (حدث)' : ' (بالغ)'}
                                                </span>
                                            ) : null}
                                        </span>
                                        {d.status ? (
                                            <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-black text-white/65 whitespace-nowrap">
                                                {d.status}
                                            </span>
                                        ) : null}
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    <div className="rounded-xl border border-sky-500/35 bg-sky-950/20 p-3 space-y-3">
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                تاريخ قرار التفريق *
                            </label>
                            <ModalIsoDateInput
                                value={requestDate}
                                onChange={setRequestDate}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                تفاصيل / وقائع القرار *
                            </label>
                            <textarea
                                className="w-full min-h-[72px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 resize-y"
                                value={lawyerNote}
                                onChange={(e) => {
                                    setLocalError('');
                                    setLawyerNote(e.target.value);
                                }}
                                placeholder="ملخص قرار القاضي بتفريق الإضبارة..."
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsAppealable((prev) => !prev)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black transition ${
                                isAppealable
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                                    : 'border-white/15 bg-white/[0.03] text-white/60'
                            }`}
                        >
                            {isAppealable ? 'قابل للتمييز' : 'غير قابل للتمييز'}
                        </button>
                    </div>

                    <p className="text-[10px] font-bold text-white/40 whitespace-normal break-words leading-relaxed">
                        عند المتابعة: ستفتح شاشة «إضبارة جديدة» مع تعبئة المتهمين المختارين فقط.
                        بعد الحفظ يتم حذف هؤلاء المتهمين من الإضبارة الحالية وترحيل الإجراءات المرتبطة بهم
                        حصرياً إلى الإضبارة الجديدة، مع توثيق القرار في سجل الأم.
                    </p>
                </div>

                <div className="p-3 border-t border-white/10 bg-white/[0.02] flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] px-4 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-black text-white/75 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition touch-manipulation"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleContinue}
                        disabled={isContinueDisabled}
                        className="min-h-[44px] px-4 rounded-xl bg-[#E6C673] text-[#0B1021] font-black text-xs hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition touch-manipulation"
                    >
                        متابعة لإنشاء الإضبارة
                    </button>
                </div>
            </div>
        </div>
    );
};
