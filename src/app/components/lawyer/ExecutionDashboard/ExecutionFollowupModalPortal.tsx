import React from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useExecutionFollowupModalPortalController } from './hooks/useExecutionFollowupModalPortalController';
import { ExecutionFollowupModalShell } from './components/ExecutionFollowupModalShell';
import { ExecutionFollowupModalTabPanels } from './components/ExecutionFollowupModalTabPanels';

export function ExecutionFollowupModalPortal() {
    const controller = useExecutionFollowupModalPortalController();

    useBodyScrollLock(true);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <ExecutionFollowupModalShell c={controller}>
            <ExecutionFollowupModalTabPanels c={controller} />
        </ExecutionFollowupModalShell>,
        document.body,
    );
}
