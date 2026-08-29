import React, { memo, useId } from 'react';
import { SETTING_ROW_BORDER } from './tokens';
import { Segmented } from './Segmented';

export const SelectRow = memo(function SelectRow({
    label,
    subLabel,
    value,
    options,
    onChange,
}: {
    label: string;
    subLabel?: string;
    value: string;
    options: { value: string; label: string; testId?: string }[];
    onChange: (v: string) => void;
}) {
    const labelId = useId();

    return (
        <div className={`px-3.5 py-2.5 ${SETTING_ROW_BORDER} last:border-0`}>
            <span id={labelId} className="text-[13px] font-medium text-white/95 block">
                {label}
            </span>
            {subLabel ? <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{subLabel}</p> : null}
            <div className="mt-2">
            <Segmented
                value={value}
                options={options}
                onChange={onChange}
                nowrap
                aria-labelledby={labelId}
            />
            </div>
        </div>
    );
});
