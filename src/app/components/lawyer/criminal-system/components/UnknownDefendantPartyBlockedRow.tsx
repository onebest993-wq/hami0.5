import React from 'react';
import { UNKNOWN_DEFENDANT_ACTION_BLOCKED_MESSAGE } from '../criminalUnknownDefendant';

export type UnknownDefendantPartyBlockedRowProps = {
    fullName: string;
    className?: string;
    /** إن وُجدت تُستبدل رسالة «لا يمكن أخذ إجراء». */
    note?: string;
};

/** صف المتهم المجهول في بطاقة تحديد الطرف — ظاهر لكن غير قابل للإجراء. */
export const UnknownDefendantPartyBlockedRow = ({
    fullName,
    className = '',
    note,
}: UnknownDefendantPartyBlockedRowProps) => (
    <div
        className={`flex flex-col gap-1 rounded-lg border border-red-500/25 bg-red-950/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
        <span className="text-sm font-bold text-red-100/90 whitespace-normal break-words">
            {String(fullName ?? '').trim() || '—'}
        </span>
        <span className="text-[10px] font-black text-red-200/75 whitespace-normal break-words sm:shrink-0 sm:max-w-[52%] sm:text-end">
            {note ?? UNKNOWN_DEFENDANT_ACTION_BLOCKED_MESSAGE}
        </span>
    </div>
);
