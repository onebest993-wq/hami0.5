import type { AssetSeizureFugitive, SeizedAssetDraft } from './requestModalEntryLanes.types';

export type RequestModalAssetSeizureFieldsProps = {
    assetSeizureFugitives: AssetSeizureFugitive[];
    assetSeizureSelectedDefendantIds: string[];
    assetSeizureDraftsByDefendant: Record<string, SeizedAssetDraft[]>;
    onAssetSeizureSelectedChange?: (ids: string[]) => void;
    onAssetSeizureDraftsChange?: (defendantId: string, drafts: SeizedAssetDraft[]) => void;
};

export const RequestModalAssetSeizureFields = ({
    assetSeizureFugitives,
    assetSeizureSelectedDefendantIds,
    assetSeizureDraftsByDefendant,
    onAssetSeizureSelectedChange,
    onAssetSeizureDraftsChange,
}: RequestModalAssetSeizureFieldsProps) => {
    const isSeizureSelected = (did: string): boolean =>
        assetSeizureSelectedDefendantIds.includes(did);

    const toggleSeizureDefendant = (did: string) => {
        if (!onAssetSeizureSelectedChange) return;
        if (isSeizureSelected(did)) {
            onAssetSeizureSelectedChange(
                assetSeizureSelectedDefendantIds.filter((x) => x !== did),
            );
        } else {
            onAssetSeizureSelectedChange([...assetSeizureSelectedDefendantIds, did]);
        }
    };

    const getDraftsFor = (did: string): SeizedAssetDraft[] =>
        Array.isArray(assetSeizureDraftsByDefendant[did])
            ? assetSeizureDraftsByDefendant[did]
            : [];

    const addAssetRow = (did: string) => {
        if (!onAssetSeizureDraftsChange) return;
        const drafts = getDraftsFor(did);
        const localId = `a_${Date.now()}_${drafts.length}_${Math.random().toString(16).slice(2, 6)}`;
        onAssetSeizureDraftsChange(did, [
            ...drafts,
            { localId, description: '', referenceNumber: '', seizureDate: '', notes: '' },
        ]);
    };

    const removeAssetRow = (did: string, localId: string) => {
        if (!onAssetSeizureDraftsChange) return;
        onAssetSeizureDraftsChange(
            did,
            getDraftsFor(did).filter((a) => a.localId !== localId),
        );
    };

    const updateAssetField = (
        did: string,
        localId: string,
        field: keyof Omit<SeizedAssetDraft, 'localId'>,
        value: string,
    ) => {
        if (!onAssetSeizureDraftsChange) return;
        onAssetSeizureDraftsChange(
            did,
            getDraftsFor(did).map((a) =>
                a.localId === localId ? { ...a, [field]: value } : a,
            ),
        );
    };

    const singleFugitive = assetSeizureFugitives.length === 1 ? assetSeizureFugitives[0] : null;
    /** في الحالة المتعدّدة: نُظهر حاوية لكل متهم مُختار فقط. */
    const seizureContainerTargets = assetSeizureFugitives.filter((f) => isSeizureSelected(f.id));

    return (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-3 space-y-2.5">
            {/* الحالة المفردة: زرّ إضافة في الأعلى، وصفوف أنيقة من سطرٍ واحد. */}
            {singleFugitive ? (
                <>
                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            onClick={() => addAssetRow(singleFugitive.id)}
                            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-100 hover:bg-amber-500/20 transition whitespace-nowrap"
                        >
                            + إضافة صنف
                        </button>
                    </div>

                    {getDraftsFor(singleFugitive.id).map((a) => (
                        <div key={a.localId} className="flex items-center gap-2">
                            <input
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-[#E6C673]/60"
                                value={a.description}
                                onChange={(e) =>
                                    updateAssetField(singleFugitive.id, a.localId, 'description', e.target.value)
                                }
                                placeholder="وصف المال"
                            />
                            <button
                                type="button"
                                onClick={() => removeAssetRow(singleFugitive.id, a.localId)}
                                className="rounded-lg border border-red-500/35 bg-red-500/10 px-2 py-1.5 text-[11px] font-black text-red-200 hover:bg-red-500/20 transition shrink-0"
                                title="حذف هذا الصنف"
                                aria-label="حذف هذا الصنف"
                            >
                                🗑
                            </button>
                        </div>
                    ))}
                </>
            ) : (
                <>
                    {/* الحالة المتعددة: شارة عدّاد + شبكة اختيار + قسم لكل هارب مُختار بفاصل بصري وليس حاوية مُتداخلة. */}
                    <div className="flex items-center justify-end">
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-100 whitespace-nowrap">
                            هاربون {assetSeizureSelectedDefendantIds.length}/{assetSeizureFugitives.length}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {assetSeizureFugitives.map((f) => {
                            const checked = isSeizureSelected(f.id);
                            return (
                                <label
                                    key={f.id}
                                    className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer transition ${
                                        checked
                                            ? 'border-amber-400/60 bg-amber-500/15 text-amber-50'
                                            : 'border-slate-600/60 bg-slate-900/40 text-white/75 hover:border-amber-500/35'
                                    }`}
                                >
                                    <span className="text-[12px] font-black whitespace-normal break-words flex-1 min-w-0">
                                        {String(f.fullName ?? '').trim() || '—'}
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleSeizureDefendant(f.id)}
                                        className="h-4 w-4 accent-amber-400 shrink-0"
                                        aria-label={`اختيار ${f.fullName} للحجز`}
                                    />
                                </label>
                            );
                        })}
                    </div>

                    {seizureContainerTargets.map((target) => {
                        const drafts = getDraftsFor(target.id);
                        return (
                            <div key={target.id} className="space-y-2 pt-1">
                                <div className="flex items-center gap-2 border-t border-amber-500/15 pt-2">
                                    <span className="text-[11px] font-black text-amber-100 whitespace-normal break-words flex-1 min-w-0">
                                        {String(target.fullName ?? '').trim() || '—'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => addAssetRow(target.id)}
                                        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-100 hover:bg-amber-500/20 transition whitespace-nowrap shrink-0"
                                    >
                                        + إضافة صنف
                                    </button>
                                </div>

                                {drafts.map((a) => (
                                    <div key={a.localId} className="flex items-center gap-2">
                                        <input
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-[#E6C673]/60"
                                            value={a.description}
                                            onChange={(e) =>
                                                updateAssetField(target.id, a.localId, 'description', e.target.value)
                                            }
                                            placeholder="وصف المال"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeAssetRow(target.id, a.localId)}
                                            className="rounded-lg border border-red-500/35 bg-red-500/10 px-2 py-1.5 text-[11px] font-black text-red-200 hover:bg-red-500/20 transition shrink-0"
                                            title="حذف هذا الصنف"
                                            aria-label="حذف هذا الصنف"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
};
