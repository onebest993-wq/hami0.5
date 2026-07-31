import React from 'react';
import { Check } from 'lucide-react';
import { HamiDateInput } from '@/app/components/ui/HamiDateInput';
import { formatNumberInput } from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import { NC_FIELD, NC_LABEL, NC_SECTION, NC_SECTION_TITLE, ncFieldClass } from '../newCaseGlassTheme';
import { CaseFieldSelect } from './CaseFieldSelect';
import {
    getUnderlyingStageFieldLabel,
    getUnderlyingStageOptions,
    isExtraordinaryProcedureStage,
} from '../validation';

const VALUE_MODE_OPTIONS = [
    { id: 'undetermined' as const, label: 'دعوى غير مقدرة القيمة' },
    { id: 'fixedFee' as const, label: 'دعوى خاضعة للرسم المقطوع' },
];

export interface CaseBasicsFormProps {
    caseDetails: {
        number: string;
        court: string;
        type: string;
        judge: string;
        firstHearingDate: string;
        stage: string;
        claimValue: string;
        totalAgreedFees: string;
        retrialTargetStage?: string;
    };
    setCaseDetails: React.Dispatch<React.SetStateAction<{
        number: string;
        court: string;
        type: string;
        judge: string;
        firstHearingDate: string;
        stage: string;
        claimValue: string;
        totalAgreedFees: string;
        retrialTargetStage?: string;
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
    stageRef: React.RefObject<HTMLButtonElement | null>;
    numberRef: React.RefObject<HTMLInputElement | null>;
    retrialTargetRef?: React.RefObject<HTMLButtonElement | null>;
}

export const CaseBasicsForm = ({
    caseDetails, setCaseDetails,
    errorMap, caseNumberError,
    stageOptions,
    isUndeterminedValue, setIsUndeterminedValue,
    isFixedFee, setIsFixedFee,
    exceptionWarning,
    courtRef, typeRef, stageRef, numberRef, retrialTargetRef
}: CaseBasicsFormProps) => {
    const isExtraordinary = isExtraordinaryProcedureStage(caseDetails.stage);
    const underlyingStageOptions = getUnderlyingStageOptions(caseDetails.stage);
    const valueLocked = isUndeterminedValue || isFixedFee;

    const numberHasError = Boolean(errorMap['number'] || caseNumberError);

    const toggleValueMode = (id: 'undetermined' | 'fixedFee') => {
        if (id === 'undetermined') {
            const next = !isUndeterminedValue;
            setIsUndeterminedValue(next);
            if (next) setIsFixedFee(false);
        } else {
            const next = !isFixedFee;
            setIsFixedFee(next);
            if (next) setIsUndeterminedValue(false);
        }
    };

    return (
        <div className={NC_SECTION}>
            <h4 className={NC_SECTION_TITLE}>أساسيات الدعوى</h4>

            <div className="space-y-4">
                <div>
                    <label className={NC_LABEL}>رقم الدعوى</label>
                    <div className="relative group">
                        <input
                            ref={numberRef}
                            type="text"
                            inputMode="text"
                            autoComplete="off"
                            spellCheck={false}
                            value={caseDetails.number}
                            onChange={(e) => setCaseDetails({ ...caseDetails, number: e.target.value })}
                            className={`${NC_FIELD} text-left [unicode-bidi:plaintext] ${numberHasError ? 'border-amber-500/60 ring-1 ring-amber-500/20' : ''}`}
                        />
                    </div>
                    {caseNumberError && <p className="text-amber-500/80 text-[10px] mt-1.5 font-bold">{caseNumberError}</p>}
                </div>

                <div>
                    <label className={NC_LABEL}>اسم المحكمة المختصة</label>
                    <input
                        ref={courtRef}
                        type="text"
                        value={caseDetails.court}
                        onChange={(e) => setCaseDetails({ ...caseDetails, court: e.target.value })}
                        className={ncFieldClass(Boolean(errorMap['court']))}
                    />
                    {errorMap['court'] && <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">{errorMap['court']}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={NC_LABEL}>نوع الدعوى</label>
                        <input
                            ref={typeRef}
                            type="text"
                            value={caseDetails.type}
                            onChange={(e) => setCaseDetails({ ...caseDetails, type: e.target.value })}
                            className={ncFieldClass(Boolean(errorMap['type']))}
                        />
                        {errorMap['type'] && <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">{errorMap['type']}</p>}
                    </div>

                    <div>
                        <label className={NC_LABEL}>المرحلة الحالية</label>
                        <CaseFieldSelect
                            ref={stageRef}
                            value={caseDetails.stage}
                            onChange={(stage) => setCaseDetails({ ...caseDetails, stage })}
                            options={stageOptions}
                            placeholder="اختر المرحلة..."
                            hasError={Boolean(errorMap['stage'])}
                            aria-label="المرحلة الحالية"
                        />
                        {errorMap['stage'] && <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">{errorMap['stage']}</p>}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div>
                        <label className={NC_LABEL}>اسم السيد القاضي</label>
                        <input
                            type="text"
                            value={caseDetails.judge}
                            onChange={(e) => setCaseDetails({ ...caseDetails, judge: e.target.value })}
                            className={ncFieldClass()}
                        />
                    </div>
                    <div>
                        <label className={NC_LABEL}>تاريخ أول مرافعة</label>
                        <HamiDateInput
                            value={caseDetails.firstHearingDate}
                            onValueChange={(v) => setCaseDetails({ ...caseDetails, firstHearingDate: v })}
                            className={NC_FIELD}
                            placeholder="اختر التاريخ من التقويم"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div className="hidden sm:block" aria-hidden />
                    <div>
                        {isExtraordinary ? (
                            <>
                                <label className="text-[10px] text-[#E6C673] font-bold mb-1.5 block">
                                    {getUnderlyingStageFieldLabel(caseDetails.stage)}
                                </label>
                                <CaseFieldSelect
                                    ref={retrialTargetRef}
                                    value={caseDetails.retrialTargetStage ?? ''}
                                    onChange={(retrialTargetStage) =>
                                        setCaseDetails({ ...caseDetails, retrialTargetStage })
                                    }
                                    options={underlyingStageOptions}
                                    placeholder="اختر المرحلة..."
                                    hasError={Boolean(errorMap['retrialTargetStage'])}
                                    aria-label={getUnderlyingStageFieldLabel(caseDetails.stage)}
                                />
                                {errorMap['retrialTargetStage'] && (
                                    <p className="text-yellow-600/90 text-[10px] mt-1 font-medium">
                                        {errorMap['retrialTargetStage']}
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <label className="text-[10px] text-[#E6C673] font-bold mb-1 block">القيمة التقديرية للدعوى</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    data-testid="lawyer-new-case-claim-value"
                                    value={caseDetails.claimValue}
                                    disabled={valueLocked}
                                    onChange={(e) => setCaseDetails({ ...caseDetails, claimValue: formatNumberInput(e.target.value) })}
                                    className={`${ncFieldClass(Boolean(errorMap['claimValue']) || Boolean(exceptionWarning))} disabled:opacity-50 text-left`}
                                    placeholder={valueLocked ? '----' : undefined}
                                />
                                <div className="mt-2 flex flex-col gap-1.5">
                                    {VALUE_MODE_OPTIONS.map(({ id, label }) => {
                                        const active = id === 'undetermined' ? isUndeterminedValue : isFixedFee;
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                role="checkbox"
                                                aria-checked={active}
                                                onClick={() => toggleValueMode(id)}
                                                className={`flex items-center gap-2 w-full rounded-lg border px-2.5 py-1.5 text-[10px] font-medium text-right transition-all duration-200 ${
                                                    active
                                                        ? 'border-[#E6C673]/45 bg-[#E6C673]/10 text-[#E6C673] shadow-[0_0_12px_rgba(230,198,115,0.08)]'
                                                        : 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/15 hover:bg-white/[0.05] hover:text-white/65'
                                                }`}
                                            >
                                                <span
                                                    className={`shrink-0 w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-colors ${
                                                        active ? 'border-[#E6C673] bg-[#E6C673] text-[#0F172A]' : 'border-white/25 bg-transparent'
                                                    }`}
                                                >
                                                    {active && <Check size={9} strokeWidth={3} />}
                                                </span>
                                                <span className="leading-tight">{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {exceptionWarning && (
                                    <div className="mt-1 text-[9px] text-amber-400 font-bold animate-pulse">
                                        {exceptionWarning}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
