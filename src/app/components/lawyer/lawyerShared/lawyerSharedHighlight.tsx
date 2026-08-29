import React from 'react';
import { normalizeArabicSearch } from '@/app/services/search/normalizeArabicSearch';
import { buildSafeHighlightPattern } from '@/app/services/search/globalSearchHighlightPattern';

interface HighlightedTextProps {
    text: string | undefined;
    query: string;
    className?: string;
}

export const HighlightedText = ({ text, query, className }: HighlightedTextProps) => {
    if (!query || !text) return <span className={className}>{text || ''}</span>;

    const safeQuery = query.slice(0, 64);
    
    // 1. Normalize both text and query for comparison
    const normText = normalizeArabicSearch(text).toLowerCase();
    const normQuery = normalizeArabicSearch(safeQuery).toLowerCase();
    
    // 2. If no match found in normalized version, return original
    if (!normText.includes(normQuery)) return <span className={className}>{text}</span>;

    const pattern = buildSafeHighlightPattern(safeQuery);
    if (!pattern) return <span className={className}>{text}</span>;

    return (
        <span className={className}>
            {text.split(pattern).map((part: string, i: number) => {
                 return normalizeArabicSearch(part).includes(normQuery) ? 
                    <span key={i} className="bg-[#E6C673] text-[#0B1021] px-0.5 rounded font-bold">{part}</span> : 
                    part
            })}
        </span>
    );
};
