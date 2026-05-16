import React from 'react';
import {
    TooltipRoot,
    TooltipTrigger,
    TooltipContent,
} from '@/app/components/ui/tooltip';

interface DecisionHintTooltipProps {
    children: React.ReactElement;
    label: string;
}

function DecisionHintTooltip({ children, label }: DecisionHintTooltipProps) {
    return (
        <TooltipRoot>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent
                side="top"
                sideOffset={6}
                className="max-w-[min(20rem,92vw)] border border-slate-500/45 bg-slate-950 text-slate-100 shadow-lg backdrop-blur-sm text-[11px] leading-relaxed text-right px-2.5 py-2 [&_svg]:fill-slate-950"
            >
                {label}
            </TooltipContent>
        </TooltipRoot>
    );
}

export default DecisionHintTooltip;
