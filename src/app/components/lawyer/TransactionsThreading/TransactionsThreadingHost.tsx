import React from 'react';
import { TransactionsThreadingSystem } from '@/app/components/lawyer/TransactionsThreading/TransactionsThreadingSystem';
import type { TransactionsThreadingSystemProps } from '@/app/runtime/transactionsHubLoader.types';

/**
 * مركز المعاملات — استيراد ثابت. الطبقة المغلقة = لا شجرة.
 */
export function TransactionsThreadingHost(
    props: TransactionsThreadingSystemProps,
): React.ReactElement | null {
    const { open = true } = props;
    if (!open) return null;
    return <TransactionsThreadingSystem {...props} />;
}
