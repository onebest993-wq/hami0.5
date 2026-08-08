import React from 'react';

export type SparkMarkProps = {
    size?: number;
    className?: string;
};

/**
 * شعار السكرتير الذكي — ملف إجرائي + عقدة ذكاء (مدار هادئ).
 * ليس نجوماً ولا شعار Gemini؛ هوية بصرية خاصة بحامي.
 */
export function SparkMark({ size = 14, className = '' }: SparkMarkProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-hidden
        >
            <path
                d="M4.25 2.75h6.1c.55 0 1 .45 1 1v9.5c0 .55-.45 1-1 1H4.25c-.55 0-1-.45-1-1V3.75c0-.55.45-1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.05"
                opacity="0.9"
            />
            <path
                d="M3.35 4.25h2.15c.35 0 .65.3.65.65v7.35c0 .35-.3.65-.65.65H3.35"
                stroke="currentColor"
                strokeWidth="0.85"
                opacity="0.28"
            />
            <path
                d="M5.6 6.1h4.2M5.6 8.05h3.1"
                stroke="currentColor"
                strokeWidth="0.75"
                strokeLinecap="round"
                opacity="0.5"
            />
            <circle cx="11.85" cy="4.35" r="1.35" fill="currentColor" />
            <path
                d="M10.15 4.35a2.2 2.2 0 0 1 3.4-1.85"
                stroke="currentColor"
                strokeWidth="0.7"
                strokeLinecap="round"
                opacity="0.65"
            />
            <path
                d="M13.55 5.55a2.2 2.2 0 0 1-3.4 1.85"
                stroke="currentColor"
                strokeWidth="0.7"
                strokeLinecap="round"
                opacity="0.4"
            />
        </svg>
    );
}
