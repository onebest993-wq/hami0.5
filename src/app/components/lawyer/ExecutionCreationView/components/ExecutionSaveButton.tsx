import React from 'react';
import { ecg } from './executionCreationGlassUi';

interface ExecutionSaveButtonProps {
    onSubmit: () => void;
    buttonText?: string;
}

export const ExecutionSaveButton: React.FC<ExecutionSaveButtonProps> = ({
    onSubmit,
    buttonText = 'فتح إضبارة تنفيذية',
}) => (
    <div className="flex-shrink-0 px-4 pb-4 z-20">
        <button type="button" onClick={onSubmit} className={ecg.saveBtn}>
            {buttonText}
        </button>
    </div>
);
