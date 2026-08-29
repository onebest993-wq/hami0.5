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
    <div className="flex-shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20">
        <button type="button" onClick={onSubmit} className={ecg.saveBtn} data-testid="execution-creation-save">
            {buttonText}
        </button>
    </div>
);
