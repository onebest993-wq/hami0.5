import React from 'react';
import { HeaderTuneMark } from './headerToolbarIcons';
import { beginSettingsOpenGesture, paintSettingsInstantChrome } from '@/app/runtime/settingsInstantPaint';
import { HeaderToolbarIcon } from './HeaderToolbarIcon';

interface HeaderSettingsTriggerProps {
    onClick: () => void;
    onPointerEnter?: () => void;
    onPointerDown?: () => void;
}

export function HeaderSettingsTrigger({
    onClick,
    onPointerEnter,
    onPointerDown,
}: HeaderSettingsTriggerProps) {
    return (
        <HeaderToolbarIcon
            icon={HeaderTuneMark}
            label="الإعدادات"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerDown={(event) => {
                beginSettingsOpenGesture(event.pointerId);
                paintSettingsInstantChrome();
                onPointerDown?.();
            }}
            /* فتح عند pointerdown — أسرع من انتظار click؛ الـ Icon يمنع الازدواج مع click */
            activateOnPointerDown
            testId="header-settings-trigger"
        />
    );
}
