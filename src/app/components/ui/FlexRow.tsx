/**
 * Reusable FlexRow component
 * Replaces repetitive "flex items-center gap-X" patterns
 */

import React from 'react';

interface FlexRowProps {
    gap?: number;
    align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    className?: string;
    children: React.ReactNode;
}

export const FlexRow = React.memo<FlexRowProps>(({ 
    gap = 2, 
    align = 'center',
    justify = 'start',
    className = '', 
    children 
}) => {
    const alignClass = {
        'start': 'items-start',
        'center': 'items-center',
        'end': 'items-end',
        'baseline': 'items-baseline',
        'stretch': 'items-stretch',
    }[align];
    
    const justifyClass = {
        'start': 'justify-start',
        'center': 'justify-center',
        'end': 'justify-end',
        'between': 'justify-between',
        'around': 'justify-around',
        'evenly': 'justify-evenly',
    }[justify];
    
    return (
        <div className={`flex ${alignClass} ${justifyClass} gap-${gap} ${className}`}>
            {children}
        </div>
    );
});

FlexRow.displayName = 'FlexRow';
