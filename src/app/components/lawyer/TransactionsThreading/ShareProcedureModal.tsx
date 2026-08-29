import { memo } from 'react';
import type { ShareProcedureDraft } from '@/app/services/transactions/sanitizeTransactionForSharing';
import { TransactionsHubDialog } from './TransactionsHubDialog';
import { useShareProcedureModal } from './hooks/useShareProcedureModal';
import { ShareProcedureForm } from './ShareProcedureForm';
import {
    GLASS_BTN,
    TX_DIALOG_BTN_CANCEL,
    TX_DIALOG_DESC,
    TX_DIALOG_SHELL,
    TX_DIALOG_TITLE,
    TX_TEXT_MUTED,
} from './transactionsGlassTheme';

export const ShareProcedureModal = memo(function ShareProcedureModal({
    open,
    onOpenChange,
    draft,
    clientNameForScrub,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: ShareProcedureDraft | null;
    clientNameForScrub?: string | null;
}) {
    const vm = useShareProcedureModal({ open, onOpenChange, draft, clientNameForScrub });

    return (
        <TransactionsHubDialog
            open={open && Boolean(draft)}
            onOpenChange={onOpenChange}
            testId="share-procedure-dialog"
            ariaLabel="مشاركة الإجراءات للمنتدى"
        >
            <div className={`${TX_DIALOG_SHELL} max-h-[min(92dvh,680px)] overflow-y-auto overscroll-y-contain`}>
                <div className="text-right space-y-0.5">
                    <h2 className={TX_DIALOG_TITLE}>مشاركة الإجراءات للمنتدى</h2>
                    <p className={TX_DIALOG_DESC}>عدّل النص قبل النشر — بلا بيانات موكل</p>
                </div>
                <p className={`${TX_TEXT_MUTED} text-[11px] leading-5 mt-2`} role="status">
                    نُقّحت الأسماء والأرقام. يمكن تحرير النص يدوياً.
                </p>

                <ShareProcedureForm
                    title={vm.title}
                    onTitleChange={vm.setTitle}
                    bodyText={vm.bodyText}
                    onBodyChange={vm.setBodyText}
                    steps={vm.steps}
                    documents={vm.documents}
                    tagsText={vm.tagsText}
                    onTagsChange={vm.setTagsText}
                    submitting={vm.submitting}
                    onRebuildBody={vm.rebuildBodyFromCards}
                    onStepTitleChange={vm.updateStepTitle}
                />

                <div className="mt-4 flex flex-wrap justify-start gap-2">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={vm.submitting}
                        className={TX_DIALOG_BTN_CANCEL}
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={() => void vm.publish()}
                        disabled={vm.submitting || !vm.bodyText.trim()}
                        data-testid="share-procedure-publish"
                        className={GLASS_BTN + ' !w-auto !h-11 !px-5'}
                    >
                        {vm.submitting ? 'جاري النشر...' : 'نشر للمنتدى'}
                    </button>
                </div>
            </div>
        </TransactionsHubDialog>
    );
});
