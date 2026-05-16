import React from 'react';
import { Briefcase, Coins } from 'lucide-react';

export interface CaseBasicsFormProps {
    caseDetails: {
        number: string;
        court: string;
        type: string;
        judge: string;
        stage: string;
        claimValue: string;
        totalAgreedFees: string;
    };
    setCaseDetails: React.Dispatch<React.SetStateAction<{
        number: string;
        court: string;
        type: string;
        judge: string;
        stage: string;
        claimValue: string;
        totalAgreedFees: string;
    }>>;
    errorMap: Record<string, string>;
    caseNumberError: string | null;
    labels: { courtPlaceholder: string; typePlaceholder: string };
    stageOptions: string[];
    isUndeterminedValue: boolean;
    setIsUndeterminedValue: React.Dispatch<React.SetStateAction<boolean>>;
    isFixedFee: boolean;
    setIsFixedFee: React.Dispatch<React.SetStateAction<boolean>>;
    valuePlaceholder: string;
    exceptionWarning: string | null;
    courtRef: React.RefObject<HTMLInputElement | null>;
    typeRef: React.RefObject<HTMLInputElement | null>;
    stageRef: React.RefObject<HTMLSelectElement | null>;
    numberRef: React.RefObject<HTMLInputElement | null>;
}

export const CaseBasicsForm = ({
    caseDetails, setCaseDetails,
    errorMap, caseNumberError, labels,
    stageOptions,
    isUndeterminedValue, setIsUndeterminedValue,
    isFixedFee, setIsFixedFee,
    valuePlaceholder, exceptionWarning,
    courtRef, typeRef, stageRef, numberRef
}: CaseBasicsFormProps) => {
    return (
        <div className="bg-[#151925] border-b border-white/5 p-5">
            <h4 className="flex items-center gap-2 text-xs font-bold text-[#E6C673] uppercase tracking-wider mb-4">
                <Briefcase size={12} /> أساسيات الدعوى
            </h4>

            <div className="space-y-4">
                <div>
                    <label className="text-[10px] text-white mb-1 block">رقم الدعوى</label>
                    <input
                        ref={numberRef}
                        type="text"
                        value={caseDetails.number}
                        onChange={(e) => setCaseDetails({...caseDetails, number: e.target.value})}
                        className={`w-full bg-[#2A3241] border ${errorMap['number'] || caseNumberError ? 'border-amber-500' : 'border-white/15'} rounded-lg px-3 py-2 text-white focus:border-[#E6C673] outline-none text-sm placeholder-white/50 text-right`}
                        placeholder={caseDetails.stage.includes('استئناف') ? "15/س/2026" : "15/ب/2026"}
                        dir="ltr"
                    />
                    <p className="text-white/30 text-[10px] mt-1 text-right">يدعم الأرقام والحروف (مثال: 15/ب/2024)</p>
                    {caseNumberError && <p className="text-amber-500/80 text-[10px] mt-1 font-bold">{caseNumberError}</p>}
                </div>

                <div>
                    <label className="text-[10px] text-white mb-1 block">اسم المحكمة المختصة</label>
                    <input
                        ref={courtRef}
                        type="text"
                        value={caseDetails.court}
                        onChange={(e) => setCaseDetails({...caseDetails, court: e.target.value})}
                        className={`w-full bg-[#2A3241] border ${errorMap['court'] ? 'border-yellow-500' : 'border-white/15'} rounded-lg px-3 py-2 text-white focus:border-[#E6C673] outline-none text-sm placeholder-white/50`}
                        placeholder={labels.courtPlaceholder}
                    />
                    {errorMap['court'] && <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">{errorMap['court']}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] text-white mb-1 block">نوع الدعوى</label>
                        <input
                            ref={typeRef}
                            type="text"
                            value={caseDetails.type}
                            onChange={(e) => setCaseDetails({...caseDetails, type: e.target.value})}
                            className={`w-full bg-[#2A3241] border ${errorMap['type'] ? 'border-yellow-500' : 'border-white/15'} rounded-lg px-3 py-2 text-white focus:border-[#E6C673] outline-none text-sm placeholder-white/50`}
                            placeholder={labels.typePlaceholder}
                        />
                        {errorMap['type'] && <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">{errorMap['type']}</p>}
                    </div>

                    <div>
                        <label className="text-[10px] text-white mb-1 block">المرحلة الحالية</label>
                        <select
                            ref={stageRef}
                            value={caseDetails.stage}
                            onChange={(e) => setCaseDetails({...caseDetails, stage: e.target.value})}
                            className={`w-full bg-[#2A3241] border ${errorMap['stage'] ? 'border-yellow-500' : 'border-white/15'} rounded-lg px-3 py-2 text-white focus:border-[#E6C673] outline-none text-sm placeholder-white/50 appearance-none`}
                        >
                            <option value="" disabled>اختر المرحلة...</option>
                            {stageOptions.map(opt => (
                                <option key={opt} value={opt} className="bg-[#1A1E2E]">{opt}</option>
                            ))}
                        </select>
                        {errorMap['stage'] && <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">{errorMap['stage']}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 items-start">
                    <div>
                        <label className="text-[10px] text-white mb-1 block">اسم السيد القاضي</label>
                        <input
                            type="text"
                            value={caseDetails.judge}
                            onChange={(e) => setCaseDetails({...caseDetails, judge: e.target.value})}
                            className="w-full bg-[#2A3241] border border-white/15 rounded-lg px-3 py-2 text-white focus:border-[#E6C673] outline-none text-sm placeholder-white/50"
                            placeholder="اختياري"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-[#E6C673] font-bold mb-1 block flex items-center gap-1"><Coins size={10} /> القيمة التقديرية للدعوى</label>
                        <input
                            type="text"
                            value={caseDetails.claimValue}
                            disabled={isUndeterminedValue || isFixedFee}
                            onChange={(e) => setCaseDetails({...caseDetails, claimValue: e.target.value})}
                            className={`w-full bg-[#2A3241] border ${errorMap['claimValue'] ? 'border-amber-500' : (exceptionWarning ? 'border-amber-500/50' : 'border-white/15')} rounded-lg px-3 py-2 text-white focus:border-[#E6C673] outline-none text-sm disabled:opacity-50`}
                            placeholder={isUndeterminedValue || isFixedFee ? "----" : valuePlaceholder}
                        />
                        <div className="flex gap-3 mt-2">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isUndeterminedValue}
                                    onChange={(e) => { setIsUndeterminedValue(e.target.checked); if (e.target.checked) setIsFixedFee(false); }}
                                    className="accent-[#E6C673] w-3 h-3"
                                />
                                <span className="text-[9px] text-white/70">دعوى غير مقدرة القيمة</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isFixedFee}
                                    onChange={(e) => { setIsFixedFee(e.target.checked); if (e.target.checked) setIsUndeterminedValue(false); }}
                                    className="accent-[#E6C673] w-3 h-3"
                                />
                                <span className="text-[9px] text-white/70">دعوى خاضعة للرسم المقطوع</span>
                            </label>
                        </div>
                        {exceptionWarning && (
                            <div className="mt-1 text-[9px] text-amber-400 font-bold animate-pulse">
                                {exceptionWarning}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
