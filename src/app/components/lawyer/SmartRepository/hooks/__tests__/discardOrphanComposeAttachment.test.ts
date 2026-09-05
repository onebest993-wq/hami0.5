import { describe, expect, it, vi } from 'vitest';
import { discardOrphanComposeAttachment } from '../discardOrphanComposeAttachment';

describe('discardOrphanComposeAttachment', () => {
    it('لا يفعل شيئاً بلا معرّف أو جلسة', async () => {
        const deleteDoc = vi.fn();
        const refreshDocs = vi.fn();
        await discardOrphanComposeAttachment({
            docId: undefined,
            uid: 'u1',
            deleteDoc,
            refreshDocs,
        });
        await discardOrphanComposeAttachment({
            docId: 'd1',
            uid: '  ',
            deleteDoc,
            refreshDocs,
        });
        expect(deleteDoc).not.toHaveBeenCalled();
        expect(refreshDocs).not.toHaveBeenCalled();
    });

    it('يحذف الوثيقة ثم يحدّث القائمة', async () => {
        const deleteDoc = vi.fn(async () => undefined);
        const refreshDocs = vi.fn(async () => undefined);
        await discardOrphanComposeAttachment({
            docId: 'd1',
            uid: 'u1',
            deleteDoc,
            refreshDocs,
        });
        expect(deleteDoc).toHaveBeenCalledWith('d1', 'u1');
        expect(refreshDocs).toHaveBeenCalledTimes(1);
    });
});
