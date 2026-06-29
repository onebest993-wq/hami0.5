import React from 'react';
import { Search } from 'lucide-react';
import { HeaderToolbarIcon } from './HeaderToolbarIcon';

interface HeaderSearchTriggerProps {
    onClick: () => void;
    onPointerEnter?: () => void;
    onPointerDown?: () => void;
}

export function HeaderSearchTrigger({ onClick, onPointerEnter, onPointerDown }: HeaderSearchTriggerProps) {
    return (
        <HeaderToolbarIcon
            icon={Search}
            label="بحث شامل"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerDown={onPointerDown}
            accent
            testId="header-search-trigger"
        />
    );
}
