import React from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useExecutionFollowupModalPortalController } from './hooks/useExecutionFollowupModalPortalController';
import { ExecutionFollowupModalView } from './components/ExecutionFollowupModalView';

export function ExecutionFollowupModalPortal() {
    const controller = useExecutionFollowupModalPortalController();

    useBodyScrollLock(true);

    if (typeof document === 'undefined') return null;

    return createPortal(<ExecutionFollowupModalView controller={controller} />, document.body);
}
