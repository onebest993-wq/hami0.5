import React from 'react';
import { cn } from '@/app/components/ui/utils';
import {
    PS_PANEL,
    PS_PANEL_BEIGE,
    PS_PANEL_ELEPHANT,
    PS_SECTION_BODY,
    PS_SECTION_HEAD,
    PS_SECTION_HEAD_ROSE,
    PS_SECTION_LABEL,
    PS_SECTION_LABEL_ROSE,
} from './personalStatusPearlTheme';
import {
    PersonalStatusArabesqueLayers,
} from './PersonalStatusMoroccanGlass';

type PearlSectionVariant = 'glass' | 'beige' | 'elephant';

const VARIANT: Record<PearlSectionVariant, string> = {
    glass: PS_PANEL,
    beige: PS_PANEL_BEIGE,
    elephant: PS_PANEL_ELEPHANT,
};

const VARIANT_PATTERN: Record<PearlSectionVariant, { primary: number; fine: number }> = {
    glass: { primary: 0.05, fine: 0.025 },
    beige: { primary: 0.045, fine: 0.022 },
    elephant: { primary: 0.045, fine: 0.022 },
};

const VARIANT_HEAD: Record<PearlSectionVariant, string> = {
    glass: PS_SECTION_HEAD,
    beige: PS_SECTION_HEAD,
    elephant: PS_SECTION_HEAD_ROSE,
};

const VARIANT_LABEL: Record<PearlSectionVariant, string> = {
    glass: PS_SECTION_LABEL,
    beige: PS_SECTION_LABEL,
    elephant: PS_SECTION_LABEL_ROSE,
};

export function PersonalStatusPearlSection({
    label,
    children,
    className,
    variant = 'glass',
    action,
    bodyClassName,
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
    variant?: PearlSectionVariant;
    /** زر إجراء في شريط العنوان (مثل + مهمة) */
    action?: React.ReactNode;
    bodyClassName?: string;
}) {
    return (
        <section className={cn(VARIANT[variant], 'overflow-hidden min-h-0', className)}>
            <PersonalStatusArabesqueLayers {...VARIANT_PATTERN[variant]} />
            <div className={cn(VARIANT_HEAD[variant], 'relative z-[1]')}>
                <span className={VARIANT_LABEL[variant]}>{label}</span>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            <div className={cn(PS_SECTION_BODY, bodyClassName, 'relative z-[1]')}>{children}</div>
        </section>
    );
}
