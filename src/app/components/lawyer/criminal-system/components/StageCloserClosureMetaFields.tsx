import type { Dispatch, SetStateAction } from 'react';
import type { StageConclusion } from '../criminalStore';

export type StageCloserClosureMetaFieldsProps = {
    isCassationStage: boolean;
    closureDate: string;
    setClosureDate: Dispatch<SetStateAction<string>>;
    closureDefendantStatus: StageConclusion['defendantStatusAtDecision'];
    setClosureDefendantStatus: Dispatch<SetStateAction<StageConclusion['defendantStatusAtDecision']>>;
    closureDetails: string;
    setClosureDetails: Dispatch<SetStateAction<string>>;
    isDecisionDefendantStatus: (
        v: string,
    ) => v is StageConclusion['defendantStatusAtDecision'];
};

export function StageCloserClosureMetaFields({
    isCassationStage,
    closureDate,
    setClosureDate,
    closureDefendantStatus,
    setClosureDefendantStatus,
    closureDetails,
    setClosureDetails,
    isDecisionDefendantStatus,
}: StageCloserClosureMetaFieldsProps) {
    return (
        <>
            <div>
                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">تاريخ صدور القرار</label>
                <input
                    type="date"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                    value={closureDate}
                    onChange={(e) => setClosureDate(e.target.value)}
                />
            </div>

            {isCassationStage ? null : (
                <div>
                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                        حالة المتهم في لحظة القرار
                    </label>
                    <select
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                        value={closureDefendantStatus}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (isDecisionDefendantStatus(v)) setClosureDefendantStatus(v);
                        }}
                    >
                        <option value="detained" className="bg-slate-900 text-white">
                            موقوف
                        </option>
                        <option value="bailed" className="bg-slate-900 text-white">
                            مكفل
                        </option>
                        <option value="fugitive" className="bg-slate-900 text-white">
                            هارب
                        </option>
                    </select>
                </div>
            )}

            <div>
                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">نص القرار</label>
                <textarea
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[120px] resize-none"
                    value={closureDetails}
                    onChange={(e) => setClosureDetails(e.target.value)}
                />
            </div>
        </>
    );
}
