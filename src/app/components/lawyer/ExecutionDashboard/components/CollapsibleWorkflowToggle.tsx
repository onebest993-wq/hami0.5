import React from 'react';
import { ChevronDown } from 'lucide-react';

type CollapsibleWorkflowToggleProps = {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    className?: string;
    titleClassName?: string;
    /** يطابق focusKey من الأب لفتح القسم تلقائياً */
    sectionId?: string;
    focusKey?: string | null;
};

export const CollapsibleWorkflowToggle: React.FC<CollapsibleWorkflowToggleProps> = ({
    title,
    children,
    defaultExpanded = false,
    className = '',
    titleClassName = 'text-[#E6C673]',
    sectionId,
    focusKey,
}) => {
    const [expanded, setExpanded] = React.useState(defaultExpanded);

    React.useEffect(() => {
        if (focusKey && sectionId && focusKey === sectionId) {
            setExpanded(true);
        }
    }, [focusKey, sectionId]);

    return (
        <div className={`mt-3 border-t border-white/10 pt-3 ${className}`} dir="rtl">
            <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full flex-row-reverse items-center justify-between gap-2 rounded-xl py-1 text-right transition hover:bg-white/5"
            >
                <span className={`text-[11px] font-black ${titleClassName}`}>{title}</span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
            </button>
            {expanded ? <div className="mt-2 flex flex-col gap-2">{children}</div> : null}
        </div>
    );
};
