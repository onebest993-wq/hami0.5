import React from 'react';
import { formatJudicialLedgerDate } from '../judicialDecisionsEngine';

/** تاريخ ISO ثابت LTR في ترويسات المودالات (YYYY-MM-DD). */
export const ModalIsoDate = ({ value, className = '' }: { value: string | undefined; className?: string }) => (
    <span dir="ltr" className={`inline-block unicode-bidi-plaintext tabular-nums ${className}`.trim()}>
        {formatJudicialLedgerDate(value)}
    </span>
);
