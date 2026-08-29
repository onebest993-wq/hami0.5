import { describe, expect, it, vi } from 'vitest';

const requestOpenTransactionsHub = vi.fn();
const parseProcedureGuideDataLine = vi.fn((content: string) => ({ from: content }));

vi.mock('@/app/services/transactions/procedureGuideNavigation', () => ({
    parseProcedureGuideDataLine: (content: string) => parseProcedureGuideDataLine(content),
    requestOpenTransactionsHub: (...args: unknown[]) => requestOpenTransactionsHub(...args),
}));

describe('openForumProcedureGuideHub', () => {
    it('يفتح المعاملات مع دليل المنشور', async () => {
        const { openForumProcedureGuideHub } = await import('../forumProcedureGuideOpen');
        openForumProcedureGuideHub('hami-guide-data:{}');
        expect(parseProcedureGuideDataLine).toHaveBeenCalledWith('hami-guide-data:{}');
        expect(requestOpenTransactionsHub).toHaveBeenCalledWith({
            openAddSheet: true,
            guide: { from: 'hami-guide-data:{}' },
        });
    });
});
