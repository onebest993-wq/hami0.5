import { describe, expect, it, vi } from 'vitest';
import {
    applyTransactionsEscapeAction,
    isSameTransactionsDetailsEscape,
    resolveTransactionsEscapeAction,
    type TransactionsEscapeSnapshot,
} from '@/app/components/lawyer/TransactionsThreading/transactionsEscapeStack';

const closedDetails = {
    addTaskSheetOpen: false,
    reportOpen: false,
    completeOpen: false,
    saveTemplateOpen: false,
    templatesOpen: false,
    taskCompleteOpen: false,
    taskEditOpen: false,
    taskDeleteOpen: false,
    shareProcedureOpen: false,
};

const listBase: TransactionsEscapeSnapshot = {
    view: 'list',
    listAddSheetOpen: false,
    details: null,
};

describe('resolveTransactionsEscapeAction', () => {
    it('يغلق تقرير الموكل قبل إنهاء المعاملة', () => {
        expect(
            resolveTransactionsEscapeAction({
                view: 'details',
                listAddSheetOpen: false,
                details: { ...closedDetails, reportOpen: true, completeOpen: true },
            }),
        ).toBe('close-report');
    });

    it('يغلق حوار إكمال المهمة قبل حذفها', () => {
        expect(
            resolveTransactionsEscapeAction({
                view: 'details',
                listAddSheetOpen: false,
                details: { ...closedDetails, taskCompleteOpen: true, taskDeleteOpen: true },
            }),
        ).toBe('close-task-delete');
    });

    it('يغلق حوار إكمال المهمة عند كونه الطبقة الأعمق', () => {
        expect(
            resolveTransactionsEscapeAction({
                view: 'details',
                listAddSheetOpen: false,
                details: { ...closedDetails, taskCompleteOpen: true },
            }),
        ).toBe('close-task-complete');
    });

    it('يغلق حوار حذف المهمة قبل تعديلها', () => {
        expect(
            resolveTransactionsEscapeAction({
                view: 'details',
                listAddSheetOpen: false,
                details: { ...closedDetails, taskDeleteOpen: true, taskEditOpen: true },
            }),
        ).toBe('close-task-delete');
    });

    it('يغلق مشاركة الدليل قبل حذف المهمة', () => {
        expect(
            resolveTransactionsEscapeAction({
                view: 'details',
                listAddSheetOpen: false,
                details: { ...closedDetails, shareProcedureOpen: true, taskDeleteOpen: true },
            }),
        ).toBe('close-share-procedure');
    });

    it('يغلق ورقة إضافة المعاملة قبل الخروج', () => {
        expect(
            resolveTransactionsEscapeAction({
                ...listBase,
                listAddSheetOpen: true,
            }),
        ).toBe('close-add-transaction');
    });

    it('يعود للقائمة من التفاصيل عند عدم وجود طبقات', () => {
        expect(
            resolveTransactionsEscapeAction({
                view: 'details',
                listAddSheetOpen: false,
                details: closedDetails,
            }),
        ).toBe('back-to-list');
    });

        it('يغلق حوار حذف المستمسك قبل ورقة إضافته', () => {
        expect(
            resolveTransactionsEscapeAction({
                view: 'details',
                listAddSheetOpen: false,
                details: { ...closedDetails, addDocumentSheetOpen: true, deleteDocumentOpen: true },
            }),
        ).toBe('close-delete-document');
    });

    it('يغلق ورقة إضافة المستمسك قبل ورقة إضافة المهمة', () => {
        expect(
            resolveTransactionsEscapeAction({
                view: 'details',
                listAddSheetOpen: false,
                details: { ...closedDetails, addDocumentSheetOpen: true, addTaskSheetOpen: true },
            }),
        ).toBe('close-add-document');
    });

    it('يخرج من مركز المعاملات من القائمة', () => {
        expect(resolveTransactionsEscapeAction(listBase)).toBe('exit-hub');
    });
});

describe('applyTransactionsEscapeAction', () => {
    it('يغلق ورقة الإضافة قبل الخروج', () => {
        const onCloseListAddSheet = vi.fn();
        const onBack = vi.fn();

        applyTransactionsEscapeAction('close-add-transaction', {
            onBack,
            onCloseListAddSheet,
            onBackToList: vi.fn(),
            onCloseDetailsOverlay: vi.fn(),
        });

        expect(onCloseListAddSheet).toHaveBeenCalledTimes(1);
        expect(onBack).not.toHaveBeenCalled();
    });

    it('يغلق حوار إكمال المهمة عبر apply', () => {
        const onCloseDetailsOverlay = vi.fn();

        applyTransactionsEscapeAction('close-task-complete', {
            onBack: vi.fn(),
            onCloseListAddSheet: vi.fn(),
            onBackToList: vi.fn(),
            onCloseDetailsOverlay,
        });

        expect(onCloseDetailsOverlay).toHaveBeenCalledWith({ taskCompleteOpen: false });
    });

        it('يغلق ورقة المستمسك عبر apply', () => {
        const onCloseDetailsOverlay = vi.fn();
        applyTransactionsEscapeAction('close-add-document', {
            onBack: vi.fn(),
            onCloseListAddSheet: vi.fn(),
            onBackToList: vi.fn(),
            onCloseDetailsOverlay,
        });
        expect(onCloseDetailsOverlay).toHaveBeenCalledWith({ addDocumentSheetOpen: false });
    });

    it('يغلق مشاركة الدليل عبر apply', () => {
        const onCloseDetailsOverlay = vi.fn();

        applyTransactionsEscapeAction('close-share-procedure', {
            onBack: vi.fn(),
            onCloseListAddSheet: vi.fn(),
            onBackToList: vi.fn(),
            onCloseDetailsOverlay,
        });

        expect(onCloseDetailsOverlay).toHaveBeenCalledWith({ shareProcedureOpen: false });
    });

    it('يخرج من المركز عند exit-hub', () => {
        const onBack = vi.fn();

        applyTransactionsEscapeAction(resolveTransactionsEscapeAction(listBase), {
            onBack,
            onCloseListAddSheet: vi.fn(),
            onBackToList: vi.fn(),
            onCloseDetailsOverlay: vi.fn(),
        });

        expect(onBack).toHaveBeenCalledTimes(1);
    });
});

describe('isSameTransactionsDetailsEscape', () => {
    it('يرفض null ولا يعيد رسم لقطة مطابقة', () => {
        expect(isSameTransactionsDetailsEscape(null, closedDetails)).toBe(false);
        expect(isSameTransactionsDetailsEscape(closedDetails, closedDetails)).toBe(true);
        expect(
            isSameTransactionsDetailsEscape(closedDetails, { ...closedDetails, reportOpen: true }),
        ).toBe(false);
    });
});
