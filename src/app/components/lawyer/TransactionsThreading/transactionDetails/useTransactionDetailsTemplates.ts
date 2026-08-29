import { useEffect, useMemo, useState } from 'react';
import { listTaskTemplates, saveTaskTemplate, deleteTaskTemplate } from '@/app/modules/transactionsThreading/taskTemplates';
import type { Transaction, TransactionTask } from '@/app/modules/transactionsThreading/types';
import {
    canImportTaskTemplate,
    importTaskTemplateToTransaction,
} from '@/app/services/transactions/importTaskTemplateToTransaction';
import { sanitizeTransactionTemplateName } from '@/app/services/transactions/transactionsInputSecurity';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartToast } from '@/app/components/ui/SmartToast';

export function useTransactionDetailsTemplates({
    transactionId,
    tx,
    tasks,
    userId,
    isReadOnly,
    detailsActive,
    addTask,
    refreshTransactionData,
}: {
    transactionId: string;
    tx: Transaction | undefined;
    tasks: TransactionTask[];
    userId: string | null;
    isReadOnly: boolean;
    detailsActive: boolean;
    addTask: (input: {
        transactionId: string;
        title: string;
        parentTaskId?: string | null;
        notes?: string | null;
        deadline?: string | null;
    }) => Promise<TransactionTask>;
    refreshTransactionData: (transactionId: string) => Promise<void>;
}) {
    const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
    const [templatesOpen, setTemplatesOpen] = useState(false);
    const [templatesVersion, setTemplatesVersion] = useState(0);
    const [templateName, setTemplateName] = useState('');

    useEffect(() => {
        if (detailsActive) return;
        setSaveTemplateOpen(false);
        setTemplatesOpen(false);
    }, [detailsActive]);

    const templates = useMemo(() => {
        void templatesVersion;
        return tx && userId ? listTaskTemplates(userId) : [];
    }, [templatesVersion, userId, tx]);

    const canSaveTemplate = Boolean(tx && !isReadOnly && tasks.length > 0 && userId);

const doSaveTemplate = () => {
        if (!canSaveTemplate || !tx || !userId) return;
        const name = sanitizeTransactionTemplateName(templateName, tx.title);
        saveTaskTemplate(userId, {
            name,
            tasks: tasks.map((t) => ({
                id: t.id,
                title: t.title,
                parentTaskId: t.parentTaskId,
                deadline: t.deadline,
            })),
        });
        setSaveTemplateOpen(false);
        setTemplateName('');
        setTemplatesVersion((v) => v + 1);
        SmartToast.success('حُفظ القالب');
    };

    
const importTemplate = async (templateId: string) => {
        if (!canImportTaskTemplate({ isReadOnly: Boolean(isReadOnly), existingTaskCount: tasks.length })) return;
        if (!userId) return;
        const template = listTaskTemplates(userId).find((t) => t.id === templateId);
        if (!template) return;

        try {
            await importTaskTemplateToTransaction(transactionId, template, {
                addTask,
                refreshTransactionData,
            });
            setTemplatesOpen(false);
            SmartToast.success('استُورد القالب إلى المسار');
        } catch {
            SmartToast.error('تعذر استيراد القالب — حاول مرة أخرى');
        }
    };

    

    const deleteTemplate = (templateId: string) => {
        void (async () => {
                if (!userId) return;
                const ok = await SmartDialog.confirm('حذف هذا القالب؟');
                if (!ok) return;
                deleteTaskTemplate(userId, templateId);
                setTemplatesVersion((v) => v + 1);
            })();
    };

    const beginSaveTemplate = () => {
        if (!tx) return;
            setTemplateName(tx.title);
            setSaveTemplateOpen(true);
    };

    return {
        saveTemplateOpen,
        setSaveTemplateOpen,
        templatesOpen,
        setTemplatesOpen,
        templateName,
        setTemplateName,
        templates,
        canSaveTemplate,
        doSaveTemplate,
        importTemplate,
        deleteTemplate,
        beginSaveTemplate,
    };
}
