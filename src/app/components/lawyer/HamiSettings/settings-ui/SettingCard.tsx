import React, { memo } from 'react';
import { SETTING_GLASS } from './tokens';

export const SettingCard = memo(function SettingCard({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <div className={`${SETTING_GLASS} ${className}`}>{children}</div>;
});
