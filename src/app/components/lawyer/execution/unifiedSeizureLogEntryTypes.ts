/**
 * Types-only module for unified seizure log entries.
 * Utils / builders must import from here — never from UnifiedSeizureLogModal —
 * to avoid a component ↔ utils type cycle.
 */

export type UnifiedSeizureLogEntryKind =
    | 'property'
    | 'salary'
    | 'movable'
    | 'third_party'
    | 'marks';

export type UnifiedSeizureLogEntry = {
    id: string;
    kind: UnifiedSeizureLogEntryKind;
    dateYmd: string;
    title: string;
    statusLabel: string;
    statusCode: string;
    description: string;
    entityId?: string;
};
