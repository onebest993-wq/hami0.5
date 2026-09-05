import { lazy, memo, useEffect } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { TaskThreadView } from './TaskThreadView';
import {
    TX_PAGE_SCROLL,
    TX_TEXT_MUTED,
    TxGlassFab,
    TxGlassPage,
} from './transactionsGlassTheme';
import type { TransactionsDetailsEscapeSnapshot } from './transactionsEscapeStack';
import { TransactionDetailsHeader } from './transactionDetails/TransactionDetailsHeader';
import { useTransactionDetailsController } from './transactionDetails/useTransactionDetailsController';
import { TxLazyIsland } from './TransactionsChunkGuard';
import {
    prefetchAddTaskBottomSheet,
    prefetchDocumentsTabView,
    prefetchShareProcedureModal,
    prefetchTransactionDetailsDialogs,
    prefetchTransactionsPathOverlays,
    scheduleTransactionsIdle,
} from './transactionsFeatureLoader';

const DocumentsTabViewLazy = lazy(() =>
    import('./DocumentsTabView').then((mod) => ({ default: mod.DocumentsTabView })),
);
const AddTaskBottomSheetLazy = lazy(() =>
    import('./AddTaskBottomSheet').then((mod) => ({ default: mod.AddTaskBottomSheet })),
);
const TransactionDetailsDialogsLazy = lazy(() =>
    import('./transactionDetails/TransactionDetailsDialogs').then((mod) => ({
        default: mod.TransactionDetailsDialogs,
    })),
);
const ShareProcedureModalLazy = lazy(() =>
    import('./ShareProcedureModal').then((mod) => ({ default: mod.ShareProcedureModal })),
);

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

    useEffect(() => {
        return scheduleTransactionsIdle(() => {
            prefetchTransactionsPathOverlays();
        });
    }, []);

    if (!vm.tx) {
        return (
            <div data-testid="transactions-details-screen" className="h-full min-h-0">
                <TxGlassPage>
                    <div className="flex items-center justify-center min-h-[60dvh] px-6">
                        <p className={`${TX_TEXT_MUTED} text-sm font-medium`}>تعذر العثور على المعاملة</p>
                    </div>
                </TxGlassPage>
            </div>
        );
    }

    const failOverlay = (close: () => void) => () => {
        close();
        SmartToast.error('تعذر التحميل — حاول مرة أخرى');
    };

    return (
        <div data-testid="transactions-details-screen" className="h-full min-h-0">
            <TxGlassPage>
                <TransactionDetailsHeader
                    tx={vm.tx}
                    isReadOnly={vm.isReadOnly}
                    tab={vm.tab}
                    onTabChange={(next) => vm.setTab(next)}
                    onPrimeDocsTab={prefetchDocumentsTabView}
                    onPrimeShare={prefetchShareProcedureModal}
                    onPrimeDetailsDialogs={prefetchTransactionDetailsDialogs}
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
                    className={`${TX_PAGE_SCROLL} max-w-[520px] mx-auto px-4 pb-24 w-full`}
                >
                    {vm.tab === 'path' ? (
                        <TaskThreadView
                            transactionId={transactionId}
                            onRequestAddTask={vm.requestAddTask}
                            onImportFromMyTemplates={() => vm.setTemplatesOpen(true)}
                            readOnly={vm.isReadOnly}
                            onTaskEscapeSnapshotChange={vm.onTaskEscapeSnapshotChange}
                            registerTaskEscapeCloser={vm.registerTaskEscapeCloser}
                            detailsActive={detailsActive}
                        />
                    ) : (
                        <TxLazyIsland
                            onFailed={failOverlay(() => vm.setTab('path'))}
                        >
                            <DocumentsTabViewLazy
                                transaction={vm.tx}
                                readOnly={vm.isReadOnly}
                                detailsActive={detailsActive}
                                onDocumentsEscapeSnapshotChange={vm.onDocumentsEscapeSnapshotChange}
                                registerDocumentsEscapeCloser={vm.registerDocumentsEscapeCloser}
                            />
                        </TxLazyIsland>
                    )}
                </div>

                {vm.tab === 'path' && !vm.isReadOnly && (
                    <TxGlassFab
                        label="إضافة مهمة"
                        extended
                        onPointerDown={() => {
                            prefetchAddTaskBottomSheet();
                        }}
                        onClick={() => vm.requestAddTask(null)}
                    />
                )}

                {vm.sheetOpen && overlaysLive ? (
                    <TxLazyIsland
                        onFailed={failOverlay(() => {
                            vm.setSheetOpen(false);
                            vm.setParent(null);
                        })}
                    >
                        <AddTaskBottomSheetLazy
                            open
                            onOpenChange={(open) => {
                                vm.setSheetOpen(open);
                                if (!open) vm.setParent(null);
                            }}
                            transactionId={transactionId}
                            parentTask={vm.parentHint}
                            readOnly={vm.isReadOnly}
                        />
                    </TxLazyIsland>
                ) : null}

                {overlaysLive &&
                (vm.completeOpen || vm.saveTemplateOpen || vm.templatesOpen || vm.reportOpen) ? (
                    <TxLazyIsland
                        onFailed={failOverlay(() => {
                            vm.setCompleteOpen(false);
                            vm.setSaveTemplateOpen(false);
                            vm.setTemplatesOpen(false);
                            vm.setReportOpen(false);
                        })}
                    >
                        <TransactionDetailsDialogsLazy
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
                    </TxLazyIsland>
                ) : null}

                {vm.shareOpen && overlaysLive ? (
                    <TxLazyIsland
                        onFailed={failOverlay(() => {
                            vm.setShareOpen(false);
                            vm.setShareDraft(null);
                            vm.setShareClientName(null);
                        })}
                    >
                        <ShareProcedureModalLazy
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
                    </TxLazyIsland>
                ) : null}
            </TxGlassPage>
        </div>
    );
});
