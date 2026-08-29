import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { HeaderToolbarNav } from '@/app/components/lawyer/LawyerDashboardParts/components/HeaderToolbarNav';
import {
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/nativeBackStack';
import { HAMI_DISMISS_OVERLAYS_EVENT } from '@/app/utils/bodyScrollLock';

describe('HeaderToolbarNav reveal', () => {
    const props = {
        unreadCount: 0,
        onSearchClick: vi.fn(),
        onNotificationsClick: vi.fn(),
        onSettingsClick: vi.fn(),
    };

    afterEach(() => {
        resetNativeBackHandlersForTests();
        document.documentElement.removeAttribute('data-hami-settings-open');
        document.documentElement.removeAttribute('data-hami-global-search-open');
        document.documentElement.removeAttribute('data-hami-notifications-open');
    });

    it('يطوي الأدوات خلف علامة تدل على المخفي', () => {
        render(<HeaderToolbarNav {...props} />);
        const nav = screen.getByTestId('header-toolbar-nav');
        expect(nav).toHaveAttribute('data-hami-tools-open', '0');
        expect(nav).toHaveAttribute('data-hami-tools-bloom', '0');
        expect(screen.getByTestId('header-tools-reveal')).toHaveAttribute('aria-expanded', 'false');
        expect(screen.getByLabelText('إظهار أدوات اللوحة')).toBeTruthy();
        expect(screen.getByTestId('header-toolbar-tools')).not.toBeVisible();
    });

    it('يفتح الأدوات بالضغط على العلامة ويغلقها مرة أخرى', () => {
        render(<HeaderToolbarNav {...props} />);
        fireEvent.click(screen.getByTestId('header-tools-reveal'));
        expect(screen.getByTestId('header-toolbar-nav')).toHaveAttribute('data-hami-tools-open', '1');
        expect(screen.getByTestId('header-toolbar-nav')).toHaveAttribute('data-hami-tools-bloom', '1');
        expect(screen.getByTestId('header-search-trigger')).toBeVisible();
        expect(screen.getByLabelText('إخفاء أدوات اللوحة')).toBeTruthy();
        fireEvent.click(screen.getByTestId('header-tools-reveal'));
        expect(screen.getByTestId('header-toolbar-nav')).toHaveAttribute('data-hami-tools-open', '0');
        expect(screen.getByTestId('header-toolbar-nav')).toHaveAttribute('data-hami-tools-bloom', '0');
        expect(screen.getByTestId('header-toolbar-tools')).not.toBeVisible();
    });

    it('يفتح بالسحب للأسفل من الشريط المطوي', () => {
        render(<HeaderToolbarNav {...props} />);
        const reveal = screen.getByTestId('header-tools-reveal');
        fireEvent.pointerDown(reveal, { button: 0, clientX: 40, clientY: 80 });
        fireEvent.pointerMove(reveal, { clientX: 40, clientY: 120 });
        fireEvent.pointerUp(reveal, { clientX: 40, clientY: 120 });
        expect(screen.getByTestId('header-toolbar-nav')).toHaveAttribute('data-hami-tools-open', '1');
    });

    it('لا يسرق سحب أيقونة أداة مفتوحة لإغلاق الشريط', () => {
        render(<HeaderToolbarNav {...props} />);
        fireEvent.click(screen.getByTestId('header-tools-reveal'));
        const search = screen.getByTestId('header-search-trigger');
        fireEvent.pointerDown(search, { button: 0, clientX: 40, clientY: 120 });
        fireEvent.pointerMove(search, { clientX: 40, clientY: 180 });
        fireEvent.pointerUp(search, { clientX: 40, clientY: 180 });
        expect(screen.getByTestId('header-toolbar-nav')).toHaveAttribute('data-hami-tools-open', '1');
    });

    it('يغلق بـ Escape', () => {
        render(<HeaderToolbarNav {...props} />);
        fireEvent.click(screen.getByTestId('header-tools-reveal'));
        fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
        expect(screen.getByTestId('header-toolbar-nav')).toHaveAttribute('data-hami-tools-open', '0');
    });

    it('يغلق بلمسة خارج الشريط', () => {
        render(<HeaderToolbarNav {...props} />);
        fireEvent.click(screen.getByTestId('header-tools-reveal'));
        fireEvent.pointerDown(document.body);
        expect(screen.getByTestId('header-toolbar-nav')).toHaveAttribute('data-hami-tools-open', '0');
    });

    it('يغلق بزر الرجوع ولا يُطوى بـ dismiss-transient', () => {
        render(<HeaderToolbarNav {...props} />);
        fireEvent.click(screen.getByTestId('header-tools-reveal'));
        act(() => {
            expect(consumeNativeBackForTests()).toBe(true);
        });
        expect(screen.getByTestId('header-toolbar-nav')).toHaveAttribute('data-hami-tools-open', '0');

        fireEvent.click(screen.getByTestId('header-tools-reveal'));
        act(() => {
            window.dispatchEvent(new CustomEvent(HAMI_DISMISS_OVERLAYS_EVENT));
        });
        expect(screen.getByTestId('header-toolbar-nav')).toHaveAttribute('data-hami-tools-open', '1');
    });

    it('لا يسرق Escape من طبقة ملء شاشة مفتوحة', () => {
        document.documentElement.setAttribute('data-hami-settings-open', '1');
        render(<HeaderToolbarNav {...props} />);
        fireEvent.click(screen.getByTestId('header-tools-reveal'));
        fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
        expect(screen.getByTestId('header-toolbar-nav')).toHaveAttribute('data-hami-tools-open', '1');
        expect(consumeNativeBackForTests()).toBe(false);
    });
});
