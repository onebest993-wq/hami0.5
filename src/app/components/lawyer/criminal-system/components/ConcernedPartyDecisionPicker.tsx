import React, { useEffect } from 'react';
import type { GuarantorBailKind, GuarantorPerson } from '../criminalStore';
import type { CriminalActionParty } from '../criminalStageUtils';
import { ModalIsoDateInput } from './ModalIsoDateInput';
import { JUVENILE_INVESTIGATION_DETENTION_AUTHORITY } from '../juvenileInvestigationRules';

export type PartyDetentionDraft = {
    startDate: string;
    endDate: string;
};

export type PartyBailDraft = {
    kind: GuarantorBailKind | '';
    bailAmount: string;
    guarantors: GuarantorPerson[];
};

export function emptyPartyBailDraft(): PartyBailDraft {
    return { kind: 'financial', bailAmount: '', guarantors: [] };
}

export function isPartyBailDraftValid(draft: PartyBailDraft | undefined): boolean {
    if (!draft || (draft.kind !== 'financial' && draft.kind !== 'personal')) return false;
    if (draft.kind === 'financial') return draft.bailAmount.trim().length > 0;
    return draft.guarantors.some((g) => String(g.fullName ?? '').trim().length > 0);
}

export type ConcernedPartyDecisionPickerProps = {
    parties: CriminalActionParty[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    label?: string;
    /** بطاقة مستقلة لكل طرف مُؤشَّر — مدة التوقيف أو تفاصيل الكفالة أو تأكيد الإدراج. */
    showPerPartyCards?: boolean;
    showDetentionFields?: boolean;
    showBailFields?: boolean;
    detentionByPartyId?: Record<string, PartyDetentionDraft>;
    onDetentionChange?: (partyId: string, patch: Partial<PartyDetentionDraft>) => void;
    bailByPartyId?: Record<string, PartyBailDraft>;
    onBailChange?: (partyId: string, patch: Partial<PartyBailDraft>) => void;
    /** قرار كفالة موحّد لجميع المُؤشَّرين — بطاقة واحدة وطلب واحد. */
    unifiedBailMode?: boolean;
    onUnifiedBailModeChange?: (value: boolean) => void;
    /** مدة توقيف موحّدة لجميع المُؤشَّرين — بطاقة واحدة وقرار واحد. */
    unifiedDetentionMode?: boolean;
    onUnifiedDetentionModeChange?: (value: boolean) => void;
    requestDate?: string;
    juvenileDetentionLocked?: boolean;
    formatPartyLabel: (party: CriminalActionParty) => string;
    unknownPartyRows?: React.ReactNode;
};

const PartyBailFields = ({
    partyId,
    draft,
    onBailChange,
}: {
    partyId: string;
    draft: PartyBailDraft;
    onBailChange?: (partyId: string, patch: Partial<PartyBailDraft>) => void;
}) => {
    const addGuarantor = () => {
        const next: GuarantorPerson = {
            id: `g_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
            fullName: '',
        };
        onBailChange?.(partyId, { guarantors: [...draft.guarantors, next] });
    };

    const updateGuarantorName = (guarantorId: string, fullName: string) => {
        onBailChange?.(partyId, {
            guarantors: draft.guarantors.map((g) =>
                g.id === guarantorId ? { ...g, fullName } : g,
            ),
        });
    };

    const removeGuarantor = (guarantorId: string) => {
        onBailChange?.(partyId, {
            guarantors: draft.guarantors.filter((g) => g.id !== guarantorId),
        });
    };

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => onBailChange?.(partyId, { kind: 'financial' })}
                    className={`rounded-lg border px-3 py-2 text-[12px] font-black transition ${
                        draft.kind === 'financial'
                            ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                            : 'border-slate-600/60 bg-slate-900/40 text-white/70 hover:text-white hover:border-slate-500'
                    }`}
                >
                    كفالة مالية
                </button>
                <button
                    type="button"
                    onClick={() => onBailChange?.(partyId, { kind: 'personal' })}
                    className={`rounded-lg border px-3 py-2 text-[12px] font-black transition ${
                        draft.kind === 'personal'
                            ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                            : 'border-slate-600/60 bg-slate-900/40 text-white/70 hover:text-white hover:border-slate-500'
                    }`}
                >
                    كفالة شخص ضامن
                </button>
            </div>
            {draft.kind === 'financial' ? (
                <div>
                    <label className="block text-white/65 text-[11px] mb-1 whitespace-normal break-words">
                        مبلغ الكفالة المالية *
                    </label>
                    <input
                        inputMode="numeric"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                        value={draft.bailAmount}
                        onChange={(e) => onBailChange?.(partyId, { bailAmount: e.target.value })}
                        placeholder="مثال: 1000000"
                    />
                </div>
            ) : null}
            {draft.kind === 'personal' ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <label className="block text-white/65 text-[11px] whitespace-normal break-words">
                            أسماء الكفلاء ({draft.guarantors.length})
                        </label>
                        <button
                            type="button"
                            onClick={addGuarantor}
                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/20 transition"
                        >
                            + إضافة كفيل
                        </button>
                    </div>
                    {draft.guarantors.length === 0 ? (
                        <p className="text-[11px] font-bold text-white/45 whitespace-normal break-words">
                            لم يُضَف أي كفيل بعد — اضغط «إضافة كفيل».
                        </p>
                    ) : null}
                    {draft.guarantors.map((g, idx) => (
                        <div key={g.id} className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-white/45 w-6 text-center">
                                {idx + 1}
                            </span>
                            <input
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={g.fullName}
                                onChange={(e) => updateGuarantorName(g.id, e.target.value)}
                                placeholder="الاسم الكامل للكفيل"
                            />
                            <button
                                type="button"
                                onClick={() => removeGuarantor(g.id)}
                                className="rounded-lg border border-red-500/35 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-black text-red-200 hover:bg-red-500/20 transition"
                                title="حذف الكفيل"
                            >
                                🗑
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

export const ConcernedPartyDecisionPicker = ({
    parties,
    selectedIds,
    onChange,
    label = 'الأشخاص المعنيون بالقرار *',
    showPerPartyCards = true,
    showDetentionFields = false,
    showBailFields = false,
    detentionByPartyId = {},
    onDetentionChange,
    bailByPartyId = {},
    onBailChange,
    unifiedBailMode = false,
    onUnifiedBailModeChange,
    unifiedDetentionMode = false,
    onUnifiedDetentionModeChange,
    requestDate = '',
    juvenileDetentionLocked = false,
    formatPartyLabel,
    unknownPartyRows,
}: ConcernedPartyDecisionPickerProps) => {
    const multiParty = parties.length > 1;
    const hasDecisionFields = showBailFields || showDetentionFields;

    useEffect(() => {
        if (parties.length !== 1) return;
        const soleId = parties[0]!.id;
        if (!selectedIds.includes(soleId)) {
            onChange([soleId]);
        }
    }, [parties, selectedIds, onChange]);

    const toggle = (partyId: string, next: boolean) => {
        if (next) {
            onChange(selectedIds.includes(partyId) ? selectedIds : [...selectedIds, partyId]);
            return;
        }
        onChange(selectedIds.filter((id) => id !== partyId));
    };

    const toggleAll = () => {
        const allIds = parties.map((p) => p.id);
        const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
        onChange(allSelected ? [] : allIds);
    };

    const selectedParties =
        parties.length === 1 && parties[0]
            ? [parties[0]]
            : parties.filter((p) => selectedIds.includes(p.id));

    if (parties.length === 1 && !hasDecisionFields && !unknownPartyRows) {
        return null;
    }

    const showUnifiedBailToggle = multiParty && showBailFields && selectedParties.length > 1;
    const showUnifiedDetentionToggle = multiParty && showDetentionFields && selectedParties.length > 1;
    const useUnifiedBailCard = showUnifiedBailToggle && unifiedBailMode;
    const useUnifiedDetentionCard = showUnifiedDetentionToggle && unifiedDetentionMode;

    const applyBailPatchToAll = (patch: Partial<PartyBailDraft>) => {
        if (!onBailChange) return;
        for (const party of selectedParties) {
            onBailChange(party.id, patch);
        }
    };

    const applyDetentionPatchToAll = (patch: Partial<PartyDetentionDraft>) => {
        if (!onDetentionChange) return;
        for (const party of selectedParties) {
            onDetentionChange(party.id, patch);
        }
    };

    const unifiedBailDraft = bailByPartyId[selectedParties[0]?.id ?? ''] ?? emptyPartyBailDraft();
    const unifiedDetentionDraft = detentionByPartyId[selectedParties[0]?.id ?? ''] ?? {
        startDate: '',
        endDate: '',
    };

    if (parties.length === 0 && !unknownPartyRows) {
        return <div className="text-white/50 text-sm">— لا يوجد أطراف مؤهلون</div>;
    }

    return (
        <div className="space-y-3">
            {multiParty ? (
                <>
                    <div className="flex items-center justify-between gap-2">
                        <label className="block text-white/70 text-xs whitespace-normal break-words">{label}</label>
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="rounded-md border border-slate-600/60 bg-slate-900/40 px-2 py-1 text-[10px] font-black text-white/70 hover:text-white hover:border-slate-500 transition shrink-0"
                        >
                            {parties.every((p) => selectedIds.includes(p.id)) ? 'إلغاء الكل' : 'تحديد الكل'}
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 rounded-xl border border-slate-700/60 bg-slate-900/30 p-2 max-h-40 overflow-y-auto">
                        {parties.map((party) => {
                            const checked = selectedIds.includes(party.id);
                            return (
                                <label
                                    key={party.id}
                                    className={`flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 transition ${
                                        checked
                                            ? 'bg-[#E6C673]/10 border border-[#E6C673]/35'
                                            : 'border border-transparent hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => toggle(party.id, e.target.checked)}
                                        className="h-4 w-4 accent-[#E6C673] shrink-0"
                                    />
                                    <span className="text-sm text-white whitespace-normal break-words">
                                        {formatPartyLabel(party)}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </>
            ) : null}

            {unknownPartyRows}

            {showUnifiedBailToggle ? (
                <button
                    type="button"
                    onClick={() => onUnifiedBailModeChange?.(!unifiedBailMode)}
                    className={`w-full rounded-lg border px-3 py-2 text-[11px] font-black transition whitespace-normal break-words ${
                        unifiedBailMode
                            ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100'
                            : 'border-slate-600/60 bg-slate-900/40 text-white/70 hover:text-white hover:border-slate-500'
                    }`}
                >
                    {unifiedBailMode ? '✓ نفس الكفالة للجميع (بطاقة واحدة)' : 'نفس الكفالة للجميع'}
                </button>
            ) : null}

            {showUnifiedDetentionToggle ? (
                <button
                    type="button"
                    onClick={() => onUnifiedDetentionModeChange?.(!unifiedDetentionMode)}
                    className={`w-full rounded-lg border px-3 py-2 text-[11px] font-black transition whitespace-normal break-words ${
                        unifiedDetentionMode
                            ? 'border-sky-400/60 bg-sky-500/15 text-sky-100'
                            : 'border-slate-600/60 bg-slate-900/40 text-white/70 hover:text-white hover:border-slate-500'
                    }`}
                >
                    {unifiedDetentionMode
                        ? '✓ نفس مدة التوقيف للجميع (بطاقة واحدة)'
                        : 'نفس مدة التوقيف للجميع'}
                </button>
            ) : null}

            {showPerPartyCards && selectedParties.length > 0 && hasDecisionFields ? (
                <div className="space-y-2">
                    {useUnifiedBailCard && showBailFields ? (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3 space-y-2">
                            <div className="text-emerald-100 text-xs font-black whitespace-normal break-words">
                                {selectedParties.map((p) => formatPartyLabel(p)).join(' • ')}
                            </div>
                            <PartyBailFields
                                partyId={selectedParties[0]!.id}
                                draft={unifiedBailDraft}
                                onBailChange={(_, patch) => applyBailPatchToAll(patch)}
                            />
                        </div>
                    ) : null}

                    {useUnifiedDetentionCard && showDetentionFields ? (
                        <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 space-y-2">
                            <div className="text-sky-100 text-xs font-black whitespace-normal break-words">
                                {selectedParties.map((p) => formatPartyLabel(p)).join(' • ')}
                            </div>
                            {juvenileDetentionLocked ? (
                                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-[10px] font-bold text-amber-100/90 whitespace-normal break-words">
                                    مكان الإيداع: {JUVENILE_INVESTIGATION_DETENTION_AUTHORITY}
                                </div>
                            ) : null}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-white/65 text-[11px] mb-1 whitespace-normal break-words">
                                        تاريخ بدء التوقيف *
                                    </label>
                                    <ModalIsoDateInput
                                        value={unifiedDetentionDraft.startDate}
                                        onChange={(v) => applyDetentionPatchToAll({ startDate: v })}
                                        max={unifiedDetentionDraft.endDate.trim() || undefined}
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/65 text-[11px] mb-1 whitespace-normal break-words">
                                        تاريخ انتهاء التوقيف *
                                    </label>
                                    <ModalIsoDateInput
                                        value={unifiedDetentionDraft.endDate}
                                        onChange={(v) => applyDetentionPatchToAll({ endDate: v })}
                                        min={
                                            unifiedDetentionDraft.startDate.trim() ||
                                            requestDate.trim() ||
                                            undefined
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {(useUnifiedBailCard && showBailFields) ||
                    (useUnifiedDetentionCard && showDetentionFields)
                        ? null
                        : selectedParties.map((party) => {
                        const detentionDraft = detentionByPartyId[party.id] ?? {
                            startDate: '',
                            endDate: '',
                        };
                        const bailDraft = bailByPartyId[party.id] ?? emptyPartyBailDraft();
                        const cardTone = showBailFields
                            ? 'border-emerald-500/30 bg-emerald-950/15'
                            : 'border-sky-500/30 bg-sky-950/20';
                        const titleTone = showBailFields ? 'text-emerald-100' : 'text-sky-100';
                        const fieldsBody = (
                            <>
                                {showDetentionFields ? (
                                    <>
                                        {juvenileDetentionLocked ? (
                                            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-[10px] font-bold text-amber-100/90 whitespace-normal break-words">
                                                مكان الإيداع: {JUVENILE_INVESTIGATION_DETENTION_AUTHORITY}
                                            </div>
                                        ) : null}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-white/65 text-[11px] mb-1 whitespace-normal break-words">
                                                    تاريخ بدء التوقيف *
                                                </label>
                                                <ModalIsoDateInput
                                                    value={detentionDraft.startDate}
                                                    onChange={(v) =>
                                                        onDetentionChange?.(party.id, { startDate: v })
                                                    }
                                                    max={detentionDraft.endDate.trim() || undefined}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-white/65 text-[11px] mb-1 whitespace-normal break-words">
                                                    تاريخ انتهاء التوقيف *
                                                </label>
                                                <ModalIsoDateInput
                                                    value={detentionDraft.endDate}
                                                    onChange={(v) =>
                                                        onDetentionChange?.(party.id, { endDate: v })
                                                    }
                                                    min={
                                                        detentionDraft.startDate.trim() ||
                                                        requestDate.trim() ||
                                                        undefined
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : null}
                                {showBailFields ? (
                                    <PartyBailFields
                                        partyId={party.id}
                                        draft={bailDraft}
                                        onBailChange={onBailChange}
                                    />
                                ) : null}
                            </>
                        );

                        if (!multiParty) {
                            return (
                                <div key={party.id} className="space-y-2">
                                    {fieldsBody}
                                </div>
                            );
                        }

                        return (
                            <div
                                key={party.id}
                                className={`rounded-xl border p-3 space-y-2 ${cardTone}`}
                            >
                                <div className={`${titleTone} text-xs font-black whitespace-normal break-words`}>
                                    {formatPartyLabel(party)}
                                </div>
                                {fieldsBody}
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
};
