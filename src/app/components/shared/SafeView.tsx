import React, { useEffect } from 'react';

interface SafeViewProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    statusBarColor?: string;
    /**
     * عند false: لا padding-top من safe-area (الهيدر/الملف يملكان الحافة العلوية).
     * افتراضي true لشاشات عامة.
     */
    topInset?: boolean;
}

/**
 * 📱 SafeView Component
 *
 * Ensures content respects device safe areas (Notch, Home Indicator).
 * Sets the system status bar color.
 */
export const SafeView: React.FC<SafeViewProps> = ({
    children,
    className = '',
    statusBarColor = '#0B1021',
    topInset = true,
    style,
    ...props
}) => {
    // Set Status Bar Color (Meta Tag)
    useEffect(() => {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', statusBarColor);
    }, [statusBarColor]);

    return (
        <div
            className={`
                min-h-screen w-full
                ${topInset ? 'pt-[env(safe-area-inset-top)]' : 'pt-0'}
                pb-[env(safe-area-inset-bottom)] 
                pl-[env(safe-area-inset-left)] 
                pr-[env(safe-area-inset-right)]
                ${className}
            `}
            style={style}
            {...props}
        >
            {children}
        </div>
    );
};
