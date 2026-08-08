import React, { memo } from 'react';

/**
 * شعار المنتدى — SVG خفيف فوري (بلا تحميل صورة).
 * أعمدة + قوس Meridian بلون accent الديناميكي.
 */
export const ForumMeridianEmblem = memo(function ForumMeridianEmblem() {
    return (
        <svg
            className="hami-forum-meridian-emblem"
            viewBox="0 0 120 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            <defs>
                <linearGradient id="hami-forum-emblem-gold" x1="18" y1="12" x2="102" y2="148" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--hami-forum-accent, #E6C673)" stopOpacity="0.95" />
                    <stop offset="0.55" stopColor="#F5E6B8" stopOpacity="0.88" />
                    <stop offset="1" stopColor="var(--hami-forum-accent, #E6C673)" stopOpacity="0.72" />
                </linearGradient>
                <radialGradient
                    id="hami-forum-emblem-glow"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(60 78) rotate(90) scale(70 52)"
                >
                    <stop stopColor="var(--hami-forum-accent, #E6C673)" stopOpacity="0.22" />
                    <stop offset="1" stopColor="var(--hami-forum-accent, #E6C673)" stopOpacity="0" />
                </radialGradient>
            </defs>
            <rect width="120" height="160" fill="url(#hami-forum-emblem-glow)" />
            <path
                d="M18 128V44c0-4 3-7 7-7h12c4 0 7 3 7 7v84"
                stroke="url(#hami-forum-emblem-gold)"
                strokeWidth="5"
                strokeLinecap="round"
            />
            <path
                d="M76 128V44c0-4 3-7 7-7h12c4 0 7 3 7 7v84"
                stroke="url(#hami-forum-emblem-gold)"
                strokeWidth="5"
                strokeLinecap="round"
            />
            <path
                d="M30 52h60"
                stroke="url(#hami-forum-emblem-gold)"
                strokeWidth="4"
                strokeLinecap="round"
            />
            <path
                d="M24 36c18-18 54-18 72 0"
                stroke="url(#hami-forum-emblem-gold)"
                strokeWidth="3.5"
                strokeLinecap="round"
            />
            <circle cx="60" cy="36" r="4.5" fill="url(#hami-forum-emblem-gold)" />
            <path
                d="M42 98c6 8 30 8 36 0"
                stroke="url(#hami-forum-emblem-gold)"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.75"
            />
        </svg>
    );
});
