import type { TaskTemplate } from '@/app/modules/transactionsThreading/taskTemplates';
import { canImportTaskTemplate } from '@/app/services/transactions/importTaskTemplateToTransaction';
import { TransactionsHubSheet } from '../TransactionsHubSheet';
import {
    TX_DIALOG_BTN_CANCEL,
    TX_GOLD_BTN,
    TX_TEXT_MUTED,
    TX_TEXT_PRIMARY,
    TxGlassDrawerFrame,
    TxGlassPanel,
} from '../transactionsGlassTheme';

type TaskTemplateListItem = Pick<TaskTemplate, 'id' | 'name' | 'tasks'>;

export function ImportTemplatesSheet({
    open,
    onOpenChange,
    templates,
    isReadOnly,
    existingTaskCount,
    userId,
    onImport,
    onDelete,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templates: TaskTemplateListItem[];
    isReadOnly: boolean;
    existingTaskCount: number;
    userId: string | null | undefined;
    onImport: (templateId: string) => void | Promise<void>;
    onDelete: (templateId: string) => void;
}) {
    return (
        <TransactionsHubSheet
            open={open}
            onOpenChange={onOpenChange}
            testId="transactions-templates-sheet"
            ariaLabel="استيراد من قوالبي"
        >
            <TxGlassDrawerFrame title="استيراد من قوالبي" subtitle="يُضاف القالب إلى المسار الحالي دون حذف المهام الموجودة">
                <div className="space-y-2">
                    {templates.length === 0 ? (
                        <TxGlassPanel className={`p-3 ${TX_TEXT_MUTED} text-sm font-medium`}>
                            لا توجد قوالب محفوظة بعد.
                        </TxGlassPanel>
                    ) : (
                        templates.map((t) => (
                            <TxGlassPanel key={t.id} className="p-3 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className={`${TX_TEXT_PRIMARY} font-extrabold text-sm truncate`}>{t.name}</div>
                                    <div className={`${TX_TEXT_MUTED} text-xs mt-0.5 font-medium`}>{t.tasks.length} خطوة</div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        type="button"
                                        disabled={!canImportTaskTemplate({ isReadOnly, existingTaskCount })}
                                        onClick={() => void onImport(t.id)}
                                        className={TX_GOLD_BTN + ' disabled:opacity-50'}
                                    >
                                        استيراد
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isReadOnly}
                                        onClick={() => {
                                            if (!userId) return;
                                            onDelete(t.id);
                                        }}
                                        className={TX_DIALOG_BTN_CANCEL + ' !px-3 text-xs disabled:opacity-50'}
                                    >
                                        حذف
                                    </button>
                                </div>
                            </TxGlassPanel>
                        ))
                    )}
                </div>
            </TxGlassDrawerFrame>
        </TransactionsHubSheet>
    );
}
