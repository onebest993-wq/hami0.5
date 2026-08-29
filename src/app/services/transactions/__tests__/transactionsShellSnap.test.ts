import { describe, expect, it, beforeEach } from 'vitest';
import {
    isTransactionsShellSnappedOpen,
    snapTransactionsShellClose,
    snapTransactionsShellOpen,
} from '@/app/services/transactions/transactionsShellSnap';

describe('transactionsShellSnap', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-transactions-open');
        document.body.replaceChildren();
    });

    it('يضع العلم حتى بلا Hub في DOM', () => {
        expect(snapTransactionsShellOpen()).toBe(false);
        expect(isTransactionsShellSnappedOpen()).toBe(true);
    });

    it('يعيد true عند وجود سطح المعاملات', () => {
        const hub = document.createElement('div');
        hub.dataset.testid = 'transactions-hub';
        document.body.appendChild(hub);
        expect(snapTransactionsShellOpen()).toBe(true);
        snapTransactionsShellClose();
        expect(isTransactionsShellSnappedOpen()).toBe(false);
        expect(document.getElementById('hami-transactions-instant-chrome')).toBeNull();
    });
});
