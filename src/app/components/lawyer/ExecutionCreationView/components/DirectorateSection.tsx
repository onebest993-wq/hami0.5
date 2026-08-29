import React from 'react';
import { ecg } from './executionCreationGlassUi';
import { ExecutionCreationSection } from './ExecutionCreationSection';

interface DirectorateSectionProps {
    directorate: string;
    fileNumber: string;
    onDirectorateChange: (v: string) => void;
    onFileNumberChange: (v: string) => void;
}

export const DirectorateSection: React.FC<DirectorateSectionProps> = ({
    directorate,
    fileNumber,
    onDirectorateChange,
    onFileNumberChange,
}) => (
    <ExecutionCreationSection title="بيانات المديرية">
        <div className="flex w-full flex-col gap-2.5">
            <div className="w-full">
                <label className={ecg.labelGold}>اسم المديرية</label>
                <input
                    type="text"
                    aria-label="اسم المديرية"
                    value={directorate}
                    onChange={(e) => onDirectorateChange(e.target.value)}
                    className={ecg.field}
                />
            </div>
            <div className="w-full">
                <label className={ecg.labelGold}>رقم الإضبارة</label>
                <input
                    type="text"
                    aria-label="رقم الإضبارة"
                    value={fileNumber}
                    onChange={(e) => onFileNumberChange(e.target.value)}
                    className={`${ecg.field} font-mono`}
                    dir="ltr"
                    style={{ textAlign: 'right' }}
                />
            </div>
        </div>
    </ExecutionCreationSection>
);
