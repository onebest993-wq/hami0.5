import React from 'react';

/** أنواع + غلاف SVG — مشترك بين كروم الفتح والأقسام الكسولة */
export type SettingsStemIconProps = {
    size?: number | string;
    strokeWidth?: number | string;
    className?: string;
    style?: React.CSSProperties;
    'aria-hidden'?: boolean | 'true' | 'false';
};

export type SettingsStemIcon = (props: SettingsStemIconProps) => React.ReactElement;

export function SettingsStemSvg({
    size = 24,
    strokeWidth = 2,
    className,
    style,
    children,
    html,
    ...rest
}: SettingsStemIconProps & { children?: React.ReactNode; html?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            style={style}
            {...rest}
            {...(html ? { dangerouslySetInnerHTML: { __html: html } } : { children })}
        />
    );
}
