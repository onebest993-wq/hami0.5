import { memo } from 'react';
import { Tabs, TabsContent } from '@/app/components/ui/tabs';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import { TaskThreadView } from './TaskThreadView';
import { AddTaskBottomSheet } from './AddTaskBottomSheet';
import { DocumentsTabView } from './DocumentsTabView';
import { ShareProcedureModal } from './ShareProcedureModal';
import {
    TX_PAGE_SCROLL,
    TX_TEXT_MUTED,
    TxGlassFab,
    TxGlassPage,
    TxGlassPanel,
} from './transactionsGlassTheme';
import type { TransactionsDetailsEscapeSnapshot } from './transactionsEscapeStack';
import { TransactionDetailsDialogs } from './transactionDetails/TransactionDetailsDialogs';
import { TransactionDetailsHeader } from './transactionDetails/TransactionDetailsHeader';
import { useTransactionDetailsController } from './transactionDetails/useTransactionDetailsController';

export const TransactionDetailsScreen = memo(function TransactionDetailsScreen({
    transactionId,
    onBack,
    onEscapeSnapshotChange,
    registerEscapeCloser,
    hubOpen = true,
    detailsActive = true,
}: {
    transactionId: string;
    onBack?: () => void;
    onEscapeSnapshotChange?: (snapshot: TransactionsDetailsEscapeSnapshot) => void;
    registerEscapeCloser?: (
        closer: ((patch: Partial<TransactionsDetailsEscapeSnapshot>) => void) | null,
    ) => void;
    hubOpen?: boolean;
    detailsActive?: boolean;
}) {
    const overlaysLive = hubOpen && detailsActive;
    const vm = useTransactionDetailsController({
        transactionId,
        onEscapeSnapshotChange,
        registerEscapeCloser,
        detailsActive,
    });

    if (!vm.tx) {
        return (
            <div data-testid="transactions-details-screen" className="h-full min-h-0">
                <TxGlassPage>
                    <div className="flex items-center justify-center min-h-[60dvh] px-6">
                        <TxGlassPanel className="px-5 py-5 text-center">
                            <p className={`${TX_TEXT_MUTED} text-sm font-medium`}>تعذر العثور على المعاملة</p>
                        </TxGlassPanel>
                    </div>
                </TxGlassPage>
            </div>
        );
    }

    return (
        <div data-testid="transactions-details-screen" className="h-full min-h-0">
            <TxGlassPage>
                <Tabs dir="rtl" value={vm.tab} onValueChange={(v) => vm.setTab(v as 'path' | 'docs')} className="flex min-h-0 w-full flex-1 flex-col gap-0">
                    <TransactionDetailsHeader
                        tx={vm.tx}
                        isReadOnly={vm.isReadOnly}
                        onBack={onBack}
                        taskCount={vm.tasks.length}
                        onReopen={() => void vm.reopenTransaction()}
                        onRequestComplete={() => vm.setCompleteOpen(true)}
                        onBeginSaveTemplate={vm.beginSaveTemplate}
                        onOpenImportTemplates={() => vm.setTemplatesOpen(true)}
                        onShareProcedure={vm.openShareFromTransaction}
                        onOpenReport={() => vm.setReportOpen(true)}
                    />

                    <div
                        data-testid="transactions-details-scroll"
                        className={`${TX_PAGE_SCROLL} max-w-[520px] mx-auto px-4 sm:px-5 pb-24 w-full`}
                    >
                        <TabsContent value="path" className="mt-0 focus-visible:outline-none w-full">
                            <TaskThreadView
                                transactionId={transactionId}
                                onRequestAddTask={vm.requestAddTask}
                                onImportFromMyTemplates={() => vm.setTemplatesOpen(true)}
                                readOnly={vm.isReadOnly}
                                onTaskEscapeSnapshotChange={vm.onTaskEscapeSnapshotChange}
                                registerTaskEscapeCloser={vm.registerTaskEscapeCloser}
                                detailsActive={detailsActive}
                            />
                        </TabsContent>
                        <TabsContent value="docs" className="mt-0 focus-visible:outline-none">
                            <DocumentsTabView
                                transaction={vm.tx as Transaction}
                                readOnly={vm.isReadOnly}
                                detailsActive={detailsActive}
                                onDocumentsEscapeSnapshotChange={vm.onDocumentsEscapeSnapshotChange}
                                registerDocumentsEscapeCloser={vm.registerDocumentsEscapeCloser}
                            />
                        </TabsContent>
                    </div>
                </Tabs>

                {vm.tab === 'path' && !vm.isReadOnly && (
                    <TxGlassFab label="إضافة مهمة" extended onClick={() => vm.requestAddTask(null)} />
                )}

                {vm.sheetOpen && overlaysLive ? (
                    <AddTaskBottomSheet
                        open
                        onOpenChange={(open) => {
                            vm.setSheetOpen(open);
                            if (!open) vm.setParent(null);
                        }}
                        transactionId={transactionId}
                        parentTask={vm.parentHint}
                        readOnly={vm.isReadOnly}
                    />
                ) : null}

                {(overlaysLive &&
                    (vm.completeOpen || vm.saveTemplateOpen || vm.templatesOpen || vm.reportOpen)) ? (
                    <TransactionDetailsDialogs
                        completeOpen={vm.completeOpen}
                        onCompleteOpenChange={vm.setCompleteOpen}
                        onCompleteTransaction={vm.completeTransaction}
                        saveTemplateOpen={vm.saveTemplateOpen}
                        onSaveTemplateOpenChange={vm.setSaveTemplateOpen}
                        canSaveTemplate={vm.canSaveTemplate}
                        templateName={vm.templateName}
                        onTemplateNameChange={vm.setTemplateName}
                        onSaveTemplate={vm.doSaveTemplate}
                        templatesOpen={vm.templatesOpen}
                        onTemplatesOpenChange={vm.setTemplatesOpen}
                        templates={vm.templates}
                        isReadOnly={vm.isReadOnly}
                        existingTaskCount={vm.tasks.length}
                        userId={vm.userId}
                        onImportTemplate={vm.importTemplate}
                        onDeleteTemplate={vm.deleteTemplate}
                        reportOpen={vm.reportOpen}
                        onReportOpenChange={vm.setReportOpen}
                        reportText={vm.reportText}
                        copied={vm.copied}
                        onCopyReport={vm.copyReport}
                    />
                ) : null}

                {vm.shareOpen && overlaysLive ? (
                    <ShareProcedureModal
                        open
                        onOpenChange={(open) => {
                            vm.setShareOpen(open);
                            if (!open) {
                                vm.setShareDraft(null);
                                vm.setShareClientName(null);
                            }
                        }}
                        draft={vm.shareDraft}
                        clientNameForScrub={vm.shareClientName}
                    />
                ) : null}
            </TxGlassPage>
        </div>
    );
});
