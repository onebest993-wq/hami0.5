import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LegalActionsMenu } from '../LegalActionsMenu';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import { SmartFileModalThemeProvider } from '../../smartFile/smartFileModalTheme';

afterEach(() => {
    cleanup();
});

describe('LegalActionsMenu', () => {
    it('يغلق بالسحب للأسفل من مقبض الهاتف', () => {
        const onClose = vi.fn();
        render(
            <SmartFileModalThemeProvider variant="civil">
                <LegalActionsMenu isOpen onClose={onClose} onAction={vi.fn()} />
            </SmartFileModalThemeProvider>,
        );

        const handle = screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.legalActionsSwipeHandle);
        expect(handle.className).toContain('min-h-[44px]');

        fireEvent.pointerDown(handle, { clientY: 40, pointerId: 1, pointerType: 'touch', button: 0 });
        fireEvent.pointerUp(handle, { clientY: 160, pointerId: 1, pointerType: 'touch' });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Enter على المقبض يغلق القائمة', () => {
        const onClose = vi.fn();
        render(
            <SmartFileModalThemeProvider variant="civil">
                <LegalActionsMenu isOpen onClose={onClose} onAction={vi.fn()} />
            </SmartFileModalThemeProvider>,
        );

        fireEvent.keyDown(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.legalActionsSwipeHandle), {
            key: 'Enter',
        });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('الغلاف والصفوف مخفّفة بلا عرض 68rem ولا ارتفاع 4.25rem', () => {
        const theme = readFileSync(
            resolve(__dirname, '../../smartFile/smartFileModalTheme.tsx'),
            'utf8',
        );
        const menu = readFileSync(resolve(__dirname, '../LegalActionsMenu.tsx'), 'utf8');
        expect(theme).not.toContain('min-h-[4.25rem]');
        expect(theme).not.toContain('68rem');
        expect(theme).not.toContain('md:-translate-x-1/2');
        expect(theme).toContain('min-h-[44px]');
        expect(theme).toContain('max-w-[28rem]');
        expect(theme).toContain('LV_INSET');
        expect(theme).toContain('text-[#E6C673] shrink-0');
        expect(menu).toContain('Megaphone');
        expect(menu).toContain('useSheetSwipeDismiss');
        expect(menu).toContain('legalActionsSwipeHandle');
        expect(menu).not.toContain('backdrop-blur-[7px]');
    });
});
