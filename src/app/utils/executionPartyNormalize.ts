import type { Party } from '@/app/types/execution';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** اسم العرض المخزّن — يدعم fullName و name والنص المباشر */
export function resolvePartyStoredName(party: unknown): string {
    if (!party) return '';
    if (typeof party === 'string') return party.trim();
    if (!isRecord(party)) return '';
    const name = party.fullName ?? party.name ?? party.label;
    return typeof name === 'string' ? name.trim() : '';
}

export function normalizeExecutionParty(
    raw: unknown,
    fallbackId: number,
    fallbackRole: string,
): Party {
    if (isRecord(raw)) {
        const name = resolvePartyStoredName(raw);
        const role = typeof raw.role === 'string' ? raw.role : fallbackRole;
        const isClient = typeof raw.isClient === 'boolean' ? raw.isClient : false;
        const phone = typeof raw.phone === 'string' ? raw.phone : '';
        const address = typeof raw.address === 'string' ? raw.address : '';
        const pid =
            typeof raw.id === 'number' || typeof raw.id === 'string' ? raw.id : fallbackId;
        return {
            ...(raw as unknown as Party),
            id: pid,
            name,
            fullName: name || undefined,
            role,
            isClient,
            phone,
            address,
            occupation: (raw.occupation as Party['occupation']) ?? ('' as Party['occupation']),
            nationality: typeof raw.nationality === 'string' ? raw.nationality : '',
        };
    }
    return {
        id: fallbackId,
        name: '',
        role: fallbackRole,
        isClient: false,
        phone: '',
        address: '',
        occupation: '' as Party['occupation'],
        nationality: '',
    };
}

export function normalizeExecutionPartyList(raw: unknown, fallbackRole: string): Party[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((p, i) => normalizeExecutionParty(p, i + 1, fallbackRole))
        .filter((p) => p.name.length > 0);
}
