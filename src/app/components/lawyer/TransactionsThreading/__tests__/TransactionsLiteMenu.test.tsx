import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TransactionsLiteMenu } from '../TransactionsLiteMenu';
import {
    closeTransactionsLiteMenuIfOpen,
    isTransactionsLiteMenuOpen,
    markTransactionsLiteMenuOpen,
    TX_LITE_MENU_OPEN_ATTR,
} from '../transactionsLiteMenuOpen';

describe('transactionsLiteMenuOpen', () => {
    afterEach(() => {
        document.documentElement.removeAttribute(TX_LITE_MENU_OPEN_ATTR);
    });

    it('لا يغلق شيئاً إن لم تكن القائمة مفتوحة', () => {
        expect(closeTransactionsLiteMenuIfOpen()).toBe(false);
    });

    it('يغلق القائمة المعلّمة عبر الحدث', () => {
        const onClose = vi.fn();
        document.addEventListener('hami-tx-lite-menu-close', onClose);
        markTransactionsLiteMenuOpen(true);
        expect(isTransactionsLiteMenuOpen()).toBe(true);
        expect(closeTransactionsLiteMenuIfOpen()).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
        document.removeEventListener('hami-tx-lite-menu-close', onClose);
    });
});

describe('TransactionsLiteMenu', () => {
    afterEach(() => {
        document.documentElement.removeAttribute(TX_LITE_MENU_OPEN_ATTR);
        document.getElementById('hami-transactions-dropdown-root')?.remove();
    });

    it('يثبت الموقع قبل الرسم ولا يظهر عند 0,0', () => {
        const onEdit = vi.fn();
        render(
            <div style={{ position: 'fixed', top: 80, left: 40 }}>
                <TransactionsLiteMenu
                    triggerLabel="خيارات المهمة"
                    items={[{ label: 'تعديل', onSelect: onEdit, testId: 'transactions-task-menu-edit' }]}
                />
            </div>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'خيارات المهمة' }));
        const menu = screen.getByRole('menu');
        const top = Number.parseFloat(menu.style.top);
        const left = Number.parseFloat(menu.style.left);
        expect(Number.isFinite(top)).toBe(true);
        expect(Number.isFinite(left)).toBe(true);
        expect(top === 0 && left === 0).toBe(false);
        expect(isTransactionsLiteMenuOpen()).toBe(true);
    });

    it('Escape يعيد التركيز إلى الزناد', () => {
        render(
            <TransactionsLiteMenu
                triggerLabel="خيارات المهمة"
                items={[{ label: 'تعديل', onSelect: vi.fn() }]}
            />,
        );
        const trigger = screen.getByRole('button', { name: 'خيارات المهمة' });
        fireEvent.click(trigger);
        expect(screen.getByRole('menu')).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    it('يختار عنصر القائمة ويستدعي onSelect', () => {
        const onEdit = vi.fn();
        render(
            <TransactionsLiteMenu
                triggerLabel="خيارات المهمة"
                items={[{ label: 'تعديل', onSelect: onEdit, testId: 'transactions-task-menu-edit' }]}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'خيارات المهمة' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'تعديل' }));
        expect(onEdit).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
});
