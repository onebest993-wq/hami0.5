import React from 'react';
import type { StatementContentHighlight } from '../criminalStore';
import { highlightColorClass, mergeHighlightSegments } from '../statementContentHighlights';

export type StatementHighlightedContentProps = {
    content: string;
    highlights?: StatementContentHighlight[];
    className?: string;
};

export const StatementHighlightedContent = ({
    content,
    highlights,
    className = '',
}: StatementHighlightedContentProps) => {
    const segments = mergeHighlightSegments(content, highlights ?? []);
    return (
        <span className={className}>
            {segments.map((seg, i) =>
                seg.color ? (
                    <mark key={i} className={`${highlightColorClass(seg.color)} font-bold`}>
                        {seg.text}
                    </mark>
                ) : (
                    <React.Fragment key={i}>{seg.text}</React.Fragment>
                ),
            )}
        </span>
    );
};
