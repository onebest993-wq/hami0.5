import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { DiamondJudgmentPicker } from '../DiamondJudgmentPicker';
import type { JudgmentModalStyles } from '../../../smartFile/smartModalChrome';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../../smartFile/civilLawsuitTestIds';

afterEach(() => {
    cleanup();
});

const STYLES = {
    diamondTrigger: 'picker-trigger',
    diamondMenu: 'picker-menu',
    diamondOptionActive: 'picker-option-active',
    diamondOptionIdle: 'picker-option-idle',
    accentCheck: '',
    accentChevron: '',
} as JudgmentModalStyles;

const OPTIONS = [
    {
        value: 'إجابة الدعوى بالكامل',
        label: 'تأييد الحكم الغيابي — موكلك ربح الاعتراض',
        hint: 'موكلك: المعترض عليه · المدعي الأصلي يربح دعواه',
    },
    {
        value: 'رد الدعوى كلياً',
        label: 'تعديل الحكم الغيابي — موكلك خسر الاعتراض',
    },
];

function Harness({ onChange = vi.fn() }: { onChange?: (value: string) => void }) {
    const [value, setValue] = useState('');
    return (
        <DiamondJudgmentPicker
            value={value}
            onChange={(next) => {
                setValue(next);
                onChange(next);
            }}
            options={OPTIONS}
            styles={STYLES}
        />
    );
}

describe('DiamondJudgmentPicker', () => {
    it('يثبت الاختيار عند pointerDown ولا يعيد فتح القائمة بنقرة الشبح على المحفّز', () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} />);

        const trigger = screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOutcomePicker);
        expect(trigger.textContent ?? '').toContain('اختر النتيجة...');

        fireEvent.click(trigger);
        const option = screen.getByRole('option', {
            name: /تأييد الحكم الغيابي — موكلك ربح الاعتراض/,
        });
        expect(option.getAttribute('aria-selected')).toBe('false');

        fireEvent.pointerDown(option);
        fireEvent.mouseDown(option);
        fireEvent.mouseUp(option);
        fireEvent.click(trigger);

        expect(onChange).toHaveBeenCalledWith('إجابة الدعوى بالكامل');
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(trigger.textContent ?? '').toContain('تأييد الحكم الغيابي — موكلك ربح الاعتراض');
        expect(trigger.textContent ?? '').not.toContain('اختر النتيجة...');
    });

    it('لا يعلّم خياراً فارغاً كالمختار داخل القائمة', () => {
        render(<Harness />);
        fireEvent.click(screen.getByTestId(CIVIL_LAWSUIT_TEST_IDS.judgmentOutcomePicker));
        const options = screen.getAllByRole('option');
        expect(options.some((el) => (el.textContent ?? '').includes('اختر النتيجة'))).toBe(false);
        expect(options.every((el) => el.getAttribute('aria-selected') === 'false')).toBe(true);
    });
});
