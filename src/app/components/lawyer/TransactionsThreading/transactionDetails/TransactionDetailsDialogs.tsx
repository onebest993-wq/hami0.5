import type { TaskTemplate } from '@/app/modules/transactionsThreading/taskTemplates';
import { ClientReportDialog } from './ClientReportDialog';
import { CompleteTransactionDialog } from './CompleteTransactionDialog';
import { ImportTemplatesSheet } from './ImportTemplatesSheet';
import { SaveTemplateDialog } from './SaveTemplateDialog';

type TaskTemplateListItem = Pick<TaskTemplate, 'id' | 'name' | 'tasks'>;

type TransactionDetailsDialogsProps = {
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
};

export function TransactionDetailsDialogs(props: TransactionDetailsDialogsProps) {
    return (
        <>
            {props.completeOpen ? (
                <CompleteTransactionDialog
                    open={props.completeOpen}
                    onOpenChange={props.onCompleteOpenChange}
                    onConfirm={props.onCompleteTransaction}
                />
            ) : null}
            {props.saveTemplateOpen ? (
                <SaveTemplateDialog
                    open={props.saveTemplateOpen}
                    onOpenChange={props.onSaveTemplateOpenChange}
                    canSave={props.canSaveTemplate}
                    templateName={props.templateName}
                    onTemplateNameChange={props.onTemplateNameChange}
                    onSave={props.onSaveTemplate}
                />
            ) : null}
            {props.templatesOpen ? (
                <ImportTemplatesSheet
                    open={props.templatesOpen}
                    onOpenChange={props.onTemplatesOpenChange}
                    templates={props.templates}
                    isReadOnly={props.isReadOnly}
                    existingTaskCount={props.existingTaskCount}
                    userId={props.userId}
                    onImport={props.onImportTemplate}
                    onDelete={props.onDeleteTemplate}
                />
            ) : null}
            {props.reportOpen ? (
                <ClientReportDialog
                    open={props.reportOpen}
                    onOpenChange={props.onReportOpenChange}
                    reportText={props.reportText}
                    copied={props.copied}
                    onCopy={props.onCopyReport}
                />
            ) : null}
        </>
    );
}
