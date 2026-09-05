import React from 'react';
import { ecg } from './executionCreationGlassUi';
import { ExecutionCreationSection } from './ExecutionCreationSection';
import { isCreationEnterCommit } from '../hooks/executionCreationRevealSteps';

interface DirectorateSectionProps {
    directorate: string;
    fileNumber: string;
    showFileNumber: boolean;
    onDirectorateChange: (v: string) => void;
    onFileNumberChange: (v: string) => void;
    onCommitDirectorate: () => void;
    onCommitFileNumber: () => void;
}

export const DirectorateSection: React.FC<DirectorateSectionProps> = ({
    directorate,
    fileNumber,
    showFileNumber,
    onDirectorateChange,
    onFileNumberChange,
    onCommitDirectorate,
    onCommitFileNumber,
}) => (
    <ExecutionCreationSection>
        <div className="flex w-full flex-col gap-2.5">
            <div className="w-full">
                <label className={ecg.labelGold}>اسم المديرية</label>
                <input
                    type="text"
                    aria-label="اسم المديرية"
                    data-creation-step="directorate"
                    enterKeyHint="next"
                    value={directorate}
                    onChange={(e) => onDirectorateChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (!isCreationEnterCommit(e)) return;
                        e.preventDefault();
                        if (directorate.trim()) onCommitDirectorate();
                    }}
                    className={ecg.field}
                />
            </div>
            {showFileNumber ? (
                <div className="w-full">
                    <label className={ecg.labelGold}>رقم الإضبارة</label>
                    <input
                        type="text"
                        aria-label="رقم الإضبارة"
                        data-creation-step="fileNumber"
                        enterKeyHint="next"
                        value={fileNumber}
                        onChange={(e) => onFileNumberChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (!isCreationEnterCommit(e)) return;
                            e.preventDefault();
                            if (fileNumber.trim()) onCommitFileNumber();
                        }}
                        className={`${ecg.field} font-mono`}
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                    />
                </div>
            ) : null}
        </div>
    </ExecutionCreationSection>
);
