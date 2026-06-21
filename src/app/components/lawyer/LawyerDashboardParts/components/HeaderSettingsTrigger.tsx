import React from 'react';
import { Settings } from 'lucide-react';
import { HeaderToolbarIcon } from './HeaderToolbarIcon';

interface HeaderSettingsTriggerProps {
    onClick: () => void;
    onPointerEnter?: () => void;
}

export function HeaderSettingsTrigger({ onClick, onPointerEnter }: HeaderSettingsTriggerProps) {
    return (
        <HeaderToolbarIcon
            icon={Settings}
            label="الإعدادات"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            testId="header-settings-trigger"
        />
    );
}
