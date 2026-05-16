import React from 'react';
import { HamiDateInput } from '@/app/components/ui/HamiDateInput';

export type DatePickerFieldProps = {
    value: string;
    onValueChange: (next: string) => void;
    min?: string;
    max?: string;
    disabled?: boolean;
    inputClassName: string;
    wrapperClassName?: string;
};

export function DatePickerField({
    value,
    onValueChange,
    min,
    max,
    disabled,
    inputClassName,
    wrapperClassName,
}: DatePickerFieldProps) {
    return (
        <div className={wrapperClassName ?? 'w-full'}>
            <HamiDateInput
                value={value || ''}
                onValueChange={onValueChange}
                min={min}
                max={max}
                disabled={disabled}
                className={inputClassName}
            />
        </div>
    );
}
