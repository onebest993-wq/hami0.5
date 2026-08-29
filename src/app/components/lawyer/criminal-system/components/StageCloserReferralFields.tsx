import type { Dispatch, SetStateAction } from 'react';
import type { StageCloserDecisionType } from '../orchestrators/criminalOrchestratorSliceTypes';
import { isReferralStageValue } from './stageCloserModalGuards';

export type StageCloserReferralFieldsProps = {
    closureDecisionType: StageCloserDecisionType;
    closureReferralStage: 'محكمة الجنح' | 'محكمة الجنايات' | '';
    setClosureReferralStage: Dispatch<SetStateAction<'محكمة الجنح' | 'محكمة الجنايات' | ''>>;
    closureReferralCourtName: string;
    setClosureReferralCourtName: Dispatch<SetStateAction<string>>;
    closureReferralCaseNumber: string;
    setClosureReferralCaseNumber: Dispatch<SetStateAction<string>>;
};

export function StageCloserReferralFields({
    closureDecisionType,
    closureReferralStage,
    setClosureReferralStage,
    closureReferralCourtName,
    setClosureReferralCourtName,
    closureReferralCaseNumber,
    setClosureReferralCaseNumber,
}: StageCloserReferralFieldsProps) {
    if (
        !(
            closureDecisionType === 'referral' ||
            closureDecisionType === 'case_split_fugitive_referral' ||
            closureDecisionType === 'misdemeanor_to_felony_jurisdiction' ||
            closureDecisionType === 'felony_to_misdemeanor_jurisdiction'
        )
    ) {
        return null;
    }

    return (
        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-3">
            {closureDecisionType === 'referral' ||
            closureDecisionType === 'case_split_fugitive_referral' ? (
                <div>
                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                        المحكمة المحال إليها
                    </label>
                    <select
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                        value={closureReferralStage}
                        onChange={(e) => {
                            const v = e.target.value;
                            setClosureReferralStage(isReferralStageValue(v) ? v : '');
                        }}
                    >
                        <option value="" className="bg-slate-900 text-white">
                            اختر...
                        </option>
                        <option value="محكمة الجنح" className="bg-slate-900 text-white">
                            محكمة الجنح
                        </option>
                        <option value="محكمة الجنايات" className="bg-slate-900 text-white">
                            محكمة الجنايات
                        </option>
                    </select>
                </div>
            ) : null}
            <div>
                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                    اسم محكمة الموضوع
                </label>
                <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                    value={closureReferralCourtName}
                    onChange={(e) => setClosureReferralCourtName(e.target.value)}
                />
            </div>
            <div>
                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                    رقم الدعوى الجديد (اختياري)
                </label>
                <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                    value={closureReferralCaseNumber}
                    onChange={(e) => setClosureReferralCaseNumber(e.target.value)}
                />
            </div>
        </div>
    );
}
