import { describe, expect, it } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import {
    buildPublicationNoticePatchForDebtorKey,
    getPublicationNoticeForDebtorKey,
    publicationNoticeDeadlineYmd,
    PUBLICATION_NOTICE_DURATION_DAYS,
} from '@/app/utils/publicationNoticeDebtor';

describe('publicationNoticeDebtor', () => {
    it('publicationNoticeDeadlineYmd adds 15 calendar days (first counted day is day after publish)', () => {
        expect(PUBLICATION_NOTICE_DURATION_DAYS).toBe(15);
        expect(publicationNoticeDeadlineYmd('2026-01-01')).toBe('2026-01-16');
    });

    it('buildPublicationNoticePatchForDebtorKey merges and removes per debtor key', () => {
        const base = {
            id: 'x',
            publication_notice_by_debtor: {
                a: {
                    publicationDateYmd: '2026-02-01',
                    newspaper1: 'A',
                    newspaper2: 'B',
                },
            },
        } as unknown as ExecutionFile;
        const add = buildPublicationNoticePatchForDebtorKey(base, 'b', {
            publicationDateYmd: '2026-03-01',
            newspaper1: 'C',
            newspaper2: 'D',
        });
        expect(Object.keys(add.publication_notice_by_debtor).sort()).toEqual(['a', 'b']);
        const rm = buildPublicationNoticePatchForDebtorKey(
            { ...base, ...add } as ExecutionFile,
            'a',
            null
        );
        expect(Object.keys(rm.publication_notice_by_debtor)).toEqual(['b']);
    });

    it('getPublicationNoticeForDebtorKey rejects malformed stored rows', () => {
        const file = {
            id: 'y',
            publication_notice_by_debtor: {
                ok: {
                    publicationDateYmd: '2026-01-10',
                    newspaper1: 'جريدة ١',
                    newspaper2: 'جريدة ٢',
                },
                badDate: {
                    publicationDateYmd: 'not-a-date',
                    newspaper1: 'A',
                    newspaper2: 'B',
                },
                missingPaper: {
                    publicationDateYmd: '2026-01-10',
                    newspaper1: '',
                    newspaper2: 'B',
                },
            },
        } as unknown as ExecutionFile;
        expect(getPublicationNoticeForDebtorKey(file, 'ok')).not.toBeNull();
        expect(getPublicationNoticeForDebtorKey(file, 'badDate')).toBeNull();
        expect(getPublicationNoticeForDebtorKey(file, 'missingPaper')).toBeNull();
    });
});
