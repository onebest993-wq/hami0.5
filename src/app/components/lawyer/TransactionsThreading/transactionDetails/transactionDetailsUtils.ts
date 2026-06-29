import { TransactionStatus } from '@/app/modules/transactionsThreading/types';
import {
    TX_STATUS_ACTIVE,
    TX_STATUS_COMPLETED,
    TX_STATUS_PAUSED,
} from '../transactionsGlassTheme';

export function txStatusLabelAr(status: TransactionStatus) {
    if (status === TransactionStatus.Active) return 'نشطة';
    if (status === TransactionStatus.Paused) return 'في الانتظار';
    return 'مكتملة';
}

export function txStatusBadgeClass(status: TransactionStatus) {
    if (status === TransactionStatus.Active) return TX_STATUS_ACTIVE;
    if (status === TransactionStatus.Paused) return TX_STATUS_PAUSED;
    return TX_STATUS_COMPLETED;
}
