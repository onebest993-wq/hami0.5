import React from 'react';
import { HomeSettingsIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
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
            icon={HomeSettingsIcon}
            label="الإعدادات"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerDown={onPointerDown}
            /* فتح عند pointerdown — أسرع من انتظار click؛ الـ Icon يمنع الازدواج مع click */
            activateOnPointerDown
            testId="header-settings-trigger"
        />
    );
}
