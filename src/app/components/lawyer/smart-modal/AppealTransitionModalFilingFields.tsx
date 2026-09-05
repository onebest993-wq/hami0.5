import React from 'react';
import type { JudgmentModalStyles } from './smartFile/smartModalChrome';

export type AppealTransitionModalFilingFieldsProps = {
    s: JudgmentModalStyles;
    filingDate: string;
    setFilingDate: (value: string) => void;
    newCaseNumber: string;
    setNewCaseNumber: (value: string) => void;
    caseNumberLabel: string;
    caseNumberOptional?: boolean;
    /** محكمة الاستئناف عند أول طعن استئنافي أو إضبارة مستقلة */
    showCourtField?: boolean;
    courtName?: string;
    setCourtName?: (value: string) => void;
    courtFieldRequired?: boolean;
};

export function AppealTransitionModalFilingFields({
    s,
    filingDate,
    setFilingDate,
    newCaseNumber,
    setNewCaseNumber,
    caseNumberLabel,
    caseNumberOptional = true,
    showCourtField = false,
    courtName = '',
    setCourtName,
    courtFieldRequired = false,
}: AppealTransitionModalFilingFieldsProps) {
    return (
        <div className="space-y-3 min-h-[11.5rem]">
            <div>
                <label className={s.label}>تاريخ لائحة الطعن</label>
                <input
                    type="date"
                    value={filingDate}
                    onChange={(e) => setFilingDate(e.target.value)}
                    className={s.field}
                />
            </div>
            {showCourtField ? (
                <div>
                    <label className={s.label} htmlFor="appeal-transition-court">
                        المحكمة المختصة
                        {courtFieldRequired ? '' : ' (اختياري)'}
                    </label>
                    <input
                        id="appeal-transition-court"
                        type="text"
                        value={courtName}
                        onChange={(e) => setCourtName?.(e.target.value)}
                        placeholder="اسم محكمة الاستئناف"
                        className={s.field}
                        autoComplete="off"
                        data-testid="independent-challenge-court"
                        required={courtFieldRequired}
                        aria-required={courtFieldRequired || undefined}
                    />
                </div>
            ) : null}
            <div>
                <label className={s.label} htmlFor="appeal-transition-case-no">
                    {caseNumberLabel}
                    {caseNumberOptional ? ' (اختياري)' : ''}
                </label>
                <input
                    id="appeal-transition-case-no"
                    type="text"
                    value={newCaseNumber}
                    onChange={(e) => setNewCaseNumber(e.target.value)}
                    className={s.field}
                    dir="ltr"
                    autoComplete="off"
                    spellCheck={false}
                    data-testid="independent-challenge-case-no"
                    required={!caseNumberOptional}
                    aria-required={!caseNumberOptional || undefined}
                />
            </div>
        </div>
    );
}
