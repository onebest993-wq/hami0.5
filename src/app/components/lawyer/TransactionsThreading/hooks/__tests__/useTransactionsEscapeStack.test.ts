import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTransactionsEscapeStack } from '../useTransactionsEscapeStack';

let nativeBackHandler: (() => boolean) | null = null;

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: (handler: () => boolean) => {
        nativeBackHandler = handler;
        return () => {
            if (nativeBackHandler === handler) nativeBackHandler = null;
        };
    },
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    releaseBodyScrollLock: vi.fn(),
}));

function pressEscape() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

describe('useTransactionsEscapeStack', () => {
    beforeEach(() => {
        nativeBackHandler = null;
    });

    it('يغلق مركز المعاملات من القائمة عند Escape', () => {
        const onBack = vi.fn();
        renderHook(() =>
            useTransactionsEscapeStack({
                enabled: true,
                view: 'list',
                listAddSheetOpen: false,
                details: null,
                onBack,
                onCloseListAddSheet: vi.fn(),
                onBackToList: vi.fn(),
                onCloseDetailsOverlay: vi.fn(),
            }),
        );
        pressEscape();
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('يغلق ورقة إضافة معاملة قبل الخروج من المركز', () => {
        const onCloseListAddSheet = vi.fn();
        const onBack = vi.fn();
        renderHook(() =>
            useTransactionsEscapeStack({
                enabled: true,
                view: 'list',
                listAddSheetOpen: true,
                details: null,
                onBack,
                onCloseListAddSheet,
                onBackToList: vi.fn(),
                onCloseDetailsOverlay: vi.fn(),
            }),
        );
        pressEscape();
        expect(onCloseListAddSheet).toHaveBeenCalledTimes(1);
        expect(onBack).not.toHaveBeenCalled();
    });

    it('زر الرجوع الأندرويد يغلق ورقة الإضافة قبل الخروج', () => {
        const onCloseListAddSheet = vi.fn();
        const onBack = vi.fn();
        renderHook(() =>
            useTransactionsEscapeStack({
                enabled: true,
                view: 'list',
                listAddSheetOpen: true,
                details: null,
                onBack,
                onCloseListAddSheet,
                onBackToList: vi.fn(),
                onCloseDetailsOverlay: vi.fn(),
            }),
        );
        expect(nativeBackHandler?.()).toBe(true);
        expect(onCloseListAddSheet).toHaveBeenCalledTimes(1);
        expect(onBack).not.toHaveBeenCalled();
    });

    it('زر الرجوع الأندرويد يخرج من التفاصيل إلى القائمة', () => {
        const onBackToList = vi.fn();
        renderHook(() =>
            useTransactionsEscapeStack({
                enabled: true,
                view: 'details',
                listAddSheetOpen: false,
                details: {
                    addTaskSheetOpen: false,
                    reportOpen: false,
                    completeOpen: false,
                    saveTemplateOpen: false,
                    templatesOpen: false,
                    taskEditOpen: false,
                    taskDeleteOpen: false,
                },
                onBack: vi.fn(),
                onCloseListAddSheet: vi.fn(),
                onBackToList,
                onCloseDetailsOverlay: vi.fn(),
            }),
        );
        expect(nativeBackHandler?.()).toBe(true);
        expect(onBackToList).toHaveBeenCalledTimes(1);
    });
});
