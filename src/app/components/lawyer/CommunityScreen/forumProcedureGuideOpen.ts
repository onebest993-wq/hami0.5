import {
    parseProcedureGuideDataLine,
    requestOpenTransactionsHub,
} from '@/app/services/transactions/procedureGuideNavigation';

export function openForumProcedureGuideHub(postContent: string): void {
    const guide = parseProcedureGuideDataLine(postContent);
    requestOpenTransactionsHub({
        openAddSheet: true,
        guide,
    });
}
