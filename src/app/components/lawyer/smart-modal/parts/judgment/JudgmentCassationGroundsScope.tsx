import React from 'react';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import type { CassationGroundsScope } from '@/app/domain/lawsuit/cassationArt210';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';

export function JudgmentCassationGroundsScope({
    styles: s,
    value,
    onChange,
}: {
    styles: JudgmentModalStyles;
    value: CassationGroundsScope;
    onChange: (value: CassationGroundsScope) => void;
}) {
    return (
        <div className={s.section}>
            <label className={s.label}>نطاق أسباب النقض (م/210)</label>
            <div className="flex gap-2 w-full">
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentCassationGroundsCommon}
                    aria-pressed={value === 'COMMON'}
                    onClick={() => onChange('COMMON')}
                    className={`${s.toggle} ${value === 'COMMON' ? s.toggleActive : s.toggleIdle}`}
                >
                    أسباب مشتركة
                </button>
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentCassationGroundsPersonal}
                    aria-pressed={value === 'PERSONAL'}
                    onClick={() => onChange('PERSONAL')}
                    className={`${s.toggle} ${value === 'PERSONAL' ? s.toggleActive : s.toggleIdle}`}
                >
                    أسباب شخصية
                </button>
            </div>
        </div>
    );
}
