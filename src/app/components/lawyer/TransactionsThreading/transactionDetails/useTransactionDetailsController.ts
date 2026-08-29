import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { TransactionStatus, type Transaction, type TransactionDocument, type TransactionTask } from '@/app/modules/transactionsThreading/types';
import { generateClientReport } from '../generateClientReport';
import {
    sanitizeTransactionForSharing,
    type ShareProcedureDraft,
} from '@/app/services/transactions/sanitizeTransactionForSharing';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { TransactionsDetailsEscapeSnapshot } from '../transactionsEscapeStack';
import { EMPTY_TASKS } from '../taskThread/taskThreadUtils';
import { copyTransactionsText } from '../copyTransactionsText';
import { useTransactionDetailsEscape } from './useTransactionDetailsEscape';
import { useTransactionDetailsTemplates } from './useTransactionDetailsTemplates';

const EMPTY_DOCS: TransactionDocument[] = [];

type TransactionDetailsControllerParams = {
    transactionId: string;
    onEscapeSnapshotChange?: (snapshot: TransactionsDetailsEscapeSnapshot) => void;
    registerEscapeCloser?: (
        closer: ((patch: Partial<TransactionsDetailsEscapeSnapshot>) => void) | null,
    ) => void;
    detailsActive?: boolean;
};

export function useTransactionDetailsController({
    transactionId,
    onEscapeSnapshotChange,
    registerEscapeCloser,
    detailsActive = true,
}: TransactionDetailsControllerParams) {
    const tx = useTransactionsThreadingStore((s) => s.transactions.find((t) => t.id === transactionId));
    const refreshTransactionData = useTransactionsThreadingStore((s) => s.refreshTransactionData);
    const tasks = useTransactionsThreadingStore((s) => s.tasksByTransactionId[transactionId] ?? EMPTY_TASKS);
    const documents = useTransactionsThreadingStore(
        (s) => s.documentsByTransactionId[transactionId] ?? EMPTY_DOCS,
    );
    const setTransactionStatus = useTransactionsThreadingStore((s) => s.setTransactionStatus);
    const addTask = useTransactionsThreadingStore((s) => s.addTask);
    const userId = useTransactionsThreadingStore((s) => s.userId);
    const isReadOnly = tx?.status === TransactionStatus.Completed;

    const {
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
    } = useTransactionDetailsTemplates({
        transactionId,
        tx,
        tasks,
        userId,
        isReadOnly,
        detailsActive,
        addTask,
        refreshTransactionData,
    });


    const [tab, setTab] = useState<'path' | 'docs'>('path');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [parent, setParent] = useState<TransactionTask | null>(null);
    const [reportOpen, setReportOpen] = useState(false);
    const [completeOpen, setCompleteOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [shareDraft, setShareDraft] = useState<ShareProcedureDraft | null>(null);
    const [shareClientName, setShareClientName] = useState<string | null>(null);

    const closeLocalOverlays = useCallback((patch: Partial<TransactionsDetailsEscapeSnapshot>) => {
        if (patch.reportOpen === false) setReportOpen(false);
        if (patch.completeOpen === false) setCompleteOpen(false);
        if (patch.saveTemplateOpen === false) setSaveTemplateOpen(false);
        if (patch.templatesOpen === false) setTemplatesOpen(false);
        if (patch.shareProcedureOpen === false) {
            setShareOpen(false);
            setShareDraft(null);
            setShareClientName(null);
        }
        if (patch.addTaskSheetOpen === false) {
            setSheetOpen(false);
            setParent(null);
        }
    }, []);

    const {
        onTaskEscapeSnapshotChange,
        registerTaskEscapeCloser,
        onDocumentsEscapeSnapshotChange,
        registerDocumentsEscapeCloser,
    } = useTransactionDetailsEscape({
        sheetOpen,
        reportOpen,
        completeOpen,
        saveTemplateOpen,
        templatesOpen,
        shareOpen,
        onEscapeSnapshotChange,
        registerEscapeCloser,
        closeLocalOverlays,
    });

    const parentHint = useMemo(() => {
        if (!parent) return null;
        return { id: parent.id, title: parent.title };
    }, [parent]);

    useEffect(() => {
        if (!detailsActive) {
            setSheetOpen(false);
            setParent(null);
            setReportOpen(false);
            setSaveTemplateOpen(false);
            setTemplatesOpen(false);
            setCompleteOpen(false);
            setShareOpen(false);
            setShareDraft(null);
            setShareClientName(null);
        }
    }, [detailsActive]);

    useEffect(() => {
        const hasCachedTasks = Boolean(
            useTransactionsThreadingStore.getState().tasksByTransactionId[transactionId],
        );
        if (!hasCachedTasks) {
            void refreshTransactionData(transactionId);
            return;
        }
        const idle = window.setTimeout(() => {
            void refreshTransactionData(transactionId);
        }, 0);
        return () => window.clearTimeout(idle);
    }, [refreshTransactionData, transactionId]);

    const reportText = useMemo(
        () => (reportOpen && tx ? generateClientReport(tx as Transaction, tasks) : ''),
        [reportOpen, tx, tasks],
    );


    const requestAddTask = (p: TransactionTask | null) => {
        if (isReadOnly) return;
        setParent(p);
        setSheetOpen(true);
    };

    const copyReport = async () => {
        try {
            await copyTransactionsText(reportText);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        } catch {
            setCopied(false);
            SmartToast.error('تعذر نسخ التحديث — حاول مرة أخرى');
        }
    };

    const completeTransaction = async () => {
        setCompleteOpen(false);
        try {
            await setTransactionStatus(transactionId, TransactionStatus.Completed);
            SmartToast.success('أُنهيت المعاملة');
        } catch {
            SmartToast.error('تعذر إنهاء المعاملة — حاول مرة أخرى');
            setCompleteOpen(true);
        }
    };

    const reopenTransaction = async () => {
        try {
            await setTransactionStatus(transactionId, TransactionStatus.Active);
            SmartToast.success('أُعيد فتح المعاملة');
        } catch {
            SmartToast.error('تعذر إعادة فتح المعاملة — حاول مرة أخرى');
        }
    };



    const openShareFromTransaction = () => {
        if (!tx) return;
        if (tasks.length === 0) {
            SmartToast.warning('أضف خطوة واحدة على الأقل قبل مشاركة الإجراءات');
            return;
        }
        setShareDraft(sanitizeTransactionForSharing(tx, tasks, documents));
        setShareClientName(tx.clientName);
        setShareOpen(true);
    };

    return {
        tx,
        tasks,
        transactionId,
        tab,
        setTab,
        isReadOnly: Boolean(isReadOnly),
        sheetOpen,
        setSheetOpen,
        setParent,
        parentHint,
        requestAddTask,
        reportOpen,
        setReportOpen,
        saveTemplateOpen,
        setSaveTemplateOpen,
        templatesOpen,
        setTemplatesOpen,
        templateName,
        setTemplateName,
        completeOpen,
        setCompleteOpen,
        copied,
        shareOpen,
        shareDraft,
        shareClientName,
        setShareOpen,
        setShareDraft,
        setShareClientName,
        templates,
        reportText,
        canSaveTemplate,
        userId,
        copyReport,
        completeTransaction,
        reopenTransaction,
        doSaveTemplate,
        importTemplate,
        openShareFromTransaction,
        onTaskEscapeSnapshotChange,
        registerTaskEscapeCloser,
        onDocumentsEscapeSnapshotChange,
        registerDocumentsEscapeCloser,
        deleteTemplate,
        beginSaveTemplate,
    };
}
