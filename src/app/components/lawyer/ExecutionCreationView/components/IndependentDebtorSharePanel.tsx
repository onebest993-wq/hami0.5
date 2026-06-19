import React from 'react';
import { DollarSign, Scale } from 'lucide-react';
import { ecg } from './executionCreationGlassUi';

export type IndependentDebtorSharePanelProps = {
    debtDraft: string;
    onDebtInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showLawyerFeesShare?: boolean;
    lawyerFeesDraft?: string;
    onLawyerFeesInput?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

/** حصة المدين المستقل — إدخال يدوي للدين وأتعاب المحاماة */
export const IndependentDebtorSharePanel: React.FC<IndependentDebtorSharePanelProps> = ({
    debtDraft,
    onDebtInput,
    showLawyerFeesShare = false,
    lawyerFeesDraft = '',
    onLawyerFeesInput,
}) => (
    <div className={`${ecg.subCard} space-y-3`}>
        <p className={`${ecg.subCardTitle} text-[#E6C673] flex items-center gap-2`}>
            <DollarSign size={14} />
            مقدار دين المدين المستقل
        </p>
        <div className={ecg.moneyWrap}>
            <DollarSign className="text-[#E6C673]/70 shrink-0" size={14} />
            <input
                type="text"
                value={debtDraft}
                onChange={onDebtInput}
                className={ecg.moneyInput}
                placeholder="أدخل مبلغ الدين لهذا المدين"
                aria-label="مقدار دين المدين المستقل"
            />
            <span className="text-slate-500 text-[10px] font-bold">IQD</span>
        </div>

        {showLawyerFeesShare && onLawyerFeesInput ? (
            <div className="space-y-1.5 border-t border-white/8 pt-3">
                <p className={`${ecg.subCardTitle} text-[#E6C673] flex items-center gap-2`}>
                    <Scale size={14} />
                    حصة أتعاب المحاماة لهذا المدين
                </p>
                <div className={ecg.moneyWrap}>
                    <Scale className="text-[#E6C673]/70 shrink-0" size={14} />
                    <input
                        type="text"
                        value={lawyerFeesDraft}
                        onChange={onLawyerFeesInput}
                        className={ecg.moneyInput}
                        placeholder="مقدار الأتعاب المطالب بها"
                        aria-label="مقدار أتعاب المحاماة لهذا المدين"
                    />
                    <span className="text-slate-500 text-[10px] font-bold">IQD</span>
                </div>
            </div>
        ) : null}
    </div>
);
