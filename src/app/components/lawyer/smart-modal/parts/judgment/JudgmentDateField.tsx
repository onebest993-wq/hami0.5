import React from 'react';
import { isSulhJudgmentType } from '../../smartFile/judgmentTypes';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import { Info } from '@/app/components/ui/icons/Info';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';

export function JudgmentDateField({
    styles: s,
    judgmentDate,
    onChange,
    judgmentType,
}: {
    styles: JudgmentModalStyles;
    judgmentDate: string;
    onChange: (date: string) => void;
    judgmentType: string;
}) {
    return (
        <>
            <div className={s.section}>
                <label className={s.label}>تاريخ الحكم</label>
                <input
                    type="date"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentDate}
                    value={judgmentDate}
                    onChange={(e) => onChange(e.target.value)}
                    className={s.field}
                />
            </div>

            {isSulhJudgmentType(judgmentType) && (
                <div className={`${s.hint} text-emerald-300/90 border-emerald-500/15 bg-emerald-500/[0.04]`}>
                    <Info size={14} className="shrink-0 mt-0.5 text-emerald-400/80" />
                    <span>يعتبر الصلح بمثابة حكم مكتسب الدرجة القطعية.</span>
                </div>
            )}
        </>
    );
}
