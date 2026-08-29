import React from 'react';
import { CalendarDays } from '@/app/components/ui/icons/CalendarDays';
import { Hash } from '@/app/components/ui/icons/Hash';
import type { JudgmentModalStyles } from './smartFile/smartModalChrome';

export type AppealTransitionModalFilingFieldsProps = {
    s: JudgmentModalStyles;
    filingDate: string;
    setFilingDate: (value: string) => void;
    newCaseNumber: string;
    setNewCaseNumber: (value: string) => void;
    caseNumberLabel: string;
    caseNumberOptional?: boolean;
    caseNumberHint?: string;
};

export function AppealTransitionModalFilingFields({
    s,
    filingDate,
    setFilingDate,
    newCaseNumber,
    setNewCaseNumber,
    caseNumberLabel,
    caseNumberOptional = true,
    caseNumberHint,
}: AppealTransitionModalFilingFieldsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label className={s.label}>
                    <CalendarDays size={12} className={s.labelIcon} />
                    تاريخ لائحة الطعن
                </label>
                <input
                    type="date"
                    value={filingDate}
                    onChange={(e) => setFilingDate(e.target.value)}
                    className={s.field}
                />
            </div>
            <div>
                <label className={s.label}>
                    <Hash size={12} className={s.labelIcon} />
                    {caseNumberLabel}
                    {caseNumberOptional ? ' (اختياري)' : ''}
                </label>
                <input
                    type="text"
                    value={newCaseNumber}
                    onChange={(e) => setNewCaseNumber(e.target.value)}
                    placeholder={
                        caseNumberOptional
                            ? 'اتركه فارغاً إذا لم يتوفر بعد'
                            : 'يُشتق من رقم الدعوى الأصلية'
                    }
                    className={s.field}
                    autoComplete="off"
                    spellCheck={false}
                />
                {caseNumberHint ? (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">{caseNumberHint}</p>
                ) : null}
            </div>
        </div>
    );
}
