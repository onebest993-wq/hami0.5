import { useEffect, useState } from 'react';
import {
    isTransactionsThreadingDiskUnread,
    subscribeTransactionsThreadingDiskReady,
} from '@/app/services/transactions/transactionsDiskWarm';

/** false بينما المفتاح مشفَّر لم يُفك — لا تُعرض «قائمة فارغة» كاذبة. */
export function useTransactionsThreadingDiskSettled(userId: string | null | undefined): boolean {
    const [settled, setSettled] = useState(() => !isTransactionsThreadingDiskUnread(userId));

    useEffect(() => {
        if (!isTransactionsThreadingDiskUnread(userId)) {
            setSettled(true);
            return;
        }
        setSettled(false);
        return subscribeTransactionsThreadingDiskReady(() => {
            setSettled(true);
        });
    }, [userId]);

    return settled;
}
