import { useState } from 'react';
import type { SeizedAsset } from '../criminalStore';
import { useCriminalStore } from '../criminalStore';
import { ConfirmActionModal } from '../ConfirmActionModal';

/**
 * جسم الكاشف — لائحة الأصناف مع التعديل، فكّ حجز فردي/جماعي.
 * يُرسَم تحت بطاقة الطرف (متهم أو مشتكي متقابل) عند فتح العلامة.
 * يَختار الـ store-actions المناسبة حسب `kind` (defendant | complainant).
 */
export function PartySeizedAssetsDisclosure({
    caseId,
    partyId,
    partyName,
    assets,
    disabled,
    kind,
}: {
    caseId: string;
    partyId: string;
    partyName: string;
    assets: SeizedAsset[];
    disabled?: boolean;
    /** نوع الطرف: متهم أصلي أو مشتكي متقابل (يَنعكس على الـ store-actions المُختارة). */
    kind: 'defendant' | 'complainant';
}) {
    const updateDefendantSeizedAsset = useCriminalStore((s) => s.updateDefendantSeizedAsset);
    const releaseDefendantSeizedAssets = useCriminalStore((s) => s.releaseDefendantSeizedAssets);
    const updateCrossComplainantSeizedAsset = useCriminalStore(
        (s) => s.updateCrossComplainantSeizedAsset,
    );
    const releaseCrossComplainantSeizedAssets = useCriminalStore(
        (s) => s.releaseCrossComplainantSeizedAssets,
    );
    const updateAsset = kind === 'defendant'
        ? updateDefendantSeizedAsset
        : updateCrossComplainantSeizedAsset;
    const releaseAssets = kind === 'defendant'
        ? releaseDefendantSeizedAssets
        : releaseCrossComplainantSeizedAssets;

    const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
    const [editDescription, setEditDescription] = useState('');
    const [confirmReleaseAll, setConfirmReleaseAll] = useState(false);
    const [pendingReleaseId, setPendingReleaseId] = useState<string | null>(null);

    const startEdit = (a: SeizedAsset) => {
        setEditingAssetId(a.id);
        setEditDescription(a.description ?? '');
    };

    const cancelEdit = () => {
        setEditingAssetId(null);
        setEditDescription('');
    };

    const saveEdit = () => {
        if (!editingAssetId) return;
        const description = editDescription.trim();
        if (!description) return;
        updateAsset(caseId, partyId, editingAssetId, { description });
        cancelEdit();
    };

    const partyLabel = kind === 'defendant' ? 'المتهم' : 'المشتكي';

    return (
        <div
            id={`seized-assets-${partyId}`}
            className="mt-1.5 w-full rounded-md border border-amber-500/30 bg-amber-950/15 p-2 space-y-1.5"
        >
            {!disabled ? (
                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        onClick={() => setConfirmReleaseAll(true)}
                        className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-100 hover:bg-emerald-500/20 transition whitespace-nowrap"
                        title="فكّ الحجز عن كل الأموال"
                    >
                        ↩ فك الحجز عن الكل
                    </button>
                </div>
            ) : null}
            <ul className="space-y-1.5 m-0 p-0 list-none">
                {assets.map((a) => {
                    const isEditing = editingAssetId === a.id;
                    if (isEditing) {
                        return (
                            <li
                                key={a.id}
                                className="rounded-md border border-amber-500/30 bg-slate-900/60 p-2 space-y-1.5"
                            >
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-white outline-none focus:border-[#E6C673]/60"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="وصف المال"
                                />
                                <div className="flex items-center justify-end gap-1.5">
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        className="rounded-md border border-slate-600/60 bg-slate-800/40 px-2 py-0.5 text-[10px] font-black text-white/75 hover:text-white transition"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="button"
                                        onClick={saveEdit}
                                        disabled={editDescription.trim().length === 0}
                                        className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-100 hover:bg-amber-500/25 transition disabled:opacity-40"
                                    >
                                        حفظ
                                    </button>
                                </div>
                            </li>
                        );
                    }
                    return (
                        <li
                            key={a.id}
                            className="rounded-md border border-slate-700/60 bg-slate-900/40 px-2 py-1.5 flex items-start justify-between gap-2"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-black text-white whitespace-normal break-words">
                                    {String(a.description ?? '').trim() || '—'}
                                </div>
                            </div>
                            {!disabled ? (
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => startEdit(a)}
                                        className="rounded-md border border-slate-600/60 bg-slate-800/40 px-1.5 py-0.5 text-[10px] font-black text-white/80 hover:text-white hover:border-amber-500/45 transition"
                                        title="تعديل الصنف"
                                        aria-label="تعديل الصنف"
                                    >
                                        ✏
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPendingReleaseId(a.id)}
                                        className="rounded-md border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-black text-emerald-100 hover:bg-emerald-500/20 transition"
                                        title="فكّ الحجز عن هذا الصنف"
                                        aria-label="فكّ الحجز عن هذا الصنف"
                                    >
                                        ↩
                                    </button>
                                </div>
                            ) : null}
                        </li>
                    );
                })}
            </ul>

            <ConfirmActionModal
                open={confirmReleaseAll}
                title="تأكيد فكّ الحجز الجماعي"
                message={`سيُفكّ الحجز عن جميع الأموال (${assets.length}) لِـ ${partyLabel}: ${partyName}. لا يمكن التراجع.`}
                confirmText="فكّ الحجز عن الكل"
                cancelText="إلغاء"
                onConfirm={() => {
                    releaseAssets(caseId, partyId);
                    setConfirmReleaseAll(false);
                }}
                onCancel={() => setConfirmReleaseAll(false)}
            />

            <ConfirmActionModal
                open={pendingReleaseId !== null}
                title="تأكيد فكّ الحجز"
                message="سيُفكّ الحجز عن هذا الصنف ولا يمكن التراجع. متابعة؟"
                confirmText="فكّ الحجز"
                cancelText="إلغاء"
                onConfirm={() => {
                    if (pendingReleaseId) {
                        releaseAssets(caseId, partyId, [pendingReleaseId]);
                    }
                    setPendingReleaseId(null);
                }}
                onCancel={() => setPendingReleaseId(null)}
            />
        </div>
    );
}
