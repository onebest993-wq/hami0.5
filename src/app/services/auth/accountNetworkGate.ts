import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { ACCOUNT_FROZEN_CODE, ACCOUNT_LOCKED_CODE } from '@/app/api/security/accountRestrictionCopy';

export type AccountNetworkGate = {
    frozen: boolean;
    forumBanned: boolean;
    freezeUntil: string | null;
    code: string | null;
    message: string | null;
};

const OPEN_GATE: AccountNetworkGate = {
    frozen: false,
    forumBanned: false,
    freezeUntil: null,
    code: null,
    message: null,
};

const CHANGE_EVENT = 'hami:account-network-gate-changed';

let cached: { userId: string; at: number; gate: AccountNetworkGate } | null = null;
const GATE_TTL_MS = 8_000;

function emitAccountNetworkGateChange(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function peekAccountNetworkGate(userId?: string | null): AccountNetworkGate | null {
    const id = userId?.trim();
    if (!cached) return null;
    if (id && cached.userId !== id) return null;
    return cached.gate;
}

export function subscribeAccountNetworkGate(onChange: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

export function invalidateAccountNetworkGateCache(): void {
    cached = null;
}

export async function fetchAccountNetworkGate(userId: string): Promise<AccountNetworkGate> {
    const id = userId.trim();
    if (!id) return OPEN_GATE;
    const now = Date.now();
    if (cached && cached.userId === id && now - cached.at < GATE_TTL_MS) {
        return cached.gate;
    }
    const data = await SecureAPIClient.fetchSecure<{
        ok?: boolean;
        frozen?: boolean;
        forumBanned?: boolean;
        freezeUntil?: string | null;
        code?: string | null;
        message?: string | null;
        loginAllowed?: boolean;
    }>('/api/auth/account-gate', { method: 'GET' });
    const gate: AccountNetworkGate = {
        frozen: data?.frozen === true || data?.code === ACCOUNT_LOCKED_CODE || data?.loginAllowed === false,
        forumBanned: data?.forumBanned === true,
        freezeUntil: typeof data?.freezeUntil === 'string' ? data.freezeUntil : null,
        code: typeof data?.code === 'string' ? data.code : data?.frozen ? ACCOUNT_FROZEN_CODE : null,
        message: typeof data?.message === 'string' ? data.message : null,
    };
    cached = { userId: id, at: now, gate };
    emitAccountNetworkGateChange();
    return gate;
}
