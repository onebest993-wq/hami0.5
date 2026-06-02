import React, { useEffect, useMemo, useState } from 'react';
import type { CriminalDefendant, StageConclusion } from '../../criminalStore';
import type { CaseSovereignContext } from '../../caseClassificationEngine';
import { ModalIsoDateInput } from '../ModalIsoDateInput';
import {
    FULL_STAGE_FINAL_DECISION_KIND_OPTIONS,
    MASTER_PENALTY_OPTIONS,
    MISDEMEANOR_MAX_IMPRISONMENT_YEARS,
    SUMMARY_PENALTY_KIND_OPTIONS,
    validateStageFinalDecisionForm,
    type MasterPenaltyKind,
    type StageFinalDecisionFormPayload,
    type StageFinalDecisionKind,
    type StageFinalPenaltyBlock,
} from '../../stageFinalDecisionEngine';
import type { DecisionPresenceType } from '../../decisionAppealPeriodEngine';
import {
    validateExpirationReasonSelection,
    type StageExpirationReason,
} from '../../stageExpirationReasons';
import { ExpirationReasonFields } from '../ExpirationReasonFields';
import {
    filterSelectableDefendantsForTrialFinalDecision,
    resolveTrialFinalDecisionScopeIds,
} from '../../partyPersonalStage';
import { shouldShowMultiPartySelectionPicker } from '../../requestPartySelection';

export type StageFinalDecisionModalProps = {
    open: boolean;
    onClose: () => void;
    error?: string;
    defendants: CriminalDefendant[];
    caseContext: CaseSovereignContext;
    /** يُستنتج من سجل جلسات المرافعة — لا يُختار يدوياً في المودال. */
    inferredPresenceType: DecisionPresenceType;
    onSubmit: (
        payload: StageFinalDecisionFormPayload,
        meta: { defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'] },
    ) => void;
};

const emptySummaryPenalty = (): StageFinalPenaltyBlock => ({ masterKind: 'fine' });
const emptyFullPenalty = (): StageFinalPenaltyBlock => ({ masterKind: 'severe_imprisonment' });

export const StageFinalDecisionModal = ({
    open,
    onClose,
    error,
    defendants,
    caseContext,
    inferredPresenceType,
    onSubmit,
}: StageFinalDecisionModalProps) => {
    const isSummaryPath = caseContext.isSummaryProcedure;
    const isMisdemeanorClassification =
        caseContext.case_classification === 'جنحة' || caseContext.case_classification === 'مخالفة';

    const [kind, setKind] = useState<StageFinalDecisionKind | ''>('');
    const [issuedAt, setIssuedAt] = useState('');
    const [decisionText, setDecisionText] = useState('');
    const [convictionText, setConvictionText] = useState('');
    const [penalty, setPenalty] = useState<StageFinalPenaltyBlock>(emptyFullPenalty());
    const [penaltiesSupplementary, setPenaltiesSupplementary] = useState<string | null>(null);
    const [supplementaryPenaltiesEnabled, setSupplementaryPenaltiesEnabled] = useState(false);
    const [expirationReason, setExpirationReason] = useState<StageExpirationReason | ''>('');
    const [expirationCustomDetail, setExpirationCustomDetail] = useState('');
    const [scopedDefendantIds, setScopedDefendantIds] = useState<string[]>([]);
    const [localError, setLocalError] = useState('');

    const selectableDefendants = useMemo(
        () => filterSelectableDefendantsForTrialFinalDecision(defendants),
        [defendants],
    );
    const showDefendantPicker = shouldShowMultiPartySelectionPicker(selectableDefendants.length);
    const soleDefendant = selectableDefendants.length === 1 ? selectableDefendants[0]! : null;

    useEffect(() => {
        if (!open) return;
        setKind(isSummaryPath ? 'conviction_penalty' : '');
        setIssuedAt(new Date().toISOString().slice(0, 10));
        setDecisionText('');
        setConvictionText('');
        setPenalty(isSummaryPath ? emptySummaryPenalty() : emptyFullPenalty());
        setPenaltiesSupplementary(null);
        setSupplementaryPenaltiesEnabled(false);
        setExpirationReason('');
        setExpirationCustomDetail('');
        setScopedDefendantIds(
            selectableDefendants.length === 1
                ? [selectableDefendants[0]!.id]
                : selectableDefendants.map((d) => d.id),
        );
        setLocalError('');
    }, [open, isSummaryPath, selectableDefendants]);

    if (!open) return null;

    const modalTitle = isSummaryPath
        ? 'إصدار أمر جزائي / حكم عقوبة موجز'
        : 'إصدار القرار الختامي للمرحلة';

    const showFullConvictionFields = !isSummaryPath && kind === 'conviction_penalty';
    const showDecisionTextOnly =
        !isSummaryPath &&
        (kind === 'acquittal' || kind === 'release' || kind === 'criminal_expiration');

    const penaltyOptions = isSummaryPath ? SUMMARY_PENALTY_KIND_OPTIONS : MASTER_PENALTY_OPTIONS;

    const needsDuration =
        penalty.masterKind === 'severe_imprisonment' ||
        penalty.masterKind === 'simple_imprisonment' ||
        penalty.masterKind === 'combined_imprisonment_fine';
    const needsFine = penalty.masterKind === 'fine' || penalty.masterKind === 'combined_imprisonment_fine';
    const summaryNeedsDuration = isSummaryPath && penalty.masterKind === 'simple_imprisonment';

    const handleSubmit = () => {
        setLocalError('');
        if (!selectableDefendants.length) {
            setLocalError('لا يوجد متهمون قابلون للإدراج في القرار.');
            return;
        }
        const effectiveScopeIds = resolveTrialFinalDecisionScopeIds(defendants, scopedDefendantIds);
        if (!effectiveScopeIds.length) {
            setLocalError('حدّد متهماً واحداً على الأقل.');
            return;
        }

        const resolvedKind: StageFinalDecisionKind = isSummaryPath ? 'conviction_penalty' : (kind as StageFinalDecisionKind);

        if (resolvedKind === 'criminal_expiration') {
            const expirationErr = validateExpirationReasonSelection(expirationReason, expirationCustomDetail);
            if (expirationErr) {
                setLocalError(expirationErr);
                return;
            }
        }

        const resolvedPenalty =
            isSummaryPath || showFullConvictionFields
                ? {
                      ...penalty,
                      penalties_supplementary:
                          supplementaryPenaltiesEnabled &&
                          String(penaltiesSupplementary ?? '').trim()
                              ? String(penaltiesSupplementary).trim()
                              : null,
                  }
                : undefined;
        const payload: StageFinalDecisionFormPayload = {
            kind: resolvedKind,
            issuedAt,
            presenceType: inferredPresenceType,
            decisionText:
                isSummaryPath
                    ? ''
                    : resolvedKind === 'criminal_expiration' && expirationReason === 'custom_manual'
                      ? expirationCustomDetail.trim() || decisionText
                      : decisionText,
            convictionText: showFullConvictionFields ? convictionText : undefined,
            defendantIds: effectiveScopeIds,
            expirationReason:
                resolvedKind === 'criminal_expiration' && expirationReason ? expirationReason : undefined,
            penalty: resolvedPenalty,
            decisionPath: isSummaryPath ? 'summary' : 'full',
        };

        const validationErr = validateStageFinalDecisionForm(payload, caseContext);
        if (validationErr) {
            setLocalError(validationErr);
            return;
        }

        const defaultStatus: StageConclusion['defendantStatusAtDecision'] = defendants.some(
            (d) => d.status === 'موقوف' || d.status === 'ملقى القبض عليه',
        )
            ? 'detained'
            : defendants.some((d) => d.status === 'مكفل' || d.status === 'bailed_pending_appeal')
              ? 'bailed'
              : defendants.some((d) => d.status === 'هارب')
                ? 'fugitive'
                : 'bailed';

        onSubmit(payload, { defendantStatusAtDecision: defaultStatus });
    };

    const displayError = error || localError;

    return (
        <div
            className="fixed inset-0 z-[500] isolate bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stage-final-decision-title"
            onClick={onClose}
        >
            <div
                className="relative z-[501] w-full max-w-xl max-h-[min(92vh,780px)] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden isolate"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div id="stage-final-decision-title" className="text-white font-black text-sm whitespace-normal break-words">
                        {modalTitle}
                    </div>
                    <button type="button" onClick={onClose} className="text-white/70 hover:text-white transition text-sm font-bold">
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    {displayError ? (
                        <div className="rounded-xl border border-red-500/40 bg-red-900/20 p-3 text-red-200 font-black text-sm whitespace-normal break-words">
                            {displayError}
                        </div>
                    ) : null}

                    <div>
                        <label className="block text-white/70 text-xs mb-1">تاريخ صدور القرار</label>
                        <ModalIsoDateInput value={issuedAt} onChange={setIssuedAt} />
                    </div>

                    {!isSummaryPath ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1">نوع القرار الختامي</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={kind}
                                onChange={(e) => {
                                    const next = e.target.value as StageFinalDecisionKind | '';
                                    setKind(next);
                                    if (next === 'conviction_penalty') {
                                        setPenalty(emptyFullPenalty());
                                        setPenaltiesSupplementary(null);
                                        setSupplementaryPenaltiesEnabled(false);
                                    }
                                }}
                            >
                                <option value="" className="bg-slate-900">
                                    اختر...
                                </option>
                                {FULL_STAGE_FINAL_DECISION_KIND_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-slate-900">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    {kind === 'criminal_expiration' ? (
                        <ExpirationReasonFields
                            reason={expirationReason}
                            customDetail={expirationCustomDetail}
                            onReasonChange={setExpirationReason}
                            onCustomDetailChange={setExpirationCustomDetail}
                            label="سبب انقضاء الدعوى"
                            compact
                        />
                    ) : null}

                    {(isSummaryPath || showFullConvictionFields) ? (
                        <>
                            <div>
                                <label className="block text-white/70 text-xs mb-1">
                                    {isSummaryPath ? 'نوع العقوبة الموجزة' : 'نوع العقوبة الأصلية'}
                                </label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={penalty.masterKind}
                                    onChange={(e) =>
                                        setPenalty((p) => ({
                                            ...p,
                                            masterKind: e.target.value as MasterPenaltyKind,
                                        }))
                                    }
                                >
                                    {penaltyOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value} className="bg-slate-900">
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {(needsDuration || summaryNeedsDuration) ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {(
                                        [
                                            ['years', 'عدد السنوات'],
                                            ['months', 'عدد الأشهر'],
                                        ] as const
                                    ).map(([key, label]) => (
                                        <div key={key}>
                                            <label className="block text-white/70 text-xs mb-1">{label}</label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={key === 'years' && isMisdemeanorClassification ? MISDEMEANOR_MAX_IMPRISONMENT_YEARS : undefined}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 tabular-nums"
                                                value={penalty[key] ?? ''}
                                                onChange={(e) => {
                                                    let n = e.target.value === '' ? undefined : Number(e.target.value);
                                                    if (
                                                        key === 'years' &&
                                                        isMisdemeanorClassification &&
                                                        n !== undefined &&
                                                        n > MISDEMEANOR_MAX_IMPRISONMENT_YEARS
                                                    ) {
                                                        n = MISDEMEANOR_MAX_IMPRISONMENT_YEARS;
                                                    }
                                                    setPenalty((p) => ({ ...p, [key]: n }));
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            {needsFine || (isSummaryPath && penalty.masterKind === 'fine') ? (
                                <>
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1">مقدار الغرامة (دينار عراقي)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 tabular-nums"
                                            value={penalty.fineAmountIqd ?? ''}
                                            onChange={(e) => {
                                                const n = e.target.value === '' ? undefined : Number(e.target.value);
                                                setPenalty((p) => ({ ...p, fineAmountIqd: n }));
                                            }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1">حبس بديل — أشهر (م 298/299)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 tabular-nums"
                                                value={penalty.substituteImprisonmentMonths ?? ''}
                                                onChange={(e) => {
                                                    const n = e.target.value === '' ? undefined : Number(e.target.value);
                                                    setPenalty((p) => ({ ...p, substituteImprisonmentMonths: n }));
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1">حبس بديل — أيام</label>
                                            <input
                                                type="number"
                                                min={0}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 tabular-nums"
                                                value={penalty.substituteImprisonmentDays ?? ''}
                                                onChange={(e) => {
                                                    const n = e.target.value === '' ? undefined : Number(e.target.value);
                                                    setPenalty((p) => ({ ...p, substituteImprisonmentDays: n }));
                                                }}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : null}

                            <label className="flex items-start gap-2.5 text-sm text-white/85 cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.05] transition">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 shrink-0 accent-[#E6C673]"
                                    checked={supplementaryPenaltiesEnabled}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setSupplementaryPenaltiesEnabled(checked);
                                        if (!checked) {
                                            setPenaltiesSupplementary(null);
                                        }
                                    }}
                                />
                                <span className="whitespace-normal break-words leading-relaxed">
                                    {isSummaryPath
                                        ? 'إضافة عقوبات تكميلية أو تدابير احترازية (كالمصادرة/الإتلاف/الغلق)'
                                        : 'إضافة عقوبات تبعية، تكميلية، أو تدابير احترازية'}
                                </span>
                            </label>
                            {supplementaryPenaltiesEnabled ? (
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        نص القرار التكميلي / التدبير المحكوم به
                                    </label>
                                    <textarea
                                        className="w-full min-h-[96px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 resize-y"
                                        value={penaltiesSupplementary ?? ''}
                                        onChange={(e) => setPenaltiesSupplementary(e.target.value)}
                                        placeholder={
                                            isSummaryPath
                                                ? 'مثال: مصادرة المضبوطات وإتلافها، أو غلق المحل لمدة...'
                                                : 'مثال: مراقبة الشرطة، الحرمان من الحقوق، المصادرة...'
                                        }
                                    />
                                </div>
                            ) : null}

                            {!isSummaryPath ? (
                                <>
                                    <label className="flex items-start gap-2 text-sm text-white/85 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-1"
                                            checked={Boolean(penalty.suspendedExecution)}
                                            onChange={(e) =>
                                                setPenalty((p) => ({
                                                    ...p,
                                                    suspendedExecution: e.target.checked,
                                                    suspendedExecutionReason: e.target.checked
                                                        ? p.suspendedExecutionReason
                                                        : undefined,
                                                }))
                                            }
                                        />
                                        <span>شمول العقوبة بإيقاف التنفيذ</span>
                                    </label>
                                    {penalty.suspendedExecution ? (
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1">أسباب ومستند إيقاف التنفيذ</label>
                                            <textarea
                                                className="w-full min-h-[72px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 resize-y"
                                                value={penalty.suspendedExecutionReason ?? ''}
                                                onChange={(e) =>
                                                    setPenalty((p) => ({ ...p, suspendedExecutionReason: e.target.value }))
                                                }
                                            />
                                        </div>
                                    ) : null}
                                </>
                            ) : null}
                        </>
                    ) : null}

                    {showFullConvictionFields ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1">نص قرار الحكم بالإدانة</label>
                            <textarea
                                className="w-full min-h-[88px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 resize-y"
                                value={convictionText}
                                onChange={(e) => setConvictionText(e.target.value)}
                                placeholder="تثبيت الجريمة والوصف القانوني..."
                            />
                        </div>
                    ) : null}

                    {showDecisionTextOnly ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1">نص القرار الختامي</label>
                            <textarea
                                className="w-full min-h-[120px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 resize-y"
                                value={decisionText}
                                onChange={(e) => setDecisionText(e.target.value)}
                            />
                        </div>
                    ) : null}

                    {showDefendantPicker ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                            <div className="text-white/75 text-xs font-black">المتهمون المشمولون بالقرار</div>
                            {selectableDefendants.map((d) => {
                                const checked = scopedDefendantIds.includes(d.id);
                                return (
                                    <label key={d.id} className="flex items-center gap-2 text-sm text-white/85 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => {
                                                setScopedDefendantIds((prev) =>
                                                    e.target.checked
                                                        ? [...prev, d.id]
                                                        : prev.filter((id) => id !== d.id),
                                                );
                                            }}
                                        />
                                        {String(d.fullName ?? '').trim() || '—'}
                                    </label>
                                );
                            })}
                        </div>
                    ) : soleDefendant ? (
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white font-bold whitespace-normal break-words">
                            المتهم: {String(soleDefendant.fullName ?? '').trim() || '—'}
                        </div>
                    ) : null}
                </div>

                <div className="p-4 border-t border-slate-700 flex gap-2 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-sm font-bold text-white/70 hover:text-white border border-white/15"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="rounded-xl px-4 py-2 text-sm font-black bg-[#E6C673]/20 border border-[#E6C673]/40 text-[#E6C673] hover:bg-[#E6C673]/30"
                    >
                        حفظ القرار الختامي
                    </button>
                </div>
            </div>
        </div>
    );
};
