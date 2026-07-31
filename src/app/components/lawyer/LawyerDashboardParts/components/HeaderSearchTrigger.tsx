import React from 'react';
import { HomeSearchIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { HeaderToolbarIcon } from './HeaderToolbarIcon';

interface HeaderSearchTriggerProps {
    onClick: () => void;
    onPointerEnter?: () => void;
    onPointerDown?: () => void;
}

export function HeaderSearchTrigger({ onClick, onPointerEnter, onPointerDown }: HeaderSearchTriggerProps) {
    return (
        <HeaderToolbarIcon
            icon={HomeSearchIcon}
            label="بحث شامل"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerDown={onPointerDown}
            /* فتح عند pointerdown — أسرع على اللمس من انتظار click (مثل الإعدادات) */
            activateOnPointerDown
            accent
            testId="header-search-trigger"
        />
    );
}
