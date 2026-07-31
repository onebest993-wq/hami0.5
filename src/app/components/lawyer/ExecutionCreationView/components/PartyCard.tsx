import React, { useEffect, useState } from 'react';
import { Trash2, UserCheck } from 'lucide-react';
import type { Party } from '@/app/types/common';
import { DebtorEntityKindSegment } from '@/app/components/lawyer/ExecutionDashboard/components/DebtorEntityKindSegment';
import { normalizeDebtorEntityKind } from '@/app/utils/debtorEntityKindUtils';
import { ecg } from './executionCreationGlassUi';

import type { DebtorEntityKind } from '@/app/utils/debtorEntityKindUtils';

interface PartyCardProps {
    party: Party;
    index: number;
    totalCount: number;
    type: 'creditor' | 'debtor';
    onUpdate: (id: string | number, field: string, value: string | boolean | number) => void;
    onRemove: (id: string | number) => void;
    /** مستقل / ضامن — عند تعدد المدينين مع تقسيم مدني فقط */
    debtorLiabilityLabel?: 'مستقل' | 'ضامن' | null;
    lockedEntityKind?: DebtorEntityKind | null;
    /** أحوال شخصية — لا اختيار طبيعي/معنوي */
    hideDebtorEntityKind?: boolean;
}

const OCCUPATIONS = ['كاسب', 'موظف'] as const;

function readEntityKind(party: Party) {
    return normalizeDebtorEntityKind(
        (party as { entityKind?: string; entityType?: string; type?: string }).entityKind ??
            (party as { entityType?: string }).entityType ??
            (party.type === 'company' ? 'legal_entity' : 'natural_person')
    );
}

const PartyCard: React.FC<PartyCardProps> = React.memo(({
    party, index, totalCount, type, onUpdate, onRemove,
    debtorLiabilityLabel = null,
    lockedEntityKind = null,
    hideDebtorEntityKind = false,
}) => {
    const isCreditor = type === 'creditor';
    const isClient = Boolean(party.isClient);
    const entityKind = readEntityKind(party);
    const isLegalEntity = !isCreditor && entityKind === 'legal_entity';
    const showDebtorEntityKind = !isCreditor && !isClient && !hideDebtorEntityKind;

    const [draft, setDraft] = useState({
        name: party.name ?? '',
        address: party.address ?? '',
    });

    useEffect(() => {
        setDraft({
            name: party.name ?? '',
            address: party.address ?? '',
        });
    }, [party.id]);

    const displayTitle =
        totalCount > 1
            ? `${index + 1}- ${isCreditor ? 'دائن' : 'مدين'}`
            : isCreditor
              ? 'الدائن'
              : 'المدين';

    const pillIdle = 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/16 hover:bg-white/[0.07]';
    const pillActive = isCreditor
        ? 'border-emerald-400/45 bg-emerald-500/14 text-emerald-100 shadow-[0_0_16px_-8px_rgba(52,211,153,0.5)]'
        : 'border-rose-400/45 bg-rose-500/14 text-rose-100 shadow-[0_0_16px_-8px_rgba(251,113,133,0.5)]';
    const segWrap = 'inline-flex items-stretch rounded-xl border border-white/10 bg-white/[0.03] p-0.5 backdrop-blur-sm';
    const segBtn =
        'rounded-[10px] px-2.5 py-1.5 text-[11px] font-bold transition-all duration-200 min-w-[3rem] text-center';
    const segIdle = 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]';
    const segActive = isCreditor
        ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/25'
        : 'bg-rose-500/20 text-rose-100 border border-rose-400/25';

    const pillClass = (active: boolean) =>
        [
            'inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5',
            'text-[11px] font-bold backdrop-blur-sm transition-colors duration-150 cursor-pointer select-none',
            active ? pillActive : pillIdle,
        ].join(' ');

    const handleEntityKindChange = (next: ReturnType<typeof readEntityKind>) => {
        onUpdate(party.id, 'entityKind', next);
        onUpdate(party.id, 'entityType', next);
        onUpdate(party.id, 'type', next === 'legal_entity' ? 'company' : 'individual');
        if (next === 'legal_entity') {
            onUpdate(party.id, 'occupation', 'معنوي');
            onUpdate(party.id, 'isClient', false);
        }
    };

    return (
        <div className="p-3">
            <div className="flex justify-between items-center mb-2 pb-2 gap-2">
                <div className="flex items-center gap-2 shrink-0">
                    <h4 className={`${isCreditor ? 'text-emerald-500' : 'text-rose-500'} font-bold text-sm`}>
                        {displayTitle}
                    </h4>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {!isLegalEntity ? (
                        <button
                            type="button"
                            onClick={() => onUpdate(party.id, 'isClient', !isClient)}
                            className={pillClass(isClient)}
                        >
                            <span
                                className={[
                                    'flex h-[18px] w-[18px] items-center justify-center rounded-md border transition-colors duration-150',
                                    isClient
                                        ? isCreditor
                                            ? 'border-emerald-300/80 bg-emerald-300/90'
                                            : 'border-rose-300/80 bg-rose-300/90'
                                        : 'border-white/20 bg-[#0A0F1C]/50',
                                ].join(' ')}
                            >
                                {isClient ? (
                                    <UserCheck size={10} className="text-[#0A0F1C]" strokeWidth={2.5} />
                                ) : null}
                            </span>
                            موكلي
                        </button>
                    ) : null}

                    {showDebtorEntityKind ? (
                        <DebtorEntityKindSegment
                            value={entityKind}
                            allowLegalEntity={!isClient}
                            lockedEntityKind={lockedEntityKind}
                            onChange={handleEntityKindChange}
                        />
                    ) : null}

                    {!isCreditor && !isLegalEntity ? (
                        <div className={segWrap} role="group" aria-label="الصفة">
                            {OCCUPATIONS.map((occ) => {
                                const active = party.occupation === occ;
                                return (
                                    <button
                                        key={occ}
                                        type="button"
                                        onClick={() => onUpdate(party.id, 'occupation', occ)}
                                        className={`${segBtn} ${active ? segActive : segIdle}`}
                                    >
                                        {occ}
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}

                    {index > 0 ? (
                        <button
                            type="button"
                            onClick={() => onRemove(party.id)}
                            className={`${isCreditor ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-rose-500 hover:bg-rose-500/10'} p-1 rounded transition-colors`}
                            title={isCreditor ? 'حذف الدائن' : 'حذف المدين'}
                        >
                            <Trash2 size={16} />
                        </button>
                    ) : null}
                </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
                <input
                    type="text"
                    placeholder="الاسم الكامل"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    onBlur={() => onUpdate(party.id, 'name', draft.name)}
                    className={`${ecg.field} flex-1`}
                />
                {!isCreditor && debtorLiabilityLabel ? (
                    <span className="text-[10px] font-bold text-[#F0DFA8]/90 border border-[#E6C673]/25 rounded-lg px-2 py-1 shrink-0 whitespace-nowrap">
                        {debtorLiabilityLabel}
                    </span>
                ) : null}
            </div>
            <input
                type="text"
                placeholder={isCreditor ? 'العنوان (اختياري)' : 'العنوان الدقيق (مطلوب للتبليغ)'}
                value={draft.address}
                onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                onBlur={() => onUpdate(party.id, 'address', draft.address)}
                className={ecg.field}
            />
        </div>
    );
});

PartyCard.displayName = 'PartyCard';

export default PartyCard;
export type { PartyCardProps };
