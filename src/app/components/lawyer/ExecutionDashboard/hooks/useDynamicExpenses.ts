import { useState, useRef, useEffect } from 'react';
import SecureStoreService from '@/app/services/SecureStoreService';
import { executionExpensesStorageKey, executionExpensesChangedEventName } from '@/app/utils/executionStorageKeys';

function sumDynamicExpensesFromRaw(raw: string | null): number {
    if (!raw) return 0;
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return 0;
        return parsed.reduce((t: number, row: unknown) => {
            if (!row || typeof row !== 'object') return t;
            const amount = (row as { amount?: unknown }).amount;
            const numeric = typeof amount === 'number' ? amount : Number(amount);
            return Number.isFinite(numeric) ? t + numeric : t;
        }, 0);
    } catch {
        return 0;
    }
}

export function useDynamicExpenses(): number {
    const [dynamicExpenses, setDynamicExpenses] = useState<number>(() => {
        return sumDynamicExpensesFromRaw(
            SecureStoreService.getItemSync(executionExpensesStorageKey())
        );
    });

    const dynamicExpensesRef = useRef(dynamicExpenses);
    dynamicExpensesRef.current = dynamicExpenses;

    useEffect(() => {
        const reload = () => {
            const saved = SecureStoreService.getItemSync(executionExpensesStorageKey());
            const sum = sumDynamicExpensesFromRaw(saved);
            if (sum !== dynamicExpensesRef.current) setDynamicExpenses(sum);
        };

        const onStorage = (e: StorageEvent) => {
            if (e.key === executionExpensesStorageKey()) reload();
        };
        const onCustom = () => reload();

        window.addEventListener('storage', onStorage);
        window.addEventListener(executionExpensesChangedEventName(), onCustom);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(executionExpensesChangedEventName(), onCustom);
        };
    }, []);

    return dynamicExpenses;
}
