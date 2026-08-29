import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    beginTransactionsShellExit,
    clearTransactionsShellClosing,
    TRANSACTIONS_LAYER_EXIT_MS,
    TRANSACTIONS_LAYER_EXIT_PAD_MS,
} from '@/app/hooks/lawyerDashboard/transactions/transactionsShellExit';
import { TRANSACTIONS_INSTANT_CHROME_ID } from '@/app/services/transactions/transactionsShellSnap';

describe('transactionsShellExit', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-hami-transactions-open');
        document.documentElement.removeAttribute('data-hami-transactions-closing');
        document.documentElement.removeAttribute('data-hami-tx-enter');
        delete document.documentElement.dataset.hamiReduceMotion;
        vi.useFakeTimers();
    });

    afterEach(() => {
        clearTransactionsShellClosing();
        vi.useRealTimers();
    });

    it('مع تقليل الحركة يُغلق فوراً', () => {
        document.documentElement.dataset.hamiReduceMotion = '1';
        const onDone = vi.fn();
        beginTransactionsShellExit(onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(document.documentElement.hasAttribute('data-hami-transactions-closing')).toBe(false);
    });

    it('بدون طبقة يغلق فوراً', () => {
        const onDone = vi.fn();
        beginTransactionsShellExit(onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('يتلاشى ثم ينهي بعد المهلة', () => {
        document.documentElement.setAttribute('data-hami-transactions-open', '1');
        const layer = document.createElement('div');
        layer.className = 'hami-tx-overlay-layer';
        layer.setAttribute('data-testid', 'transactions-hub');
        document.body.appendChild(layer);

        const onDone = vi.fn();
        beginTransactionsShellExit(onDone);
        expect(onDone).not.toHaveBeenCalled();
        expect(document.documentElement.getAttribute('data-hami-transactions-closing')).toBe('1');
        expect(document.documentElement.hasAttribute('data-hami-transactions-open')).toBe(false);

        vi.advanceTimersByTime(TRANSACTIONS_LAYER_EXIT_MS + TRANSACTIONS_LAYER_EXIT_PAD_MS);
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(document.documentElement.hasAttribute('data-hami-transactions-closing')).toBe(false);
    });

    it('clear يلغي الخروج المعلق', () => {
        document.documentElement.setAttribute('data-hami-transactions-open', '1');
        const layer = document.createElement('div');
        layer.className = 'hami-tx-overlay-layer';
        layer.setAttribute('data-testid', 'transactions-hub');
        document.body.appendChild(layer);

        const onDone = vi.fn();
        beginTransactionsShellExit(onDone);
        clearTransactionsShellClosing();
        vi.advanceTimersByTime(TRANSACTIONS_LAYER_EXIT_MS + TRANSACTIONS_LAYER_EXIT_PAD_MS);
        expect(onDone).not.toHaveBeenCalled();
    });

    it('يزيل قشرة الطلاء إن وُجد المركز الحي', () => {
        document.documentElement.setAttribute('data-hami-transactions-open', '1');
        const chrome = document.createElement('div');
        chrome.id = TRANSACTIONS_INSTANT_CHROME_ID;
        chrome.className = 'hami-tx-overlay-layer';
        document.body.appendChild(chrome);
        const hub = document.createElement('div');
        hub.className = 'hami-tx-overlay-layer';
        hub.setAttribute('data-testid', 'transactions-hub');
        document.body.appendChild(hub);

        beginTransactionsShellExit(() => undefined);
        expect(document.getElementById(TRANSACTIONS_INSTANT_CHROME_ID)).toBeNull();
        expect(document.querySelector('[data-testid="transactions-hub"]')).toBe(hub);
        vi.advanceTimersByTime(TRANSACTIONS_LAYER_EXIT_MS + TRANSACTIONS_LAYER_EXIT_PAD_MS);
    });
});
