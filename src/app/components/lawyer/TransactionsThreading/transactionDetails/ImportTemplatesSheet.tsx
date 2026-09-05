import type { TaskTemplate } from '@/app/modules/transactionsThreading/taskTemplates';
import { canImportTaskTemplate } from '@/app/services/transactions/importTaskTemplateToTransaction';
import { TransactionsHubSheet } from '../TransactionsHubSheet';
import { TxGlassDrawerFrame } from '../transactionsGlassTheme';

type TaskTemplateListItem = Pick<TaskTemplate, 'id' | 'name' | 'tasks'>;

const DRAWER_ROW_BTN =
    'inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg text-[12px] font-semibold touch-manipulation disabled:opacity-50 hover:bg-black/[0.04]';

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
                {templates.length === 0 ? (
                    <p className="py-3 text-sm font-medium text-black/40">لا توجد قوالب محفوظة بعد.</p>
                ) : (
                    templates.map((t) => (
                        <div
                            key={t.id}
                            className="flex items-center justify-between gap-2 border-b border-black/[0.08] py-3"
                        >
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-[#0A0F1C]">{t.name}</div>
                                <div className="mt-0.5 text-xs font-medium text-black/40">{t.tasks.length} خطوة</div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                    type="button"
                                    disabled={!canImportTaskTemplate({ isReadOnly, existingTaskCount })}
                                    onClick={() => void onImport(t.id)}
                                    className={`${DRAWER_ROW_BTN} text-[#0A0F1C]`}
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
                                    className={`${DRAWER_ROW_BTN} text-black/45`}
                                >
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </TxGlassDrawerFrame>
        </TransactionsHubSheet>
    );
}
