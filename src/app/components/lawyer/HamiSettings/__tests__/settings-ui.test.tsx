import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SettingRow, Toggle, SelectRow } from '@/app/components/lawyer/HamiSettings/settings-ui';
import { WifiOff } from '@/app/components/ui/lucideIcons';

describe('settings-ui Toggle', () => {
    it('يبدّل الحالة ويوقف انتشار النقرة', () => {
        const onChange = vi.fn();
        const onParentClick = vi.fn();
        render(
            <div onClick={onParentClick}>
                <Toggle checked={false} onChange={onChange} testId="settings-toggle-test" label="اختبار" />
            </div>,
        );

        fireEvent.pointerDown(screen.getByTestId('settings-toggle-test'));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(true);
        expect(onParentClick).not.toHaveBeenCalled();
    });

    it('لا يبدّل مرتين من نفس اللمسة (pointerdown + click)', () => {
        const onChange = vi.fn();
        render(<Toggle checked={false} onChange={onChange} testId="settings-toggle-test" label="اختبار" />);
        const toggle = screen.getByTestId('settings-toggle-test');
        fireEvent.pointerDown(toggle);
        fireEvent.click(toggle);
        expect(onChange).toHaveBeenCalledTimes(1);
    });
});

describe('settings-ui SettingRow', () => {
    it('ينشّط المفتاح عند النقر على عنوان الصف', () => {
        const onChange = vi.fn();
        render(
            <SettingRow
                icon={WifiOff}
                label="قفل بيومتري"
                action={<Toggle checked={false} onChange={onChange} testId="settings-toggle-test" />}
            />,
        );

        fireEvent.pointerDown(screen.getByText('قفل بيومتري'));
        expect(onChange).toHaveBeenCalledWith(true);
    });
});

describe('settings-ui SelectRow', () => {
    it('يعرض شرائح اختيار بدل القائمة المنسدلة', () => {
        const onChange = vi.fn();
        render(
            <SelectRow
                label="قفل تلقائي بعد"
                value="5"
                options={[
                    { value: '0', label: 'معطّل', testId: 'lock-0' },
                    { value: '5', label: '5 دقائق', testId: 'lock-5' },
                    { value: '15', label: '15 دقيقة', testId: 'lock-15' },
                ]}
                onChange={onChange}
            />,
        );

        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        expect(screen.getByRole('radiogroup')).toHaveClass('hami-setting-glass-inner');
        expect(screen.getByTestId('lock-5')).toHaveAttribute('aria-checked', 'true');

        fireEvent.pointerDown(screen.getByTestId('lock-15'));
        expect(onChange).toHaveBeenCalledWith('15');
    });
});
