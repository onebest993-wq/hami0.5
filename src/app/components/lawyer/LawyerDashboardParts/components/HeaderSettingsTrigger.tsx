import React from 'react';
import { Settings } from 'lucide-react';
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
            icon={Settings}
            label="الإعدادات"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerDown={onPointerDown}
            testId="header-settings-trigger"
        />
    );
}
