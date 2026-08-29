import React, { memo, useEffect, useRef, useState } from 'react';
import { SETTING_FOCUS_RING } from './tokens';
import { SettingsToggleTrack } from './SettingsToggleTrack';

export const Toggle = memo(function Toggle({
    checked,
    onChange,
    disabled,
    label,
    testId,
    optimistic: optimisticUi = true,
    'aria-labelledby': ariaLabelledBy,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    label?: string;
    testId?: string;
    optimistic?: boolean;
    'aria-labelledby'?: string;
}) {
    const [optimistic, setOptimistic] = useState<boolean | null>(null);
    const displayed = optimisticUi ? (optimistic ?? checked) : checked;
    const commitRef = useRef(false);

    useEffect(() => {
        if (!optimisticUi) return;
        if (optimistic !== null && checked === optimistic) {
            setOptimistic(null);
        }
    }, [checked, optimistic, optimisticUi]);

    const commit = (next: boolean, event: React.SyntheticEvent) => {
        event.stopPropagation();
        if (disabled) return;
        if (optimisticUi) setOptimistic(next);
        onChange(next);
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={displayed}
            aria-label={label}
            aria-labelledby={ariaLabelledBy}
            disabled={disabled}
            data-testid={testId}
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.stopPropagation();
                commitRef.current = true;
                commit(!displayed, event);
            }}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (commitRef.current) {
                    commitRef.current = false;
                    return;
                }
                commit(!displayed, event);
            }}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
            className={`relative z-[2] inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full touch-manipulation ${SETTING_FOCUS_RING} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
        >
            <SettingsToggleTrack on={displayed} />
        </button>
    );
});
