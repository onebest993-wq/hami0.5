import React from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { GuarantorCollapsedSummary } from './GuarantorCollapsedSummary';
import {
    formatGuarantorIqdForDisplay,
    parseGuarantorIqdInput,
    readGuarantorIqd,
    resolveGuarantorIdentity,
} from './guarantorExternalUtils';
import {
    formatNumberInput,
    formatStoredAmountForInput,
} from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';

type GuarantorSeizureDeductionCardProps = {
    executionData: ExecutionFile | null | undefined;
    guarantorFollowup: ExecutionFile['guarantor_followup'] | null | undefined;
    persistGuarantorFollowupDetails: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: {
            salaryIqd: number | null;
            deductionIqd: number | null;
            guaranteeType?: 'amount' | 'attendance';
        }
    ) => boolean;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    disabled?: boolean;
    onOpenDetails?: () => void;
    /** بعد حفظ الاستقطاع — إعادة فتح مسار حجز راتب الكفيل */
    onAmountsSaved?: () => void;
};

export const GuarantorSeizureDeductionCard: React.FC<GuarantorSeizureDeductionCardProps> = ({
    executionData,
    guarantorFollowup: gf,
    persistGuarantorFollowupDetails,
    showToast,
    disabled,
    onOpenDetails,
    onAmountsSaved,
}) => {
    const [deductionDraft, setDeductionDraft] = React.useState('');
    const [salaryDraft, setSalaryDraft] = React.useState('');
    const [nameDraft, setNameDraft] = React.useState('');
    const [workplaceDraft, setWorkplaceDraft] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [savedFlash, setSavedFlash] = React.useState(false);
    const [editAmountsOpen, setEditAmountsOpen] = React.useState(true);
    const draftsDirtyRef = React.useRef(false);

    const syncDraftsFromFollowup = React.useCallback(() => {
        const ded = readGuarantorIqd(gf?.guarantor_deduction_iqd);
        const sal = readGuarantorIqd(gf?.guarantor_salary_iqd);
        setDeductionDraft(ded != null ? formatStoredAmountForInput(ded) : '');
        setSalaryDraft(sal != null ? formatStoredAmountForInput(sal) : '');
        const { name, workplace } = resolveGuarantorIdentity(executionData, gf);
        setNameDraft(name);
        setWorkplaceDraft(workplace);
        draftsDirtyRef.current = false;
        const hasDed = ded != null && ded > 0;
        if (hasDed) setEditAmountsOpen(false);
    }, [executionData, gf, gf?.guarantor_deduction_iqd, gf?.guarantor_salary_iqd]);

    React.useEffect(() => {
        if (draftsDirtyRef.current) return;
        syncDraftsFromFollowup();
    }, [syncDraftsFromFollowup]);

    React.useEffect(() => {
        const handler = () => {
            draftsDirtyRef.current = false;
            syncDraftsFromFollowup();
        };
        window.addEventListener('hami-guarantor-followup-committed', handler);
        return () => window.removeEventListener('hami-guarantor-followup-committed', handler);
    }, [syncDraftsFromFollowup]);

    if (!gf || gf.guarantee_type !== 'amount') return null;

    const storedIdentity = resolveGuarantorIdentity(executionData, gf);
    const effectiveName = String(storedIdentity.name || nameDraft || '').trim();
    const effectiveWorkplace = String(storedIdentity.workplace || workplaceDraft || '').trim();
    const needsIdentityFields = !storedIdentity.name || !storedIdentity.workplace;

    const detailsReady =
        Boolean(gf.details_saved) ||
        (Boolean(storedIdentity.name) && Boolean(storedIdentity.workplace)) ||
        (Boolean(effectiveName) && Boolean(effectiveWorkplace));

    const salaryIqd = readGuarantorIqd(gf.guarantor_salary_iqd);
    const deductionIqd = readGuarantorIqd(gf.guarantor_deduction_iqd);
    const deductionCommitted = deductionIqd != null && deductionIqd > 0;

    const salaryLabel = formatGuarantorIqdForDisplay(gf.guarantor_salary_iqd);
    const deductionLabel = formatGuarantorIqdForDisplay(gf.guarantor_deduction_iqd);

    const draftDed = parseGuarantorIqdInput(deductionDraft);
    const canSave =
        !disabled &&
        !saving &&
        draftDed != null &&
        draftDed > 0 &&
        Boolean(effectiveName) &&
        Boolean(effectiveWorkplace);

    const handleSaveAmounts = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!effectiveName || !effectiveWorkplace) {
            showToast('أكمل اسم الكفيل وجهة العمل قبل الحفظ.', 'warning');
            return;
        }
        const sal = parseGuarantorIqdInput(salaryDraft);
        const ded = parseGuarantorIqdInput(deductionDraft);
        if (ded == null || ded <= 0) {
            showToast('أدخل مبلغ الاستقطاع الشهري (د.ع) — حقل إلزامي لحجز الراتب.', 'warning');
            return;
        }
        setSaving(true);
        const ok = persistGuarantorFollowupDetails(effectiveName, effectiveWorkplace, {
            salaryIqd: sal,
            deductionIqd: ded,
            guaranteeType: 'amount',
        });
        setSaving(false);
        if (!ok) return;
        draftsDirtyRef.current = false;
        setEditAmountsOpen(false);
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 2800);
        try {
            const exId = String(executionData?.id ?? '').trim();
            window.dispatchEvent(
                new CustomEvent('hami-guarantor-deduction-saved', { detail: { executionId: exId } })
            );
        } catch {
            /* ignore */
        }
        onAmountsSaved?.();
    };

    const showAmountsForm = editAmountsOpen || !deductionCommitted;

    return (
        <div
            className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/25 via-[#0B1120]/40 to-transparent p-2.5 space-y-2"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex flex-row-reverse items-center justify-between gap-2">
                <p className="text-[10px] font-black text-violet-100/95">بيانات الاستقطاع — حجز الراتب</p>
                {onOpenDetails && detailsReady ? (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetails();
                        }}
                        className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-slate-300 hover:bg-white/10 disabled:opacity-40"
                    >
                        تفاصيل الكفيل
                    </button>
                ) : null}
            </div>

            <GuarantorCollapsedSummary
                cells={[
                    { label: 'اسم الكفيل', value: effectiveName || '—' },
                    { label: 'الراتب', value: salaryLabel, mono: true },
                    { label: 'الاستقطاع', value: deductionLabel, mono: true },
                ]}
            />

            {savedFlash ? (
                <p className="rounded-lg border border-emerald-500/35 bg-emerald-950/30 px-2 py-1 text-[9px] font-bold text-emerald-200 text-right">
                    تم الحفظ — يمكنك متابعة «حجز راتب الكفيل» أدناه (
                    {draftDed != null ? draftDed.toLocaleString('ar-IQ') : deductionIqd?.toLocaleString('ar-IQ')}{' '}
                    د.ع)
                </p>
            ) : null}

            {deductionCommitted && !showAmountsForm ? (
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-2 py-2 text-right space-y-1.5">
                    <p className="text-[9px] font-bold text-emerald-200/90">
                        الاستقطاع مسجّل — البطاقة مكتملة. تابع من «حجز راتب الكفيل» أو عدّل المبالغ.
                    </p>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditAmountsOpen(true);
                        }}
                        className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 text-[9px] font-bold text-slate-200 hover:bg-white/10 disabled:opacity-40"
                    >
                        تعديل الراتب والاستقطاع
                    </button>
                </div>
            ) : !detailsReady ? (
                <p className="text-[9px] leading-relaxed text-amber-200/85 text-right">
                    أكمل اسم الكفيل وجهة العمل (من طلب الكفيل أو الحقول أدناه)، ثم حدّد الاستقطاع.
                </p>
            ) : (
                <div className="rounded-xl border border-white/10 bg-black/20 p-2 space-y-2">
                    <p className="text-[9px] text-slate-400 text-right">
                        أدخل الاستقطاع الشهري (إلزامي) والراتب إن وُجد — يُحفظ في الملف ويُفعّل مسار حجز الراتب.
                    </p>
                    {needsIdentityFields ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                                <label className="mb-0.5 block text-[9px] font-bold text-slate-500">اسم الكفيل</label>
                                <input
                                    type="text"
                                    disabled={disabled || saving}
                                    value={nameDraft}
                                    onChange={(e) => {
                                        draftsDirtyRef.current = true;
                                        setNameDraft(e.target.value);
                                    }}
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] text-slate-100 text-right"
                                    placeholder="اسم الكفيل"
                                />
                            </div>
                            <div>
                                <label className="mb-0.5 block text-[9px] font-bold text-slate-500">جهة العمل</label>
                                <input
                                    type="text"
                                    disabled={disabled || saving}
                                    value={workplaceDraft}
                                    onChange={(e) => {
                                        draftsDirtyRef.current = true;
                                        setWorkplaceDraft(e.target.value);
                                    }}
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] text-slate-100 text-right"
                                    placeholder="جهة العمل"
                                />
                            </div>
                        </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="mb-0.5 block text-[9px] font-bold text-slate-500">الراتب (د.ع)</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                disabled={disabled || saving}
                                value={salaryDraft}
                                onChange={(e) => {
                                    draftsDirtyRef.current = true;
                                    setSalaryDraft(formatNumberInput(e.target.value));
                                }}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-mono text-slate-100 text-right"
                                dir="ltr"
                                placeholder="اختياري"
                            />
                        </div>
                        <div>
                            <label className="mb-0.5 block text-[9px] font-bold text-violet-300/90">
                                الاستقطاع (د.ع) *
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                disabled={disabled || saving}
                                value={deductionDraft}
                                onChange={(e) => {
                                    draftsDirtyRef.current = true;
                                    setDeductionDraft(formatNumberInput(e.target.value));
                                }}
                                className="w-full rounded-lg border border-violet-500/35 bg-violet-950/30 px-2 py-1.5 text-[10px] font-mono text-violet-50 text-right"
                                dir="ltr"
                                placeholder="مبلغ الخصم"
                            />
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={!canSave}
                        onClick={handleSaveAmounts}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full rounded-lg border border-violet-400/40 bg-violet-500/15 py-2 text-[10px] font-black text-violet-100 hover:bg-violet-500/22 disabled:opacity-40"
                    >
                        {saving ? 'جاري الحفظ…' : 'حفظ الراتب والاستقطاع'}
                    </button>
                </div>
            )}
        </div>
    );
};
