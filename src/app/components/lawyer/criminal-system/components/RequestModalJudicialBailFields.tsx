import type { GuarantorBailKind, GuarantorPerson } from '../criminalStore';

export type RequestModalJudicialBailFieldsProps = {
    reqEntryLane: 'judicial' | 'lawyer' | '';
    reqIsDefendantBailEntry: boolean;
    hideGlobalBailFields?: boolean;
    trialCourtManualOnly?: boolean;
    reqBailKind?: GuarantorBailKind | '';
    reqBailAmount?: string;
    reqBailGuarantors?: GuarantorPerson[];
    onBailKindChange?: (kind: GuarantorBailKind | '') => void;
    onBailAmountChange?: (value: string) => void;
    onBailGuarantorsChange?: (list: GuarantorPerson[]) => void;
};

export function RequestModalJudicialBailFields({
    reqEntryLane,
    reqIsDefendantBailEntry,
    hideGlobalBailFields = false,
    trialCourtManualOnly = false,
    reqBailKind = '',
    reqBailAmount = '',
    reqBailGuarantors = [],
    onBailKindChange,
    onBailAmountChange,
    onBailGuarantorsChange,
}: RequestModalJudicialBailFieldsProps) {
    if (
        trialCourtManualOnly ||
        reqEntryLane !== 'judicial' ||
        !reqIsDefendantBailEntry ||
        hideGlobalBailFields
    ) {
        return null;
    }

    const updateGuarantorName = (id: string, name: string) => {
        if (!onBailGuarantorsChange) return;
        onBailGuarantorsChange(
            reqBailGuarantors.map((g) => (g.id === id ? { ...g, fullName: name } : g)),
        );
    };

    const addGuarantor = () => {
        if (!onBailGuarantorsChange) return;
        onBailGuarantorsChange([
            ...reqBailGuarantors,
            { id: `g_${Date.now()}_${reqBailGuarantors.length}`, fullName: '' },
        ]);
    };

    const removeGuarantor = (id: string) => {
        if (!onBailGuarantorsChange) return;
        onBailGuarantorsChange(reqBailGuarantors.filter((g) => g.id !== id));
    };

    return (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-3 space-y-3">
            <div className="text-emerald-100 text-xs font-black whitespace-normal break-words">
                🛡️ تفاصيل الكفالة *
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => onBailKindChange?.('financial')}
                    className={`rounded-lg border px-3 py-2 text-[12px] font-black transition ${
                        reqBailKind === 'financial'
                            ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                            : 'border-slate-600/60 bg-slate-900/40 text-white/70 hover:text-white hover:border-slate-500'
                    }`}
                >
                    كفالة مالية
                </button>
                <button
                    type="button"
                    onClick={() => onBailKindChange?.('personal')}
                    className={`rounded-lg border px-3 py-2 text-[12px] font-black transition ${
                        reqBailKind === 'personal'
                            ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                            : 'border-slate-600/60 bg-slate-900/40 text-white/70 hover:text-white hover:border-slate-500'
                    }`}
                >
                    كفالة شخص ضامن
                </button>
            </div>
            {reqBailKind === 'financial' ? (
                <div>
                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                        مبلغ الكفالة المالية *
                    </label>
                    <input
                        inputMode="numeric"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                        value={reqBailAmount}
                        onChange={(e) => onBailAmountChange?.(e.target.value)}
                        placeholder="مثال: 1000000"
                    />
                </div>
            ) : null}
            {reqBailKind === 'personal' ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <label className="block text-white/70 text-xs whitespace-normal break-words">
                            أسماء الكفلاء ({reqBailGuarantors.length})
                        </label>
                        <button
                            type="button"
                            onClick={addGuarantor}
                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/20 transition"
                        >
                            + إضافة كفيل
                        </button>
                    </div>
                    {reqBailGuarantors.length === 0 ? (
                        <p className="text-[11px] font-bold text-white/45 whitespace-normal break-words">
                            لم يُضَف أي كفيل بعد — اضغط «إضافة كفيل» لإدخال الأسماء.
                        </p>
                    ) : null}
                    {reqBailGuarantors.map((g, idx) => (
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
}
