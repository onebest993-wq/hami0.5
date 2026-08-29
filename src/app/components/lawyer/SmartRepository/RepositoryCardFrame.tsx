import React from 'react';
import type { RepositoryCardInnerLayout } from './repositoryFeedLayout';

type RepositoryCardFrameProps = {
    innerLayout: RepositoryCardInnerLayout;
    articleClass: string;
    testId?: string;
    dataNoteId?: string;
    header: React.ReactNode;
    body: React.ReactNode;
    footer?: React.ReactNode;
};

export function RepositoryCardFrame({
    innerLayout,
    articleClass,
    testId,
    dataNoteId,
    header,
    body,
    footer,
}: RepositoryCardFrameProps) {
    if (innerLayout === 'row') {
        return (
            <article
                className={articleClass}
                data-testid={testId}
                data-note-id={dataNoteId}
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                    <div className="hami-repo-card-list-main min-w-0 flex-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                        <div className="shrink-0 sm:w-[7.5rem] sm:pt-0.5 space-y-1.5">{header}</div>
                        <div className="flex-1 min-w-0">{body}</div>
                    </div>
                    {footer ? (
                        <div className="shrink-0 flex flex-wrap items-center justify-end gap-1 sm:flex-col sm:items-stretch sm:justify-start sm:min-w-[6.5rem] pt-1 border-t border-white/[0.06] sm:border-0 sm:pt-0">
                            {footer}
                        </div>
                    ) : null}
                </div>
            </article>
        );
    }

    return (
        <article className={articleClass} data-testid={testId} data-note-id={dataNoteId}>
            <div className="mb-2">{header}</div>
            <div className="flex-1 min-h-0">{body}</div>
            {footer ? <div className="mt-auto pt-2 border-t border-white/[0.06]">{footer}</div> : null}
        </article>
    );
}
