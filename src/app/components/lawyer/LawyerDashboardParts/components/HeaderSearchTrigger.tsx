import React from 'react';
import { HeaderSearchMark } from './headerToolbarIcons';
import {
    beginGlobalSearchDismissLock,
    paintGlobalSearchInstantChrome,
} from '@/app/runtime/globalSearchInstantPaint';
import { HeaderToolbarIcon } from './HeaderToolbarIcon';

interface HeaderSearchTriggerProps {
    onClick: () => void;
    onPointerEnter?: () => void;
    onPointerDown?: () => void;
}

export function HeaderSearchTrigger({ onClick, onPointerEnter, onPointerDown }: HeaderSearchTriggerProps) {
    return (
        <HeaderToolbarIcon
            icon={HeaderSearchMark}
            label="بحث شامل"
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerDown={() => {
                beginGlobalSearchDismissLock();
                paintGlobalSearchInstantChrome();
                onPointerDown?.();
            }}
            /* الجسر يغطي العدسة فيبتلع click — الفتح في pointerdown مثل الإشعارات/الإعدادات.
             * لا تركيز تحت الإصبع: useGlobalSearchFocusArm يعطّل autofocus على الأصل. */
            activateOnPointerDown
            accent
            testId="header-search-trigger"
        />
    );
}
