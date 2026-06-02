import React, { useEffect, useMemo, useState } from 'react';
import type { JudicialAppellantType, JudicialCassationAppealPath, JudicialDecision } from '@/app/types/criminal';
import type { CriminalActionParty } from '../criminalStageUtils';
import { formatConcernedPartyLabel } from '../criminalStageUtils';
import {
    filterDefendantPartiesForDecision,
    resolveAutoAppellantPartyIds,
    resolveAutoAppellantSideForDecision,
} from '../judicialDecisionsEngine';
import {
    formatJudicialTemplateDisplayLabel,
    isInvestigationClosureAppealablePurgeTemplate,
    normalizeProceduralRequestTemplate,
} from '../proceduralRequestTypes';
import { ModalIsoDate } from './ModalIsoDate';

export type JudicialCassationAppealModalVariant = JudicialCassationAppealPath | 'declare_final';

export type JudicialCassationAppealModalProps = {
    open: boolean;
    decision: JudicialDecision | null;
    parties: CriminalActionParty[];
    variant?: JudicialCassationAppealModalVariant;
    onClose: () => void;
    onSubmit: (payload: {
        appellantType: JudicialAppellantType;
        appellantIds: string[];
        targetDefendantIds: string[];
        appellantManualLabel?: string;
    }) => string | null | void;
};

type AppellantPickKind = JudicialAppellantType | 'manual';

function resolvePurgeTargetDefendantIds(decision: JudicialDecision): string[] {
    const fromDecision = (Array.isArray(decision.defendantIds) ? decision.defendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (fromDecision.length) return fromDecision;
    const fromBeneficiary = (Array.isArray(decision.beneficiaryPartyIds) ? decision.beneficiaryPartyIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    return fromBeneficiary;
}

const VARIANT_COPY: Record<
    JudicialCassationAppealModalVariant,
    { title: string; submit: string; actorLabel: string; manualPlaceholder: string }
> = {
    ordinary: {
        title: '⚖️ تسجيل طعن تمييزي',
        submit: 'تسجيل الطعن',
        actorLabel: 'من قام بالطعن *',
        manualPlaceholder: 'مثال: الادعاء العام / وكيل المتهم...',
    },
    intervention_264b: {
        title: '⚖️ طلب تدخل تمييزي (م 264-ب)',
        submit: 'تسجيل طلب التدخل',
        actorLabel: 'من قام بطلب التدخل *',
        manualPlaceholder: 'مثال: الادعاء العام / النائب العام...',
    },
    correction_266: {
        title: '⚖️ طلب تصحيح قرار تمييزي (م 266)',
        submit: 'تسجيل طلب التصحيح',
        actorLabel: 'من قام بطلب التصحيح *',
        manualPlaceholder: 'مثال: وكيل المتهم / الادعاء العام...',
    },
    declare_final: {
        title: '⚖️ إعلان حكم بات',
        submit: 'اختتام الإعلان',
        actorLabel: 'من قام بالإعلان *',
        manualPlaceholder: 'مثال: المحامي / الطرف المعني...',
    },
};

export const JudicialCassationAppealModal = ({
    open,
    decision,
    parties,
    variant = 'ordinary',
    onClose,
    onSubmit,
}: JudicialCassationAppealModalProps) => {
    const [pickKind, setPickKind] = useState<AppellantPickKind>('defendant');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [manualAppellantLabel, setManualAppellantLabel] = useState('');
    const [error, setError] = useState('');

    const defendantParties = useMemo(
        () => filterDefendantPartiesForDecision(parties, decision),
        [parties, decision],
    );
    const complainantParties = useMemo(() => parties.filter((p) => p.source === 'complainant'), [parties]);

    const isPurgeClosureAppeal = useMemo(() => {
        if (!decision) return false;
        const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
        return isInvestigationClosureAppealablePurgeTemplate(template);
    }, [decision]);

    const autoAppellantType: JudicialAppellantType | null = useMemo(
        () => (isPurgeClosureAppeal ? 'complainant' : resolveAutoAppellantSideForDecision(decision)),
        [decision, isPurgeClosureAppeal],
    );

    const isManualPick = pickKind === 'manual';
    const appellantType: JudicialAppellantType =
        pickKind === 'manual' ? (isPurgeClosureAppeal ? 'complainant' : autoAppellantType ?? 'defendant') : pickKind;

    const partiesForType = (t: JudicialAppellantType) =>
        t === 'complainant' ? complainantParties : defendantParties;

    useEffect(() => {
        if (!open) return;
        setError('');
        setManualAppellantLabel('');
        const initType = autoAppellantType ?? 'defendant';
        const list = partiesForType(initType);
        if (isPurgeClosureAppeal && list.length === 0) {
            setPickKind('manual');
            setSelectedIds([]);
            return;
        }
        setPickKind(initType);
        const auto = resolveAutoAppellantPartyIds(decision, initType, list);
        if (auto.length > 0) {
            setSelectedIds(auto);
        } else if (list.length === 1) {
            setSelectedIds([list[0]!.id]);
        } else if (isPurgeClosureAppeal && list.length > 1) {
            setSelectedIds([]);
        } else {
            setSelectedIds([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, decision?.id, isPurgeClosureAppeal]);

    if (!open || !decision) return null;

    const copy = VARIANT_COPY[variant];
    const displayTitle = formatJudicialTemplateDisplayLabel(decision.title);
    const activeParties = appellantType === 'complainant' ? complainantParties : defendantParties;
    const appellantPartyPickerVisible = !isManualPick && !isPurgeClosureAppeal && activeParties.length > 1;
    const purgeComplainantPickerVisible =
        isPurgeClosureAppeal && !isManualPick && complainantParties.length > 1;
    const canSubmit = isManualPick ? Boolean(manualAppellantLabel.trim()) : selectedIds.length > 0;

    const toggleId = (id: string) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
        setError('');
    };

    const handlePickKindChange = (next: AppellantPickKind) => {
        setPickKind(next);
        setError('');
        if (next === 'manual') {
            setSelectedIds([]);
            return;
        }
        const list = partiesForType(next);
        const auto = resolveAutoAppellantPartyIds(decision, next, list);
        if (auto.length > 0) setSelectedIds(auto);
        else if (list.length === 1) setSelectedIds([list[0]!.id]);
        else setSelectedIds([]);
    };

    const handleSubmit = () => {
        if (isManualPick) {
            if (!manualAppellantLabel.trim()) {
                setError(`أدخل ${copy.actorLabel.replace(' *', '')}.`);
                return;
            }
        } else if (!selectedIds.length) {
            setError(
                isPurgeClosureAppeal
                    ? complainantParties.length > 1
                        ? 'حدّد مشتكياً واحداً على الأقل قدّم الطعن.'
                        : 'لا يوجد مشتكٍ/ادعاء عام لتسجيل الإجراء.'
                    : 'حدّد طرفاً واحداً على الأقل.',
            );
            return;
        }

        const targetDefendantIds = isPurgeClosureAppeal
            ? resolvePurgeTargetDefendantIds(decision)
            : selectedIds;

        const err = onSubmit({
            appellantType,
            appellantIds: isManualPick ? [] : selectedIds,
            targetDefendantIds,
            appellantManualLabel: isManualPick ? manualAppellantLabel.trim() : undefined,
        });
        if (typeof err === 'string' && err.trim()) {
            setError(err);
        }
    };

    const manualEntryField = (
        <div>
            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                {copy.actorLabel}
            </label>
            <input
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                value={manualAppellantLabel}
                onChange={(e) => {
                    setManualAppellantLabel(e.target.value);
                    setError('');
                }}
                placeholder={copy.manualPlaceholder}
            />
        </div>
    );

    return (
        <div className="fixed inset-0 z-[510] isolate bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden" dir="rtl">
            <div
                className="relative z-[511] w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <div className="text-white font-black text-sm whitespace-normal break-words">{copy.title}</div>
                    <div className="text-white/55 text-xs mt-1 whitespace-normal break-words">
                        {displayTitle}
                        <span aria-hidden> • </span>
                        <ModalIsoDate value={decision.issuedAt} />
                    </div>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    {error ? (
                        <div className="rounded-xl border border-red-500/40 bg-red-900/20 p-3 text-red-200 text-sm font-bold">
                            {error}
                        </div>
                    ) : null}
                    {isPurgeClosureAppeal ? (
                        complainantParties.length === 0 ? (
                            <>
                                <div className="rounded-xl border border-amber-500/35 bg-amber-950/15 px-3 py-2 text-amber-100 text-xs font-bold whitespace-normal break-words">
                                    لا يوجد مشتكٍ مسجّل — أدخل مقدم الطعن يدوياً.
                                </div>
                                {manualEntryField}
                            </>
                        ) : purgeComplainantPickerVisible ? (
                            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-2">
                                <div className="text-white font-black text-xs whitespace-normal break-words">
                                    المشتكون — حدّد من قدّم الطعن (يمكن اختيار أكثر من واحد)
                                </div>
                                {complainantParties.map((p) => (
                                    <label
                                        key={p.id}
                                        className="flex items-center gap-2 rounded-lg border border-slate-600/70 bg-slate-900/60 px-3 py-2 text-sm font-bold text-white cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(p.id)}
                                            onChange={() => toggleId(p.id)}
                                            className="h-4 w-4 accent-[#E6C673]"
                                        />
                                        <span className="whitespace-normal break-words">
                                            {formatConcernedPartyLabel(p)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        ) : null
                    ) : (
                        <>
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    مقدم الطعن / المميِّز
                                </label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={pickKind}
                                    onChange={(e) => handlePickKindChange(e.target.value as AppellantPickKind)}
                                >
                                    <option value="defendant">متهم / وكيل المتهم</option>
                                    <option value="complainant">مشتكي / ادعاء عام</option>
                                    <option value="manual">إدخال يدوي</option>
                                </select>
                            </div>
                            {isManualPick ? manualEntryField : null}
                        </>
                    )}
                    {!isPurgeClosureAppeal && !isManualPick && appellantPartyPickerVisible ? (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-2">
                            <div className="text-white font-black text-xs whitespace-normal break-words">
                                {appellantType === 'complainant'
                                    ? 'المشتكون — حدّد الطاعنين'
                                    : 'المتهمون — حدّد الطاعنين'}
                            </div>
                            {activeParties.map((p) => (
                                <label
                                    key={p.id}
                                    className="flex items-center gap-2 rounded-lg border border-slate-600/70 bg-slate-900/60 px-3 py-2 text-sm font-bold text-white cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(p.id)}
                                        onChange={() => toggleId(p.id)}
                                        className="h-4 w-4 accent-[#E6C673]"
                                    />
                                    <span className="whitespace-normal break-words">{formatConcernedPartyLabel(p)}</span>
                                </label>
                            ))}
                        </div>
                    ) : !isPurgeClosureAppeal && !isManualPick && activeParties.length === 0 ? (
                        <div className="rounded-xl border border-amber-500/35 bg-amber-950/15 px-3 py-2 text-amber-100 text-xs font-bold whitespace-normal break-words">
                            لا أطراف في صفة {appellantType === 'complainant' ? 'المشتكي/الادعاء العام' : 'المتهم'} — استخدم «إدخال يدوي».
                        </div>
                    ) : null}
                </div>
                <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/80">
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="rounded-lg bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 disabled:opacity-40"
                    >
                        {copy.submit}
                    </button>
                </div>
            </div>
        </div>
    );
};
