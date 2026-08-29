import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import { Bell } from '@/app/components/ui/icons/Bell';
import {
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
} from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import {
    HUB_HEADER_CLASS,
    HUB_TITLE_CLASS,
} from './summonsHubStyles';

export interface SummonsHubHeaderProps {
    isGuarantorSummonsContext: boolean;
    onClose: () => void;
}

export const SummonsHubHeader: React.FC<SummonsHubHeaderProps> = ({
    isGuarantorSummonsContext,
    onClose,
}) => (
    <div className={`${HUB_HEADER_CLASS} ${EXEC_MODAL_HEADER_SAFE_TOP}`}>
        <button type="button" onClick={onClose} className={EXEC_MODAL_CLOSE_BTN_CLASS}>
            <X size={20} className="text-white" />
        </button>
        <h2 className={HUB_TITLE_CLASS}>
            <Bell size={20} />
            {isGuarantorSummonsContext ? 'تبليغ / تكليف الكفيل بالحضور' : 'التبليغ'}
        </h2>
    </div>
);
