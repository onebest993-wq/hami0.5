import React, { memo, useMemo } from 'react';
import type { HomeBlockStyleOverride, HomeCustomizableId } from '@/app/services/settings/homeLayout';
import {
    resolveHomeBlockClassNames,
    resolveHomeBlockInlineStyle,
    resolveBlockContainerBorder,
    shouldShowHomeBlockSheen,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { mergeBlockScopedAppearance } from '@/app/services/settings/themeResolve';
import { HomeBlockPatternOverlay } from './HomeBlockPatternOverlay';
import { HomeMoroccanGlassDecor } from './HomeMoroccanGlassDecor';

type HomeBlockShellInteractionProps = {
    onClick?: () => void;
    onPointerEnter?: React.PointerEventHandler<HTMLElement>;
    onPointerDown?: React.PointerEventHandler<HTMLElement>;
    onMouseEnter?: React.MouseEventHandler<HTMLElement>;
    onFocus?: React.FocusEventHandler<HTMLElement>;
    disabled?: boolean;
    tabIndex?: number;
};

type HomeBlockShellProps = HomeBlockShellInteractionProps & {
    blockId: HomeCustomizableId;
    override?: HomeBlockStyleOverride;
    themePrimary: string;
    className?: string;
    children: React.ReactNode;
    as?: 'div' | 'section' | 'button' | 'header';
    type?: 'button';
    'data-testid'?: string;
    'aria-label'?: string;
    /** يورّث --hami-content-scale من الحاوية الخارجية */
    inheritContentScale?: boolean;
};

export const HomeBlockShell = memo(function HomeBlockShell({
    blockId,
    override,
    themePrimary,
    className = '',
    children,
    as = 'div',
    onClick,
    onPointerEnter,
    onPointerDown,
    onMouseEnter,
    onFocus,
    disabled,
    tabIndex,
    type,
    'data-testid': testId,
    'aria-label': ariaLabel,
    inheritContentScale = false,
}: HomeBlockShellProps) {
    const { settings } = useLawyerSettings();
    const scopedAppearance = useMemo(
        () => mergeBlockScopedAppearance(settings.appearance, override),
        [settings.appearance, override],
    );
    const blockClasses = resolveHomeBlockClassNames(override, settings.appearance.shape);
    const style = resolveHomeBlockInlineStyle(override, themePrimary, {
        skipContentScale: inheritContentScale,
        defaultGlassOpacity: settings.appearance.glassOpacity,
        appearance: settings.appearance,
    });
    const containerBorderOn = resolveBlockContainerBorder(
        override,
        settings.appearance.homeContainerBorder !== false,
    );
    const isButton = as === 'button';
    const Component = as;
    const focusRing = isButton
        ? 'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]'
        : '';

    return (
        <Component
            data-hami-block={blockId}
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-testid={testId}
            aria-label={ariaLabel}
            type={isButton ? type ?? 'button' : undefined}
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerDown={onPointerDown}
            onMouseEnter={onMouseEnter}
            onFocus={onFocus}
            disabled={isButton ? disabled : undefined}
            tabIndex={isButton ? tabIndex : undefined}
            className={`relative overflow-hidden ${containerBorderOn ? 'border' : 'border-0'} ${blockClasses} ${focusRing} ${className}`.trim()}
            style={style}
        >
            <HomeBlockPatternOverlay blockId={blockId} override={override} themePrimary={themePrimary} />
            <HomeMoroccanGlassDecor pattern={override?.pattern} blockOverride={override} />
            {shouldShowHomeBlockSheen(override?.pattern) ? (
                <div
                    className="hami-sovereign-shine absolute inset-0 rounded-[inherit] pointer-events-none z-0"
                    aria-hidden
                />
            ) : null}
            <div className="relative z-[1]">{children}</div>
        </Component>
    );
});
