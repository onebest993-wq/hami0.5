import type { Statement } from '../../criminalStore';
import {
    STATEMENT_GIVER_TYPE_OPTIONS,
    type PersonOption,
} from './criminalStatementModalHelpers';

export type CriminalStatementModalGiverSectionProps = {
    editingStatementId: string | null;
    statementGiverType: Statement['giverType'] | '';
    setStatementGiverType: (next: Statement['giverType'] | '') => void;
    setStatementPartyId: (id: string) => void;
    setStatementManualName: (name: string) => void;
    setWitnessName: (name: string) => void;
    setWitnessDetails: (details: string) => void;
    setWitnessPartySide: (side: 'complainant' | 'defendant' | '') => void;
    setWitnessPartyIds: (ids: string[]) => void;
    giverNameLabel: string;
    isWitnessGiver: boolean;
    isPartyPickerGiver: boolean;
    witnessName: string;
    statementManualName: string;
    singlePartyAutoOption: PersonOption | null;
    hideSinglePartyNameBlock: boolean;
    partyOptionsForGiver: PersonOption[];
    statementPartyId: string;
    witnessPartySide: 'complainant' | 'defendant' | '';
    selectWitnessPartySide: (side: 'complainant' | 'defendant') => void;
    witnessSideParties: PersonOption[];
    witnessPartyIds: string[];
    toggleWitnessPartyId: (partyId: string) => void;
    witnessDetails: string;
};

export function CriminalStatementModalGiverSection({
    editingStatementId,
    statementGiverType,
    setStatementGiverType,
    setStatementPartyId,
    setStatementManualName,
    setWitnessName,
    setWitnessDetails,
    setWitnessPartySide,
    setWitnessPartyIds,
    giverNameLabel,
    isWitnessGiver,
    isPartyPickerGiver,
    witnessName,
    statementManualName,
    singlePartyAutoOption,
    hideSinglePartyNameBlock,
    partyOptionsForGiver,
    statementPartyId,
    witnessPartySide,
    selectWitnessPartySide,
    witnessSideParties,
    witnessPartyIds,
    toggleWitnessPartyId,
    witnessDetails,
}: CriminalStatementModalGiverSectionProps) {
    return (
        <>
            <div>
                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">صفة المُدلي بالإفادة</label>
                <select
                    disabled={Boolean(editingStatementId)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 disabled:opacity-60"
                    value={statementGiverType}
                    onChange={(e) => {
                        const next = e.target.value as Statement['giverType'] | '';
                        setStatementGiverType(next);
                        setStatementPartyId('');
                        setStatementManualName('');
                        setWitnessName('');
                        setWitnessDetails('');
                        setWitnessPartySide('');
                        setWitnessPartyIds([]);
                    }}
                >
                    <option value="" className="bg-slate-900 text-white">
                        اختر...
                    </option>
                    {STATEMENT_GIVER_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            {statementGiverType ? (
                <>
                    {isWitnessGiver || editingStatementId ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words text-right">
                                {giverNameLabel}
                            </label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-black outline-none focus:border-[#E6C673]/60"
                                value={isWitnessGiver ? witnessName : statementManualName}
                                onChange={(e) => {
                                    if (isWitnessGiver) setWitnessName(e.target.value);
                                    else setStatementManualName(e.target.value);
                                }}
                                placeholder="الاسم الرباعي الكامل..."
                            />
                        </div>
                    ) : isPartyPickerGiver ? (
                        singlePartyAutoOption ? (
                            hideSinglePartyNameBlock ? null : (
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words text-right">
                                        {giverNameLabel}
                                    </label>
                                    <div className="w-full bg-slate-900/60 border border-slate-700/70 rounded-xl px-3 py-2 text-sm text-white font-black whitespace-normal break-words">
                                        {singlePartyAutoOption.fullName.trim() || '—'}
                                    </div>
                                </div>
                            )
                        ) : partyOptionsForGiver.length === 0 ? (
                            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-[11px] font-black text-amber-100 whitespace-normal break-words">
                                لا يوجد {statementGiverType === 'complainant' ? 'مشتكون' : 'متهمون'} مُؤهَّلون لتَسجيل إفادة.
                            </div>
                        ) : (
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words text-right">
                                    {giverNameLabel}
                                </label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={statementPartyId}
                                    onChange={(e) => setStatementPartyId(e.target.value)}
                                >
                                    <option value="" className="bg-slate-900 text-white">
                                        اختر...
                                    </option>
                                    {partyOptionsForGiver.map((p) => (
                                        <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                                            {p.fullName.trim() || '—'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )
                    ) : null}

                    {isWitnessGiver ? (
                        <>
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words text-right">
                                    جهة الشهادة *
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => selectWitnessPartySide('complainant')}
                                        aria-pressed={witnessPartySide === 'complainant'}
                                        className={`rounded-xl border px-3 py-2 text-[12px] font-black transition whitespace-normal break-words ${
                                            witnessPartySide === 'complainant'
                                                ? 'border-sky-400/60 bg-sky-500/12 text-sky-100'
                                                : 'border-slate-600/60 bg-slate-900/40 text-white/70 hover:text-white hover:border-slate-500'
                                        }`}
                                    >
                                        المشتكي / المجني عليه
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => selectWitnessPartySide('defendant')}
                                        aria-pressed={witnessPartySide === 'defendant'}
                                        className={`rounded-xl border px-3 py-2 text-[12px] font-black transition whitespace-normal break-words ${
                                            witnessPartySide === 'defendant'
                                                ? 'border-red-400/60 bg-red-500/12 text-red-100'
                                                : 'border-slate-600/60 bg-slate-900/40 text-white/70 hover:text-white hover:border-slate-500'
                                        }`}
                                    >
                                        المشكو منه / المتهم
                                    </button>
                                </div>
                            </div>
                            {witnessPartySide ? (
                                witnessSideParties.length === 0 ? (
                                    <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-[11px] font-black text-amber-100 whitespace-normal break-words">
                                        لا يوجد {witnessPartySide === 'complainant' ? 'مشتكون' : 'متهمون'} مُؤهَّلون لربط الشهادة.
                                    </div>
                                ) : witnessSideParties.length > 1 ? (
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words text-right">
                                            يخص *
                                        </label>
                                        <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-2 space-y-1.5">
                                            {witnessSideParties.map((p) => {
                                                const checked = witnessPartyIds.includes(p.id);
                                                return (
                                                    <label
                                                        key={p.id}
                                                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm cursor-pointer transition ${
                                                            checked
                                                                ? 'border-[#E6C673]/40 bg-[#E6C673]/10 text-white'
                                                                : 'border-slate-700/70 bg-slate-900/40 text-white/80 hover:border-slate-600'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 accent-[#E6C673]"
                                                            checked={checked}
                                                            onChange={() => toggleWitnessPartyId(p.id)}
                                                        />
                                                        <span className="font-bold whitespace-normal break-words">
                                                            {p.fullName.trim() || '—'}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null
                            ) : null}
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words text-right">
                                    تفاصيل الشاهد (العمر / السكن / صلة القرابة)
                                </label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={witnessDetails}
                                    onChange={(e) => setWitnessDetails(e.target.value)}
                                    placeholder="اختياري"
                                />
                            </div>
                        </>
                    ) : null}
                </>
            ) : null}
        </>
    );
}
