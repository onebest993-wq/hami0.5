import React from 'react';
import type { AppealDeadlineWindows } from '../utils';
import {
    formatAppealClockYmdLabel,
    resolveAppealLastDeadlineYmd,
} from '../utils';

type AppealSelectedDeadlineHintProps = {
    kind: 'tadhallum' | 'tamyeez';
    decisionYmd: string;
    windows: AppealDeadlineWindows;
    /** بجانب سطر الطاعن في صف واحد */
    inline?: boolean;
};

/** آخر موعد لنوع الطعن المختار — يتفاعل مع تظلم/تمييز */
export function AppealSelectedDeadlineHint({
    kind,
    decisionYmd,
    windows,
    inline = false,
}: AppealSelectedDeadlineHintProps) {
    const endYmd = resolveAppealLastDeadlineYmd(
        kind,
        decisionYmd,
        windows.cassationClockYmd || decisionYmd,
    );
    const label = kind === 'tadhallum' ? 'التظلم' : 'التمييز';
    const className = inline
        ? 'text-[10px] leading-relaxed text-amber-200/90 text-right whitespace-nowrap'
        : 'text-[10px] leading-relaxed text-amber-200/90 text-right';

    const Tag = inline ? 'span' : 'p';

    return (
        <Tag className={className}>
            آخر موعد ل{label}: {formatAppealClockYmdLabel(endYmd)}
        </Tag>
    );
}
