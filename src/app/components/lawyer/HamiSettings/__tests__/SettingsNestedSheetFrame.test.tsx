import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SettingsNestedSheetFrame } from '@/app/components/lawyer/HamiSettings/SettingsNestedSheetFrame';

describe('SettingsNestedSheetFrame', () => {
    it('يغلق عند الضغط على الـ scrim لا على اللوحة', () => {
        const onClose = vi.fn();
        render(
            <SettingsNestedSheetFrame testId="sheet-root" dir="rtl" label="ورقة" onClose={onClose}>
                <button type="button">داخل</button>
            </SettingsNestedSheetFrame>,
        );

        fireEvent.pointerDown(screen.getByRole('dialog'));
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.pointerDown(screen.getByTestId('sheet-root'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
