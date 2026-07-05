import { describe, expect, it, vi } from 'vitest';
import {
    applyTransactionsEscapeAction,
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

    it('يغلق حوار حذف المهمة قبل تعديلها', () => {
        expect(
            resolveTransactionsEscapeAction({
                view: 'details',
                listAddSheetOpen: false,
                details: { ...closedDetails, taskDeleteOpen: true, taskEditOpen: true },
            }),
        ).toBe('close-task-delete');
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
