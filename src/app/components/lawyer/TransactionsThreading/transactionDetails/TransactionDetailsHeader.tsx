import { BookOpen } from '@/app/components/ui/icons/BookOpen';
import { MoreVertical } from '@/app/components/ui/icons/MoreVertical';
import { Share2 } from '@/app/components/ui/icons/Share2';
import {
    TransactionsDropdownMenu,
    TransactionsDropdownMenuContent,
    TransactionsDropdownMenuItem,
    TransactionsDropdownMenuTrigger,
    runAfterTransactionsMenuClose,
} from '../TransactionsDropdownMenu';
import { TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import {
    TX_DROPDOWN_FOCUS,
    TX_GOLD_BTN,
    TX_ICON_BTN,
    TX_OCHRE_BTN,
    TX_TAB_TRIGGER,
    TX_TEXT_MUTED,
    TxGlassHeader,
    TxGlassTabsList,
    TxHeaderRow,
} from '../transactionsGlassTheme';
import { txStatusBadgeClass, txStatusLabelAr } from './transactionDetailsUtils';

export function TransactionDetailsHeader({
    tx,
    isReadOnly,
    onBack,
    taskCount,
    onReopen,
    onRequestComplete,
    onBeginSaveTemplate,
    onOpenImportTemplates,
    onShareProcedure,
    onOpenReport,
}: {
    tx: Transaction;
    isReadOnly: boolean;
    onBack?: () => void;
    taskCount: number;
    onReopen: () => void;
    onRequestComplete: () => void;
    onBeginSaveTemplate: () => void;
    onOpenImportTemplates: () => void;
    onShareProcedure: () => void;
    onOpenReport: () => void;
}) {
    return (
        <TxGlassHeader>
            <TxHeaderRow
                title={tx.title}
                subtitle={tx.clientName}
                onBack={onBack}
                backTestId="transactions-back"
                trailing={
                    <div className={`px-2 py-0.5 rounded-md border text-[10px] font-bold shrink-0 ${txStatusBadgeClass(tx.status)}`}>
                        {txStatusLabelAr(tx.status)}
                    </div>
                }
            />

            <div className="mt-1.5 flex items-center gap-1 justify-end">
                {isReadOnly ? (
                    <button type="button" onClick={onReopen} className={TX_GOLD_BTN} aria-label={`إعادة فتح المعاملة ${tx.title}`}>
                        إعادة فتح
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onRequestComplete}
                        className={TX_OCHRE_BTN}
                        aria-haspopup="dialog"
                        aria-label={`إنهاء المعاملة ${tx.title}`}
                    >
                        إنهاء
                    </button>
                )}

                <button
                    type="button"
                    onClick={onShareProcedure}
                    disabled={taskCount === 0}
                    data-testid="transactions-share-procedure"
                    className={`${TX_ICON_BTN} disabled:opacity-45`}
                    title="مشاركة الإجراءات للمنتدى"
                    aria-label="مشاركة الإجراءات للمنتدى"
                    aria-haspopup="dialog"
                >
                    <BookOpen className="w-5 h-5" aria-hidden />
                </button>

                <button
                    type="button"
                    onClick={onOpenReport}
                    className={TX_ICON_BTN}
                    title="مشاركة تحديث الموكل"
                    aria-label="مشاركة تحديث الموكل"
                    aria-haspopup="dialog"
                >
                    <Share2 className="w-5 h-5" />
                </button>

                <TransactionsDropdownMenu>
                    <TransactionsDropdownMenuTrigger asChild>
                        <button type="button" className={TX_ICON_BTN} aria-label="قائمة المعاملة" aria-haspopup="menu">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </TransactionsDropdownMenuTrigger>
                    <TransactionsDropdownMenuContent>
                        <TransactionsDropdownMenuItem
                            onSelect={() => {
                                runAfterTransactionsMenuClose(onBeginSaveTemplate);
                            }}
                            className={TX_DROPDOWN_FOCUS}
                            data-testid="transactions-menu-save-template"
                        >
                            حفظ المسار كقالب
                        </TransactionsDropdownMenuItem>
                        {!isReadOnly ? (
                            <TransactionsDropdownMenuItem
                                onSelect={() => {
                                    runAfterTransactionsMenuClose(onOpenImportTemplates);
                                }}
                                className={TX_DROPDOWN_FOCUS}
                                data-testid="transactions-menu-import-templates"
                            >
                                استيراد من قوالبي
                            </TransactionsDropdownMenuItem>
                        ) : null}
                    </TransactionsDropdownMenuContent>
                </TransactionsDropdownMenu>
            </div>

            <div className="mt-2">
                <TxGlassTabsList>
                    <TabsList className="w-full h-auto p-0 m-0 bg-transparent border-0 shadow-none rounded-none flex flex-row items-stretch gap-0.5">
                        <TabsTrigger value="path" className={TX_TAB_TRIGGER} data-testid="transactions-tab-path">
                            الإجراءات
                        </TabsTrigger>
                        <TabsTrigger value="docs" className={TX_TAB_TRIGGER} data-testid="transactions-tab-docs">
                            المرفقات
                        </TabsTrigger>
                    </TabsList>
                </TxGlassTabsList>

                {isReadOnly ? (
                    <p className={`${TX_TEXT_MUTED} mt-1.5 text-[11px] font-medium`}>معاملة مكتملة — للقراءة فقط</p>
                ) : null}
            </div>
        </TxGlassHeader>
    );
}
