import type { Debtor, ExecutionFile } from '@/app/types/execution';

export type DebtorEntityKind = 'natural_person' | 'legal_entity';

export const DEBTOR_ENTITY_KIND_LABELS: Record<DebtorEntityKind, string> = {
    natural_person: 'طبيعي',
    legal_entity: 'معنوي',
};

export function normalizeDebtorEntityKind(raw: unknown): DebtorEntityKind {
    const v = String(raw ?? '').trim();
    if (
        v === 'legal_entity' ||
        v === 'legal' ||
        v === 'juridical' ||
        v === 'company' ||
        v === 'معنوي' ||
        v === 'شخص معنوي'
    ) {
        return 'legal_entity';
    }
    return 'natural_person';
}

export function isLegalEntityDebtorKind(kind: DebtorEntityKind | string | undefined | null): boolean {
    return normalizeDebtorEntityKind(kind) === 'legal_entity';
}

export function resolveDebtorEntityKind(args: {
    executionData?: ExecutionFile | Record<string, unknown> | null;
    debtor?: Debtor | Record<string, unknown> | null;
    debtorKey?: string;
}): DebtorEntityKind {
    const ed = args.executionData as Record<string, unknown> | null | undefined;
    const debtorKey = String(args.debtorKey || '').trim();
    const byDebtor = ed?.debtor_entity_kind_by_debtor as Record<string, string> | undefined;
    if (debtorKey && byDebtor && byDebtor[debtorKey]) {
        return normalizeDebtorEntityKind(byDebtor[debtorKey]);
    }

    const debtor = args.debtor as Record<string, unknown> | null | undefined;
    const fromDebtor =
        debtor?.entityKind ?? debtor?.entityType ?? (debtor as { entity_kind?: string })?.entity_kind;
    if (fromDebtor) return normalizeDebtorEntityKind(fromDebtor);

    if (ed?.debtor_entity_type) return normalizeDebtorEntityKind(ed.debtor_entity_type);
    if (ed?.debtor_entity_kind) return normalizeDebtorEntityKind(ed.debtor_entity_kind);

    return 'natural_person';
}

export function debtorEntityKindStorageValue(kind: DebtorEntityKind): string {
    return kind;
}

export function partyTypeForDebtorEntityKind(kind: DebtorEntityKind): 'individual' | 'company' {
    return kind === 'legal_entity' ? 'company' : 'individual';
}
