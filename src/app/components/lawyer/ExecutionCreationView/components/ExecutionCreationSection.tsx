import React from 'react';
import { ecg } from './executionCreationGlassUi';

export type ExecutionCreationSectionProps = {
    title?: string;
    children: React.ReactNode;
    className?: string;
};

/** غلاف موحّد لأقسام نموذج فتح الإضبارة — المحتوى فقط ما لم يُمرَّر عنوان صريح */
export const ExecutionCreationSection: React.FC<ExecutionCreationSectionProps> = ({
    title,
    children,
    className = '',
}) => (
    <section className={`${ecg.sectionWrap} ${className}`.trim()}>
        {title ? (
            <div className={ecg.sectionHeader}>
                <h3 className={ecg.sectionTitle}>{title}</h3>
            </div>
        ) : null}
        {children}
    </section>
);
