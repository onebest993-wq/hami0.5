import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { TransactionsHubSheet } from '../TransactionsHubSheet';
import { TransactionsThreadDialogContent } from '../TransactionsThreadDialogContent';
import type { TaskTemplate } from '@/app/modules/transactionsThreading/taskTemplates';
import { canImportTaskTemplate } from '@/app/services/transactions/importTaskTemplateToTransaction';
import {
    GLASS_BTN,
    GLASS_FIELD,
    TX_DIALOG_BTN_CANCEL,
    TX_DIALOG_DESC,
    TX_DIALOG_SHELL,
    TX_DIALOG_TITLE,
    TX_GOLD_BTN,
    TX_INNER_SURFACE,
    TX_TEXT_MUTED,
    TX_TEXT_PRIMARY,
    TX_TEXT_SECONDARY,
    TxGlassDrawerFrame,
    TxGlassPanel,
} from '../transactionsGlassTheme';

type TaskTemplateListItem = Pick<TaskTemplate, 'id' | 'name' | 'tasks'>;

export type TransactionDetailsDialogsProps = {
    completeOpen: boolean;
    onCompleteOpenChange: (open: boolean) => void;
    onCompleteTransaction: () => void | Promise<void>;
    saveTemplateOpen: boolean;
    onSaveTemplateOpenChange: (open: boolean) => void;
    canSaveTemplate: boolean;
    templateName: string;
    onTemplateNameChange: (value: string) => void;
    onSaveTemplate: () => void;
    templatesOpen: boolean;
    onTemplatesOpenChange: (open: boolean) => void;
    templates: TaskTemplateListItem[];
    isReadOnly: boolean;
    existingTaskCount: number;
    userId: string | null | undefined;
    onImportTemplate: (templateId: string) => void | Promise<void>;
    onDeleteTemplate: (templateId: string) => void;
    reportOpen: boolean;
    onReportOpenChange: (open: boolean) => void;
    reportText: string;
    copied: boolean;
    onCopyReport: () => void | Promise<void>;
    onShareTemplate?: (templateId: string) => void | Promise<void>;
};

export function TransactionDetailsDialogs({
    completeOpen,
    onCompleteOpenChange,
    onCompleteTransaction,
    saveTemplateOpen,
    onSaveTemplateOpenChange,
    canSaveTemplate,
    templateName,
    onTemplateNameChange,
    onSaveTemplate,
    templatesOpen,
    onTemplatesOpenChange,
    templates,
    isReadOnly,
    existingTaskCount,
    userId,
    onImportTemplate,
    onDeleteTemplate,
    reportOpen,
    onReportOpenChange,
    reportText,
    copied,
    onCopyReport,
}: TransactionDetailsDialogsProps) {
    const reduceMotion = useReduceMotion();

    return (
        <>
            <Dialog open={completeOpen} onOpenChange={onCompleteOpenChange}>
                <TransactionsThreadDialogContent instant={reduceMotion} hideCloseButton className={TX_DIALOG_SHELL}>
                    <DialogHeader className="text-right">
                        <DialogTitle className={TX_DIALOG_TITLE}>إنهاء المعاملة</DialogTitle>
                        <DialogDescription className={TX_DIALOG_DESC}>سيتم تحويل المعاملة إلى وضع القراءة فقط</DialogDescription>
                    </DialogHeader>
                    <div dir="rtl" className="text-right">
                        <div className={`${TX_INNER_SURFACE} p-4 ${TX_TEXT_SECONDARY} text-sm leading-7 font-medium`}>
                            بعد الأرشفة لن تتمكن من إضافة مهام/مستمسكات/حركات مالية أو تعديل الحالات.
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-start gap-2">
                        <button type="button" onClick={() => onCompleteOpenChange(false)} className={TX_DIALOG_BTN_CANCEL}>
                            إلغاء
                        </button>
                        <button type="button" onClick={onCompleteTransaction} className={GLASS_BTN + ' !w-auto px-5 h-11'}>
                            تأكيد الإنهاء
                        </button>
                    </DialogFooter>
                </TransactionsThreadDialogContent>
            </Dialog>

            <Dialog open={saveTemplateOpen} onOpenChange={onSaveTemplateOpenChange}>
                <TransactionsThreadDialogContent instant={reduceMotion} hideCloseButton className={TX_DIALOG_SHELL}>
                    <DialogHeader className="text-right">
                        <DialogTitle className={TX_DIALOG_TITLE}>حفظ المسار كقالب</DialogTitle>
                        <DialogDescription className={TX_DIALOG_DESC}>سيظهر القالب ضمن “قوالبي” للاستيراد لاحقاً</DialogDescription>
                    </DialogHeader>
                    <div dir="rtl" className="text-right space-y-3">
                        {!canSaveTemplate ? (
                            <div className={`${TX_INNER_SURFACE} p-3 ${TX_TEXT_MUTED} text-xs leading-6 font-medium`}>
                                أضف مهمة واحدة على الأقل في المسار قبل حفظ القالب.
                            </div>
                        ) : null}
                        <div>
                            <label className={`${TX_TEXT_MUTED} text-[11px] font-bold mb-1.5 block`}>اسم القالب</label>
                            <input
                                value={templateName}
                                onChange={(e) => onTemplateNameChange(e.target.value)}
                                className={GLASS_FIELD}
                                placeholder="مثال: مسار قسام شرعي"
                                disabled={!canSaveTemplate}
                            />
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-start gap-2">
                        <button type="button" onClick={() => onSaveTemplateOpenChange(false)} className={TX_DIALOG_BTN_CANCEL}>
                            إلغاء
                        </button>
                        <button
                            type="button"
                            disabled={!canSaveTemplate}
                            onClick={onSaveTemplate}
                            className={GLASS_BTN + ' !w-auto px-5 h-11 disabled:opacity-45'}
                        >
                            حفظ
                        </button>
                    </DialogFooter>
                </TransactionsThreadDialogContent>
            </Dialog>

            <TransactionsHubSheet
                open={templatesOpen}
                onOpenChange={onTemplatesOpenChange}
                testId="transactions-templates-sheet"
            >
                <TxGlassDrawerFrame title="استيراد من قوالبي" subtitle="اختر قالباً محفوظاً لاستيراده إلى هذه المعاملة">
                    <div className="space-y-2">
                        {templates.length === 0 ? (
                            <TxGlassPanel className={`p-4 ${TX_TEXT_MUTED} text-sm font-medium`}>لا توجد قوالب محفوظة بعد.</TxGlassPanel>
                        ) : (
                            templates.map((t) => (
                                <TxGlassPanel key={t.id} className="p-4 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className={`${TX_TEXT_PRIMARY} font-extrabold text-sm truncate`}>{t.name}</div>
                                        <div className={`${TX_TEXT_MUTED} text-xs mt-1 font-medium`}>{t.tasks.length} خطوة</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            disabled={!canImportTaskTemplate({ isReadOnly, existingTaskCount })}
                                            onClick={() => onImportTemplate(t.id)}
                                            className={TX_GOLD_BTN + ' disabled:opacity-50'}
                                        >
                                            استيراد
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isReadOnly}
                                            onClick={() => {
                                                if (!userId) return;
                                                onDeleteTemplate(t.id);
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

            <Dialog open={reportOpen} onOpenChange={onReportOpenChange}>
                <TransactionsThreadDialogContent instant={reduceMotion} hideCloseButton className={TX_DIALOG_SHELL}>
                    <DialogHeader className="text-right">
                        <DialogTitle className={TX_DIALOG_TITLE}>تحديث الموكل</DialogTitle>
                        <DialogDescription className={TX_DIALOG_DESC}>نص جاهز للإرسال عبر واتساب</DialogDescription>
                    </DialogHeader>
                    <div dir="rtl" className="text-right">
                        <div className={`${TX_INNER_SURFACE} p-4 ${TX_TEXT_SECONDARY} text-sm whitespace-pre-wrap leading-7 max-h-[50vh] overflow-y-auto font-medium`}>
                            {reportText}
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-start">
                        <button type="button" onClick={onCopyReport} className={GLASS_BTN + ' !w-auto px-5 h-11'}>
                            {copied ? 'تم النسخ' : 'نسخ النص'}
                        </button>
                    </DialogFooter>
                </TransactionsThreadDialogContent>
            </Dialog>
        </>
    );
}
