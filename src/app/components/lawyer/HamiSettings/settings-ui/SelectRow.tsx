import React, { memo, useId } from 'react';
import type { SettingsStemIcon } from '../settingsStemIconsCore';
import { SETTING_ICON_BOX, SETTING_ROW_BORDER } from './tokens';
import { Segmented } from './Segmented';

export const SelectRow = memo(function SelectRow({
    icon: Icon,
    label,
    subLabel,
    value,
    options,
    onChange,
}: {
    icon?: SettingsStemIcon;
    label: string;
    subLabel?: string;
    value: string;
    options: { value: string; label: string; testId?: string }[];
    onChange: (v: string) => void;
}) {
    const labelId = useId();

    return (
        <div className={`px-3 py-1.5 ${SETTING_ROW_BORDER} last:border-0`}>
            <div className="flex min-w-0 items-center gap-2.5">
                {Icon ? (
                    <div className={`${SETTING_ICON_BOX} text-[#E6C673]/80`}>
                        <Icon size={14} />
                    </div>
                ) : null}
                <span id={labelId} className="text-[13px] font-medium text-white/95 block min-w-0">
                    {label}
                </span>
            </div>
            {subLabel ? <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{subLabel}</p> : null}
            <div className="mt-1.5">
            <Segmented
                value={value}
                options={options}
                onChange={onChange}
                aria-labelledby={labelId}
            />
            </div>
        </div>
    );
});
