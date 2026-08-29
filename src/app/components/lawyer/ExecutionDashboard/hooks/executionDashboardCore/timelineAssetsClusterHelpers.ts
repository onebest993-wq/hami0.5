import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';

export type CaseNotesLog = NonNullable<ExecutionFile['caseNotesLog']>;
export type CaseTasksPending = NonNullable<ExecutionFile['caseTasksPending']>;

export type CoercionBridge = {
    setActiveNoticeState: Dispatch<SetStateAction<ExecutionFile['activeNoticeState']>>;
};

/** بيانات قديمة/فاسدة قد تخزّن الحقول كمصفوفة غير صحيحة — `|| []` / `?? []` لا يكفيان */
export function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

export function asCaseNotesLog(value: unknown): CaseNotesLog {
    return asArray(value);
}

export function asCaseTasksPending(value: unknown): CaseTasksPending {
    return asArray(value);
}

export function asRecord<T extends Record<string, unknown>>(value: unknown): T {
    return value != null && typeof value === 'object' && !Array.isArray(value)
        ? (value as T)
        : ({} as T);
}

/** يطبّع prev قبل أي updater وظيفي حتى لا ينهار spread/filter على كائن فاسد */
export function makeArrayStateSetter<T>(
    setRaw: Dispatch<SetStateAction<T[]>>,
): Dispatch<SetStateAction<T[]>> {
    return (update) => {
        setRaw((prev) => {
            const base = asArray<T>(prev);
            return asArray<T>(typeof update === 'function' ? update(base) : update);
        });
    };
}
