import { describe, expect, it } from 'vitest';
import {
    clearTransactionsListQuerySession,
    readTransactionsListQuerySession,
    writeTransactionsListQuerySession,
} from '@/app/components/lawyer/TransactionsThreading/utils/transactionsListQuerySession';

describe('transactionsListQuerySession', () => {
    it('يحفظ البحث والفلتر ويمسحهما', () => {
        clearTransactionsListQuerySession();
        writeTransactionsListQuerySession({ query: 'سارة', filter: 'archived' });
        expect(readTransactionsListQuerySession()).toEqual({ query: 'سارة', filter: 'archived' });
        clearTransactionsListQuerySession();
        expect(readTransactionsListQuerySession()).toEqual({ query: '', filter: 'all' });
    });
});
