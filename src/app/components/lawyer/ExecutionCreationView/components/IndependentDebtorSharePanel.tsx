import React from 'react';
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
        <p className={`${ecg.subCardTitle} text-[#E6C673]`}>مقدار دين المدين المستقل</p>
        <div className={ecg.moneyWrap}>
            <input
                type="text"
                value={debtDraft}
                onChange={onDebtInput}
                className={ecg.moneyInput}
                aria-label="مقدار دين المدين المستقل"
            />
            <span className="text-slate-500 text-[10px] font-bold shrink-0">د.ع</span>
        </div>

        {showLawyerFeesShare && onLawyerFeesInput ? (
            <div className="space-y-1.5 border-t border-white/8 pt-3">
                <p className={`${ecg.subCardTitle} text-[#E6C673]`}>حصة أتعاب المحاماة لهذا المدين</p>
                <div className={ecg.moneyWrap}>
                    <input
                        type="text"
                        value={lawyerFeesDraft}
                        onChange={onLawyerFeesInput}
                        className={ecg.moneyInput}
                        aria-label="مقدار أتعاب المحاماة لهذا المدين"
                    />
                    <span className="text-slate-500 text-[10px] font-bold shrink-0">د.ع</span>
                </div>
            </div>
        ) : null}
    </div>
);
