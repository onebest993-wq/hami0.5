import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { CaseFlowActionsPanel } from '../CaseFlowActionsPanel';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import { resetSmartFileInlineOverlayRegistry } from '../../smartFile/smartFileInlineOverlayRegistry';
import { SmartFileModalThemeProvider } from '../../smartFile/smartFileModalTheme';
import {
    SMART_FILE_FLOW_PANEL_SHELL_CLASS,
    SMART_FILE_FLOW_PANEL_HOST_CLASS,
} from '../../smartFile/smartFileOverlayZ';

afterEach(() => {
    cleanup();
    resetSmartFileInlineOverlayRegistry();
});

describe('CaseFlowActionsPanel', () => {
    it('لوحة السير لا تعتمد translate+zoom (كانت تُخرج القائمة عن الشاشة)', () => {
        expect(SMART_FILE_FLOW_PANEL_HOST_CLASS).toContain('z-[280]');
        expect(SMART_FILE_FLOW_PANEL_HOST_CLASS).toContain('justify-center');
        expect(SMART_FILE_FLOW_PANEL_HOST_CLASS).not.toContain('inset-x-3 mx-auto');
        expect(SMART_FILE_FLOW_PANEL_SHELL_CLASS).not.toContain('-translate-x-1/2');
        expect(SMART_FILE_FLOW_PANEL_SHELL_CLASS).not.toContain('zoom-in');
        expect(SMART_FILE_FLOW_PANEL_SHELL_CLASS).not.toContain('inset-x-3');
        expect(SMART_FILE_FLOW_PANEL_SHELL_CLASS).toContain('max-w-[18rem]');
        expect(SMART_FILE_FLOW_PANEL_SHELL_CLASS).toContain('slide-in-from-top-2');
    });

    it('يفتح قائمة سير الدعوى ويطلب تأكيداً قبل تنفيذ الإجراء', () => {
        const onInterrupt = vi.fn();
        render(
            <SmartFileModalThemeProvider variant="civil">
                <CaseFlowActionsPanel
                    variant="dock"
                    compactDock
                    onInterrupt={onInterrupt}
                    onPause={vi.fn()}
                    onResume={vi.fn()}
                />
            </SmartFileModalThemeProvider>,
        );

        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.caseFlowOpen));
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.caseFlowPanel)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'انقطاع السير في الدعوى' }));
        expect(onInterrupt).not.toHaveBeenCalled();
        expect(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.caseFlowConfirmDialog)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'متابعة' }));
        expect(onInterrupt).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId(CIVIL_LAWSUIT_TEST_IDS.caseFlowPanel)).toBeNull();
    });

    it('قائمة الأحوال تبقى قائمة مضغوطة لا شريطاً بعرض الشاشة', () => {
        render(
            <SmartFileModalThemeProvider variant="personal-pearl">
                <CaseFlowActionsPanel
                    variant="rail"
                    onInterrupt={vi.fn()}
                    onPause={vi.fn()}
                    onResume={vi.fn()}
                />
            </SmartFileModalThemeProvider>,
        );

        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.caseFlowOpen));
        const dialog = screen.getByRole('dialog', { name: 'سير الدعوى' });
        expect(dialog.className).toContain('max-w-[18rem]');
        expect(dialog.className).not.toContain('inset-x-3');
        expect(dialog.className).not.toContain('absolute');
    });
});
