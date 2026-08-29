import React, { useEffect, useMemo, useState } from 'react';
import type { CassationAppealRemandTarget, CassationAppealResult, JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { CriminalActionParty } from '../criminalStageUtils';
import { formatConcernedPartyLabel } from '../criminalStageUtils';
import { ModalIsoDate } from './ModalIsoDate';
import {
    getCassationResultFormOptions,
    REMAND_COURT_OPTIONS,
    validateJudicialCassationResultForm,
    type RecordJudicialCassationResultPayload,
} from '../cassationJudicialForm';
import {
    INVESTIGATION_PURGE_CASSATION_RESULT_OPTIONS,
    validateInvestigationPurgeCassationResult,
} from '../investigationDefendantPurge';
import { isInvestigationStructuralCassationTemplate, formatJudicialTemplateDisplayLabel, normalizeProceduralRequestTemplate } from '../proceduralRequestTypes';
import { isProceduralCassationResult } from '../proceduralCassationResults';

export type JudicialCassationResultModalProps = {
    open: boolean;
    decision: JudicialDecision | null;
    appeal: JudicialDecisionAppeal | null;
    parties: CriminalActionParty[];
    onClose: () => void;
    onSubmit: (payload: RecordJudicialCassationResultPayload) => void;
};

export const JudicialCassationResultModal = ({
    open,
    decision,
    appeal,
    parties,
    onClose,
    onSubmit,
}: JudicialCassationResultModalProps) => {
    const [result, setResult] = useState<CassationAppealResult | ''>('');
    const [remandTargetStage, setRemandTargetStage] = useState<CassationAppealRemandTarget | ''>('');
    const [isObjectiveGrounds, setIsObjectiveGrounds] = useState(false);
    const [targetPartyIds, setTargetPartyIds] = useState<string[]>([]);
    const [modifiedCharge, setModifiedCharge] = useState('');
    const [modifiedArticle, setModifiedArticle] = useState('');
    const [error, setError] = useState('');

    const isPreparatory = decision?.decisionType !== 'dispositive';
    const isPurgeDecision = useMemo(() => {
        if (!decision) return false;
        const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
        return isInvestigationStructuralCassationTemplate(template);
    }, [decision]);

    const resultOptions = useMemo(() => {
        if (isPurgeDecision) return [...INVESTIGATION_PURGE_CASSATION_RESULT_OPTIONS];
        return getCassationResultFormOptions(isPreparatory ? 'preparatory' : 'dispositive');
    }, [isPurgeDecision, isPreparatory]);

    const defendantParties = useMemo(() => parties.filter((p) => p.source === 'defendant'), [parties]);
    const complainantParties = useMemo(() => parties.filter((p) => p.source === 'complainant'), [parties]);
    const allPartyIds = useMemo(() => parties.map((p) => p.id), [parties]);

    useEffect(() => {
        if (!open) return;
        setResult('');
        setRemandTargetStage('');
        setIsObjectiveGrounds(false);
        setTargetPartyIds([]);
        setModifiedCharge('');
        setModifiedArticle('');
        setError('');
    }, [open, appeal?.id]);

    if (!open || !decision || !appeal) return null;

    const showDispositiveFields = !isPreparatory && !isPurgeDecision;

    const toggleParty = (id: string) => {
        setTargetPartyIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
        setError('');
    };

    const handleSubmit = () => {
        const payload: RecordJudicialCassationResultPayload = {
            result: result as CassationAppealResult,
            isObjectiveGrounds: isPurgeDecision ? false : isObjectiveGrounds,
            targetDefendantIds: isPurgeDecision ? undefined : targetPartyIds.length ? targetPartyIds : undefined,
            remandTargetStage: showDispositiveFields && remandTargetStage ? remandTargetStage : undefined,
            modifiedCharge: showDispositiveFields ? modifiedCharge.trim() || undefined : undefined,
            modifiedArticle: showDispositiveFields ? modifiedArticle.trim() || undefined : undefined,
            date: new Date().toISOString().slice(0, 10),
            details: `نتيجة تمييزية على: ${decision.title}`,
        };

        const validationError = isPurgeDecision
            ? validateInvestigationPurgeCassationResult(payload.result)
            : validateJudicialCassationResultForm(
                  payload,
                  allPartyIds,
                  isPreparatory ? 'preparatory' : 'dispositive',
              );
        if (validationError) {
            setError(validationError);
            return;
        }
        if (!isPurgeDecision && isPreparatory && !isProceduralCassationResult(payload.result)) {
            setError('اختر نتيجة إجرائية من الخيارات المخصّصة لقرارات التحقيق.');
            return;
        }
        onSubmit(payload);
    };

    const renderPartyChecks = (list: CriminalActionParty[], title: string) => (
        <div className="rounded-xl border border-slate-600/70 bg-slate-900/40 p-3 space-y-2">
            <div className="text-white font-black text-xs whitespace-normal break-words">{title}</div>
            {list.length ? (
                list.map((p) => (
                    <label
                        key={p.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-600/70 bg-slate-900/60 px-3 py-2 text-sm font-bold text-white cursor-pointer"
                    >
                        <input
                            type="checkbox"
                            checked={targetPartyIds.includes(p.id)}
                            onChange={() => toggleParty(p.id)}
                            className="h-4 w-4 accent-[#E6C673]"
                        />
                        <span className="whitespace-normal break-words">{formatConcernedPartyLabel(p)}</span>
                    </label>
                ))
            ) : (
                <div className="text-white/50 text-xs font-bold">لا أطراف.</div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[510] isolate bg-black/62 backdrop-blur-sm p-4 flex items-center justify-center print:hidden" dir="rtl">
            <div
                className="relative z-[511] w-full max-w-lg max-h-[min(90vh,720px)] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="text-white font-black text-sm">نتيجة الطعن التمييزي</div>
                    <div className="text-white/55 text-xs mt-1 whitespace-normal break-words">
                        {formatJudicialTemplateDisplayLabel(decision.title)}
                        {appeal.appellantManualLabel ? (
                            <>
                                <span aria-hidden> • </span>
                                <span>الطاعن: {appeal.appellantManualLabel}</span>
                            </>
                        ) : null}
                        {appeal.filedAt ? (
                            <>
                                <span aria-hidden> • </span>
                                <ModalIsoDate value={appeal.filedAt} />
                            </>
                        ) : null}
                    </div>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    {error ? (
                        <div className="rounded-xl border border-red-500/40 bg-red-900/20 p-3 text-red-200 text-sm font-bold whitespace-normal break-words">
                            {error}
                        </div>
                    ) : null}
                    <div>
                        <label className="block text-white/70 text-xs mb-1">نتيجة التمييز</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={result}
                            onChange={(e) => {
                                setResult(e.target.value as CassationAppealResult | '');
                                setError('');
                            }}
                        >
                            <option value="">اختر...</option>
                            {resultOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {showDispositiveFields ? (
                        <>
                            <div>
                                <label className="block text-white/70 text-xs mb-1">المحكمة المعاد إليها الملف</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={remandTargetStage}
                                    onChange={(e) => {
                                        setRemandTargetStage(e.target.value as CassationAppealRemandTarget | '');
                                        setError('');
                                    }}
                                >
                                    <option value="">اختر...</option>
                                    {REMAND_COURT_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 rounded-xl border border-violet-500/35 bg-violet-950/20 p-3">
                                <div>
                                    <label className="block text-white/70 text-xs mb-1">الوصف القانوني الجديد</label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={modifiedCharge}
                                        onChange={(e) => {
                                            setModifiedCharge(e.target.value);
                                            setError('');
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/70 text-xs mb-1">المادة القانونية الجديدة</label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={modifiedArticle}
                                        onChange={(e) => {
                                            setModifiedArticle(e.target.value);
                                            setError('');
                                        }}
                                    />
                                </div>
                            </div>
                            {renderPartyChecks(defendantParties, 'المتهمون — مستفيدون / مرجع')}
                            {renderPartyChecks(complainantParties, 'المشتكون — مستفيدون / مرجع')}
                            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-600/70 bg-slate-800/40 px-3 py-3 cursor-pointer">
                                <span className="text-white text-xs font-black whitespace-normal break-words">
                                    أسباب النقض موضوعية مشتركة (م 269/ب)
                                </span>
                                <input
                                    type="checkbox"
                                    checked={isObjectiveGrounds}
                                    onChange={(e) => setIsObjectiveGrounds(e.target.checked)}
                                    className="h-5 w-5 accent-[#E6C673] shrink-0"
                                />
                            </label>
                        </>
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
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!result}
                        className="rounded-lg bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 disabled:opacity-40"
                    >
                        حفظ النتيجة
                    </button>
                </div>
            </div>
        </div>
    );
};
