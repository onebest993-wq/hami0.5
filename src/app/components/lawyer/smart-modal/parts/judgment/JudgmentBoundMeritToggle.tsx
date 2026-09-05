import React from 'react';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import type { BoundMeritExtent } from '@/app/domain/lawsuit/partyJudgmentDisposition';
import {
    BOUND_MERIT_FULL_LABEL,
    BOUND_MERIT_PARTIAL_LABEL,
} from '../../smartFile/judgmentOutcomeDisplay';

export function JudgmentBoundMeritToggle({
    styles: s,
    value,
    onChange,
}: {
    styles: JudgmentModalStyles;
    value: BoundMeritExtent;
    onChange: (next: BoundMeritExtent) => void;
}) {
    return (
        <div className={s.section} data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentBoundMerit}>
            <label className={s.label}>بحق الملزَمين — نطاق الإلزام</label>
            <div className="flex flex-wrap gap-2 w-full">
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentBoundMeritFull}
                    aria-pressed={value === 'full'}
                    onClick={() => onChange('full')}
                    className={`${s.toggle} ${value === 'full' ? s.toggleActive : s.toggleIdle}`}
                >
                    {BOUND_MERIT_FULL_LABEL}
                </button>
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentBoundMeritPartial}
                    aria-pressed={value === 'partial'}
                    onClick={() => onChange('partial')}
                    className={`${s.toggle} ${value === 'partial' ? s.toggleActive : s.toggleIdle}`}
                >
                    {BOUND_MERIT_PARTIAL_LABEL}
                </button>
            </div>
        </div>
    );
}
