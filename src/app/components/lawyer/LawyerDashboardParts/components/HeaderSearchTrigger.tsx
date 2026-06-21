import React from 'react';
import { Search } from 'lucide-react';
import { HeaderToolbarIcon } from './HeaderToolbarIcon';

interface HeaderSearchTriggerProps {
    onClick: () => void;
    onPointerEnter?: () => void;
}

export function HeaderSearchTrigger({ onClick, onPointerEnter }: HeaderSearchTriggerProps) {
    return (
        <HeaderToolbarIcon
            icon={Search}
            label="بحث شامل"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            accent
            testId="header-search-trigger"
        />
    );
}
