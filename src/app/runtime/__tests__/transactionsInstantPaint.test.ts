import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    clearTransactionsEnterSettle,
    paintTransactionsInstantChrome,
    queryLiveTransactionsHub,
    removeTransactionsInstantChrome,
} from '@/app/runtime/transactionsInstantPaint';
import { TRANSACTIONS_INSTANT_CHROME_ID } from '@/app/services/transactions/transactionsShellSnap';

function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => resolve());
    });
}

describe('transactionsInstantPaint', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-transactions-open');
        document.documentElement.removeAttribute('data-hami-tx-enter');
        document.body.replaceChildren();
        document.getElementById('hami-overlay-portal')?.remove();
    });

    afterEach(() => {
        clearTransactionsEnterSettle();
        removeTransactionsInstantChrome();
        document.getElementById('hami-overlay-portal')?.remove();
    });

    it('يطلي قشرة المعاملات فوراً عندما الطبقة مخفية أو غير موجودة', () => {
        expect(paintTransactionsInstantChrome()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-transactions-open')).toBe('1');
        expect(document.documentElement.getAttribute('data-hami-tx-enter')).toBe('1');
        const chrome = document.getElementById(TRANSACTIONS_INSTANT_CHROME_ID);
        expect(chrome).not.toBeNull();
        expect(chrome?.className).toContain('hami-tx-overlay-layer');
        expect(chrome?.textContent).toContain('إدارة المعاملات');
        expect(queryLiveTransactionsHub()).toBeNull();
    });

    it('لا يبقي الجسر إذا كانت الطبقة ظاهرة', async () => {
        const hub = document.createElement('div');
        hub.dataset.testid = 'transactions-hub';
        document.body.appendChild(hub);
        expect(paintTransactionsInstantChrome()).toBe(true);
        expect(document.getElementById(TRANSACTIONS_INSTANT_CHROME_ID)).toBeNull();
        expect(document.documentElement.getAttribute('data-hami-tx-enter')).toBe('1');
        expect(queryLiveTransactionsHub()).toBe(hub);
        await nextFrame();
        await nextFrame();
        expect(document.documentElement.hasAttribute('data-hami-tx-enter')).toBe(false);
    });

    it('لا يطلي الجسر إذا كانت الطبقة موجودة ولو مخفية', () => {
        const hub = document.createElement('div');
        hub.dataset.testid = 'transactions-hub';
        hub.className = 'hidden';
        document.body.appendChild(hub);
        expect(paintTransactionsInstantChrome()).toBe(true);
        expect(document.getElementById(TRANSACTIONS_INSTANT_CHROME_ID)).toBeNull();
        expect(queryLiveTransactionsHub()).toBeNull();
        expect(document.documentElement.getAttribute('data-hami-tx-enter')).toBe('1');
    });
});
