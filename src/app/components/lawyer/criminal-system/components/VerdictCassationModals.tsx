import React, { useEffect, useState } from 'react';
import type { CaseStage } from '@/app/types/criminal';
import { cassationRoutingGuide } from '../trialSessionsEngine';
import type {
    VerdictCard,
    VerdictCorrectionAppealTrack,
    VerdictOrdinaryAppealTrack,
} from '../verdictCardsEngine';
import { verdictOutcomeLabel } from '../verdictCardsEngine';
import {
    VERDICT_CASSATION_RESULT_OPTIONS,
    VERDICT_REFERRAL_COURT_OPTIONS,
    coerceLegacyVerdictCassationResult,
    verdictCassationResultNeedsBindingDirections,
    verdictCassationResultNeedsPenaltyModification,
    verdictCassationResultNeedsReferralCourt,
    validateVerdictCassationResultSave,
    type VerdictCassationResultSaveInput,
    type VerdictCassationResultValue,
    type VerdictReferralCourtValue,
} from '../verdictCassationResultEngine';
import { ModalIsoDate } from './ModalIsoDate';
import { ModalIsoDateInput } from './ModalIsoDateInput';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../criminalModalPortal';

const panelClass =
    'relative w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden';

type CassationModalBaseProps = {
    open: boolean;
    card: VerdictCard | null;
    readOnly?: boolean;
    onClose: () => void;
};

export type VerdictCassationFilingModalProps = CassationModalBaseProps & {
    caseStage: CaseStage;
    currentAccusationArticle?: string;
    crimeType?: string;
    onSave: (patch: Partial<VerdictOrdinaryAppealTrack>) => void;
};

/** المرحلة 1 — تسجيل تقديم الطعن وإرسال الإضبارة (بدون نتيجة). */
export const VerdictCassationFilingModal = ({
    open,
    card,
    caseStage,
    currentAccusationArticle,
    crimeType,
    readOnly,
    onClose,
    onSave,
}: VerdictCassationFilingModalProps) => {
    const [filedAt, setFiledAt] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open || !card) return;
        setError('');
        setFiledAt(String(card.ordinaryAppeal?.filedAt ?? ''));
    }, [open, card?.id, card?.ordinaryAppeal?.filedAt]);

    if (!open || !card) return null;

    const submit = () => {
        const date = filedAt.trim();
        if (!date) {
            setError('تاريخ التقديم مطلوب.');
            return;
        }
        onSave({
            filedAt: date,
            courtLabel: cassationRoutingGuide(caseStage, { currentAccusationArticle, crimeType }).courtLabel,
        });
        onClose();
    };

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.verdictCassation} className="isolate">
            <div className={panelClass} onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="text-white font-black text-sm whitespace-normal break-words">
                        تسجيل تقديم الطعن وإرسال الإضبارة
                    </div>
                    <div className="text-white/55 text-xs mt-1 whitespace-normal break-words">
                        {verdictOutcomeLabel(card.outcome)} · تاريخ الحكم:{' '}
                        <ModalIsoDate value={card.issuedAt} />
                    </div>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-white/70 text-xs mb-1">تاريخ التقديم *</label>
                        <ModalIsoDateInput value={filedAt} onChange={setFiledAt} disabled={readOnly} />
                    </div>
                    {error ? (
                        <div className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-red-200 text-xs font-bold">
                            {error}
                        </div>
                    ) : null}
                </div>

                <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/80"
                    >
                        إلغاء
                    </button>
                    {!readOnly ? (
                        <button
                            type="button"
                            onClick={submit}
                            className="rounded-lg bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110"
                        >
                            حفظ تقديم الطعن
                        </button>
                    ) : null}
                </div>
            </div>
        </CriminalModalPortal>
    );
};

export type VerdictCassationResultModalProps = CassationModalBaseProps & {
    crimeType?: string;
    onSave: (input: VerdictCassationResultSaveInput) => string | null | void;
};

/** المرحلة 2 — تسجيل قرار التمييز الصادر على بطاقة الحكم الختامي. */
export const VerdictCassationResultModal = ({
    open,
    card,
    readOnly,
    onClose,
    onSave,
}: VerdictCassationResultModalProps) => {
    const [result, setResult] = useState<VerdictCassationResultValue | ''>('');
    const [issuedAt, setIssuedAt] = useState('');
    const [referredCourt, setReferredCourt] = useState<VerdictReferralCourtValue | ''>('');
    const [bindingDirections, setBindingDirections] = useState('');
    const [penaltyModificationText, setPenaltyModificationText] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open || !card) return;
        setError('');
        const raw = String(card.ordinaryAppeal?.result ?? '').trim();
        setResult(coerceLegacyVerdictCassationResult(raw));
        setIssuedAt(
            String(card.ordinaryAppeal?.resultRecordedAt ?? card.ordinaryAppeal?.filedAt ?? '').trim(),
        );
        setReferredCourt(
            (String(card.ordinaryAppeal?.referredCourtStage ?? '').trim() as VerdictReferralCourtValue) || '',
        );
        setBindingDirections(String(card.ordinaryAppeal?.bindingDirections ?? '').trim());
        setPenaltyModificationText(String(card.ordinaryAppeal?.penaltyModificationText ?? '').trim());
    }, [open, card?.id]);

    if (!open || !card) return null;

    const showReferralCourt = result !== '' && verdictCassationResultNeedsReferralCourt(result);
    const showBindingDirections = result !== '' && verdictCassationResultNeedsBindingDirections(result);
    const showPenaltyModification = result !== '' && verdictCassationResultNeedsPenaltyModification(result);

    const submit = () => {
        if (!result) {
            setError('اختر النتيجة التمييزية.');
            return;
        }
        const date = issuedAt.trim();
        if (!date) {
            setError('تاريخ صدور القرار التمييزي مطلوب.');
            return;
        }
        const payload: VerdictCassationResultSaveInput = {
            result,
            resultRecordedAt: date,
            referredCourtLabel: referredCourt || undefined,
            bindingDirections: bindingDirections.trim() || undefined,
            penaltyModificationText: penaltyModificationText.trim() || undefined,
        };
        const validationErr = validateVerdictCassationResultSave(payload);
        if (validationErr) {
            setError(validationErr);
            return;
        }
        const saveErr = onSave(payload);
        if (saveErr) {
            setError(saveErr);
            return;
        }
        onClose();
    };

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.verdictCassation} className="isolate">
            <div className={panelClass} onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="text-white font-black text-sm whitespace-normal break-words">
                        ⚖️ تسجيل قرار التمييز الوارد
                    </div>
                    <div className="text-white/55 text-xs mt-1 whitespace-normal break-words">
                        {verdictOutcomeLabel(card.outcome)} · أضبارة:{' '}
                        {card.ordinaryAppeal?.cassationDossierNumber || '—'}
                    </div>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-white/70 text-xs mb-1">النتيجة التمييزية *</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={result}
                            disabled={readOnly}
                            onChange={(e) => setResult(e.target.value as VerdictCassationResultValue | '')}
                        >
                            <option value="" className="bg-slate-900">
                                — اختر النتيجة —
                            </option>
                            {VERDICT_CASSATION_RESULT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value} className="bg-slate-900">
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {showReferralCourt ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1">المحكمة المحال إليها *</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={referredCourt}
                                disabled={readOnly}
                                onChange={(e) =>
                                    setReferredCourt(e.target.value as VerdictReferralCourtValue | '')
                                }
                            >
                                <option value="" className="bg-slate-900">
                                    — اختر المحكمة —
                                </option>
                                {VERDICT_REFERRAL_COURT_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value} className="bg-slate-900">
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    {showBindingDirections ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1">
                                توجيهات محكمة التمييز الملزمة *
                            </label>
                            <textarea
                                className="w-full min-h-[88px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 resize-y"
                                value={bindingDirections}
                                disabled={readOnly}
                                onChange={(e) => setBindingDirections(e.target.value)}
                            />
                        </div>
                    ) : null}

                    {showPenaltyModification ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1">
                                منطوق تعديل العقوبة أو توجيهات المحكمة *
                            </label>
                            <textarea
                                className="w-full min-h-[88px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 resize-y"
                                value={penaltyModificationText}
                                disabled={readOnly}
                                onChange={(e) => setPenaltyModificationText(e.target.value)}
                            />
                        </div>
                    ) : null}

                    <div>
                        <label className="block text-white/70 text-xs mb-1">
                            تاريخ صدور القرار التمييزي *
                        </label>
                        <ModalIsoDateInput value={issuedAt} onChange={setIssuedAt} disabled={readOnly} />
                    </div>
                    {error ? (
                        <div className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-red-200 text-xs font-bold">
                            {error}
                        </div>
                    ) : null}
                </div>

                <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/80"
                    >
                        إلغاء
                    </button>
                    {!readOnly ? (
                        <button
                            type="button"
                            onClick={submit}
                            className="rounded-lg bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110"
                        >
                            حفظ قرار التمييز
                        </button>
                    ) : null}
                </div>
            </div>
        </CriminalModalPortal>
    );
};

export type VerdictCassationCorrectionModalProps = CassationModalBaseProps & {
    onSave: (patch: Partial<VerdictCorrectionAppealTrack>) => void;
};

/** طلب تصحيح قرار تمييزي — م 266. */
export const VerdictCassationCorrectionModal = ({
    open,
    card,
    readOnly,
    onClose,
    onSave,
}: VerdictCassationCorrectionModalProps) => {
    const [correction, setCorrection] = useState<VerdictCorrectionAppealTrack>({ status: 'pending' });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open || !card) return;
        setError('');
        setCorrection({ status: 'pending', ...(card.correctionAppeal ?? {}) });
    }, [open, card?.id]);

    if (!open || !card) return null;

    const submit = () => {
        const requestNo = String(correction.correctionRequestNumber ?? '').trim();
        const filedAt = String(correction.filedAt ?? '').trim();
        if (!requestNo) {
            setError('رقم طلب التصحيح مطلوب.');
            return;
        }
        if (!filedAt) {
            setError('تاريخ التقديم مطلوب.');
            return;
        }
        onSave(correction);
        onClose();
    };

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.verdictCassation} className="isolate">
            <div className={panelClass} onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="text-white font-black text-sm whitespace-normal break-words">
                        طلب تصحيح القرار التمييزي — م 266
                    </div>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-white/70 text-xs mb-1">
                            القرار التمييزي المستهدف بالتصحيح
                        </label>
                        <textarea
                            className="w-full min-h-[72px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 resize-y"
                            value={correction.targetedDecisionDescription ?? ''}
                            disabled={readOnly}
                            onChange={(e) =>
                                setCorrection((p) => ({
                                    ...p,
                                    targetedDecisionDescription: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1">رقم طلب التصحيح *</label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={correction.correctionRequestNumber ?? ''}
                            disabled={readOnly}
                            onChange={(e) =>
                                setCorrection((p) => ({
                                    ...p,
                                    correctionRequestNumber: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs mb-1">تاريخ التقديم *</label>
                        <ModalIsoDateInput
                            value={correction.filedAt ?? ''}
                            onChange={(v) => setCorrection((p) => ({ ...p, filedAt: v }))}
                            disabled={readOnly}
                        />
                    </div>
                    {error ? (
                        <div className="rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-red-200 text-xs font-bold">
                            {error}
                        </div>
                    ) : null}
                </div>

                <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/80"
                    >
                        إلغاء
                    </button>
                    {!readOnly ? (
                        <button
                            type="button"
                            onClick={submit}
                            className="rounded-lg bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110"
                        >
                            حفظ طلب التصحيح
                        </button>
                    ) : null}
                </div>
            </div>
        </CriminalModalPortal>
    );
};
