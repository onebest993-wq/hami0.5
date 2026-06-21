import React from 'react';
import type { HomeBlockStyleOverride, HomeCustomizableId } from '@/app/services/settings/homeLayout';
import {
    resolveHomeBlockClassNames,
    resolveHomeBlockInlineStyle,
    resolveBlockContainerBorder,
    shouldShowHomeBlockSheen,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { HomeBlockPatternOverlay } from './HomeBlockPatternOverlay';

type HomeBlockShellProps = {
    blockId: HomeCustomizableId;
    override?: HomeBlockStyleOverride;
    themePrimary: string;
    className?: string;
    children: React.ReactNode;
    as?: 'div' | 'section' | 'button' | 'header';
    onClick?: () => void;
    type?: 'button';
    'data-testid'?: string;
    'aria-label'?: string;
    /** يورّث --hami-content-scale من الحاوية الخارجية */
    inheritContentScale?: boolean;
};

export function HomeBlockShell({
    blockId,
    override,
    themePrimary,
    className = '',
    children,
    as = 'div',
    onClick,
    type,
    'data-testid': testId,
    'aria-label': ariaLabel,
    inheritContentScale = false,
}: HomeBlockShellProps) {
    const { settings } = useLawyerSettings();
    const blockClasses = resolveHomeBlockClassNames(override);
    const style = resolveHomeBlockInlineStyle(override, themePrimary, {
        skipContentScale: inheritContentScale,
        defaultGlassOpacity: settings.appearance.glassOpacity,
    });
    const containerBorderOn = resolveBlockContainerBorder(
        override,
        settings.appearance.homeContainerBorder !== false,
    );
    const Component = as;

    return (
        <Component
            data-hami-block={blockId}
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-testid={testId}
            aria-label={ariaLabel}
            type={as === 'button' ? type ?? 'button' : undefined}
            onClick={onClick}
            className={`relative overflow-hidden border ${blockClasses} ${className}`.trim()}
            style={style}
        >
            <HomeBlockPatternOverlay override={override} themePrimary={themePrimary} />
            {shouldShowHomeBlockSheen(override?.pattern) ? (
                <div className="hami-sovereign-shine absolute inset-0 rounded-[inherit] pointer-events-none z-0" aria-hidden />
            ) : null}
            <div className="relative z-[1]">{children}</div>
        </Component>
    );
}
