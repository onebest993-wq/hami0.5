import React, { useId } from 'react';
import type { HqFoldId } from '@/app/components/admin/useHqFold';
import { useHqFold } from '@/app/components/admin/useHqFold';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { cn } from '@/app/components/ui/utils';

export function HqFold({
    id,
    title,
    kicker,
    hint,
    summary,
    alert = false,
    defaultOpen = true,
    testId,
    action,
    className,
    children,
}: {
    id: HqFoldId;
    title: string;
    kicker?: string;
    hint?: string;
    summary?: string;
    alert?: boolean;
    defaultOpen?: boolean;
    testId?: string;
    action?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
}) {
    const [open, toggle] = useHqFold(id, defaultOpen);
    const uid = useId();
    const panelId = `hq-fold-panel-${id}-${uid}`;
    const ariaLabel = open
        ? `${title} — طي القسم`
        : summary
          ? `${title} — ${summary} — توسيع القسم`
          : `${title} — توسيع القسم`;

    return (
        <section
            className={cn('hq-fold', alert && 'hq-fold-alert', className)}
            data-open={open ? 'true' : 'false'}
            data-testid={testId}
            aria-label={title}
        >
            <div className="hq-fold-head">
                <button
                    type="button"
                    className="hq-fold-toggle"
                    aria-expanded={open}
                    aria-controls={panelId}
                    aria-label={ariaLabel}
                    onClick={toggle}
                >
                    <span className="hq-fold-chevron" aria-hidden="true">
                        <ChevronDown className="hq-fold-chevron-icon" />
                    </span>
                    <span className="hq-fold-copy">
                        {kicker ? <span className="hq-kicker">{kicker}</span> : null}
                        <span className="hq-fold-title">{title}</span>
                        {summary ? (
                            <span className="hq-fold-summary" aria-hidden={open}>
                                {summary}
                            </span>
                        ) : null}
                    </span>
                    {alert ? <span className="hq-fold-pip" aria-hidden="true" /> : null}
                </button>
                {action ? <div className="hq-fold-action">{action}</div> : null}
            </div>
            <div
                id={panelId}
                className="hq-fold-panel"
                hidden={!open}
                role="region"
                aria-label={title}
            >
                <div className="hq-fold-body">
                    {hint ? <p className="hq-fold-hint">{hint}</p> : null}
                    {children}
                </div>
            </div>
        </section>
    );
}
