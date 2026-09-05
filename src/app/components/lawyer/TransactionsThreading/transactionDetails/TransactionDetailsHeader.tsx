import { TransactionsLiteMenu } from '../TransactionsLiteMenu';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import {
    TX_GOLD_BTN,
    TX_ICON_BTN,
    TX_OCHRE_BTN,
    TX_TAB_TRIGGER,
    TX_TAB_TRIGGER_ACTIVE,
    TX_TEXT_MUTED,
    TxGlassHeader,
    TxHeaderRow,
} from '../transactionsGlassTheme';
import { BookOpenIcon, ShareIcon } from '../transactionsTheme/icons';
import { txStatusBadgeClass, txStatusLabelAr } from './transactionDetailsUtils';

export function TransactionDetailsHeader({
    tx,
    isReadOnly,
    tab,
    onTabChange,
    onPrimeDocsTab,
    onPrimeShare,
    onPrimeDetailsDialogs,
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
    tab: 'path' | 'docs';
    onTabChange: (next: 'path' | 'docs') => void;
    onPrimeDocsTab?: () => void;
    onPrimeShare?: () => void;
    onPrimeDetailsDialogs?: () => void;
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
                    <div className={`px-1 text-[11px] font-semibold shrink-0 ${txStatusBadgeClass(tx.status)}`}>
                        {txStatusLabelAr(tx.status)}
                    </div>
                }
            />

            <div className="mt-1 flex items-center gap-0.5 justify-end">
                {isReadOnly ? (
                    <button type="button" onClick={onReopen} className={TX_GOLD_BTN} aria-label={`إعادة فتح المعاملة ${tx.title}`}>
                        إعادة فتح
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onRequestComplete}
                        onPointerDown={() => onPrimeDetailsDialogs?.()}
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
                    onPointerDown={() => {
                        if (taskCount === 0) return;
                        onPrimeShare?.();
                    }}
                    disabled={taskCount === 0}
                    data-testid="transactions-share-procedure"
                    className={`${TX_ICON_BTN} disabled:opacity-45`}
                    title="مشاركة الإجراءات للمنتدى"
                    aria-label="مشاركة الإجراءات للمنتدى"
                    aria-haspopup="dialog"
                >
                    <BookOpenIcon className="w-5 h-5" />
                </button>

                <button
                    type="button"
                    onClick={onOpenReport}
                    onPointerDown={() => onPrimeDetailsDialogs?.()}
                    className={TX_ICON_BTN}
                    title="مشاركة تحديث الموكل"
                    aria-label="مشاركة تحديث الموكل"
                    aria-haspopup="dialog"
                >
                    <ShareIcon className="w-5 h-5" />
                </button>

                <TransactionsLiteMenu
                    triggerLabel="قائمة المعاملة"
                    onTriggerPointerDown={onPrimeDetailsDialogs}
                    items={[
                        {
                            label: 'حفظ المسار كقالب',
                            testId: 'transactions-menu-save-template',
                            onSelect: onBeginSaveTemplate,
                        },
                        ...(!isReadOnly
                            ? [
                                  {
                                      label: 'استيراد من قوالبي',
                                      testId: 'transactions-menu-import-templates',
                                      onSelect: onOpenImportTemplates,
                                  },
                              ]
                            : []),
                    ]}
                />
            </div>

            <div className="mt-1" data-testid="transactions-stage-rail">
                <div className="w-full flex flex-row items-stretch" role="tablist" aria-label="أقسام المعاملة">
                    <button
                        type="button"
                        role="tab"
                        className={`${TX_TAB_TRIGGER} ${tab === 'path' ? TX_TAB_TRIGGER_ACTIVE : ''}`}
                        data-testid="transactions-tab-path"
                        aria-selected={tab === 'path'}
                        onClick={() => onTabChange('path')}
                    >
                        الإجراءات
                    </button>
                    <button
                        type="button"
                        role="tab"
                        className={`${TX_TAB_TRIGGER} ${tab === 'docs' ? TX_TAB_TRIGGER_ACTIVE : ''}`}
                        data-testid="transactions-tab-docs"
                        aria-selected={tab === 'docs'}
                        onPointerDown={() => onPrimeDocsTab?.()}
                        onClick={() => onTabChange('docs')}
                    >
                        المرفقات
                    </button>
                </div>

                {isReadOnly ? (
                    <p className={`${TX_TEXT_MUTED} mt-1.5 text-[11px] font-medium`}>معاملة مكتملة — للقراءة فقط</p>
                ) : null}
            </div>
        </TxGlassHeader>
    );
}
