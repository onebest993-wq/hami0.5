import React from 'react';
import type { JudgmentModalStyles } from '../../smartFile/smartModalChrome';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import { issuedJudgmentPresenceForm } from '@/app/domain/lawsuit/partyJudgmentDisposition';

export function JudgmentFormToggle({
    styles: s,
    judgmentForm,
    onChange,
}: {
    styles: JudgmentModalStyles;
    judgmentForm: string;
    onChange: (form: string) => void;
}) {
    const issued = issuedJudgmentPresenceForm(judgmentForm);
    const present = issued !== 'غيابي';
    return (
        <div className={s.section}>
            <label className={s.label}>شكل الحكم</label>
            <div className="flex flex-wrap gap-2 w-full">
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentFormHadari}
                    aria-pressed={present}
                    onClick={() => onChange('حضوري')}
                    className={`${s.toggle} ${
                        present ? s.toggleActive : s.toggleIdle
                    }`}
                >
                    حكم حضوري
                </button>
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentFormGhiabi}
                    aria-pressed={issued === 'غيابي'}
                    onClick={() => onChange('غيابي')}
                    className={`${s.toggle} ${
                        issued === 'غيابي' ? s.toggleActive : s.toggleIdle
                    }`}
                >
                    حكم غيابي
                </button>
            </div>
        </div>
    );
}
