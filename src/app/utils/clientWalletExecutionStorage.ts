import SecureStoreService from '@/app/services/SecureStoreService';

/**
 * محفظة الموكلي لكل إضبارة تنفيذ — مستقلة عن مصاريف الإضبارة في الوعاء الموحّد.
 */

export const CLIENT_WALLET_UPDATED_EVENT = 'hami-client-wallet-updated';

export type ClientWalletPaymentTarget = 'agreed_fees' | 'lawyer_out_of_pocket';

export type ClientWalletPayment = {
    id: string;
    amount: number;
    target: ClientWalletPaymentTarget;
    at: string;
};

export type ClientWalletStore = {
    /** ما دفعه المحامي من ماله لصالح القضية — لا يُدمَج مع مصاريف الإضبارة */
    lawyerOutOfPocket: number;
    payments: ClientWalletPayment[];
};

const emptyStore = (): ClientWalletStore => ({
    lawyerOutOfPocket: 0,
    payments: [],
});

export function clientWalletStorageKey(executionId: string): string {
    return `hami_exec_${executionId}_client_wallet`;
}

export function readClientWallet(executionId: string | undefined): ClientWalletStore {
    if (!executionId) return emptyStore();
    try {
        const raw = SecureStoreService.getItemSync(clientWalletStorageKey(executionId));
        if (!raw) return emptyStore();
        const p = JSON.parse(raw) as Partial<ClientWalletStore>;
        return {
            lawyerOutOfPocket:
                typeof p.lawyerOutOfPocket === 'number' && p.lawyerOutOfPocket >= 0
                    ? p.lawyerOutOfPocket
                    : 0,
            payments: Array.isArray(p.payments) ? p.payments : [],
        };
    } catch {
        return emptyStore();
    }
}

export function writeClientWallet(executionId: string | undefined, data: ClientWalletStore): void {
    if (!executionId) return;
    try {
        SecureStoreService.setItemSync(clientWalletStorageKey(executionId), JSON.stringify(data));
        window.dispatchEvent(new CustomEvent(CLIENT_WALLET_UPDATED_EVENT));
    } catch {
        /* ignore */
    }
}

export function sumClientWalletPayments(store: ClientWalletStore): number {
    return store.payments.reduce((s, r) => s + (Number(r.amount) || 0), 0);
}

export function clientWalletTotalDue(agreedFees: number, store: ClientWalletStore): number {
    const fees = Math.max(0, agreedFees);
    const costs = Math.max(0, store.lawyerOutOfPocket);
    return fees + costs;
}
