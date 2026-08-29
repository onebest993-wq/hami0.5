/** Shared persist-migrate record helpers */
export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord {
    return value as UnknownRecord;
}

export function nestedRecord(parent: UnknownRecord, key: string): UnknownRecord | undefined {
    const v = parent[key];
    return v && typeof v === 'object' ? (v as UnknownRecord) : undefined;
}
