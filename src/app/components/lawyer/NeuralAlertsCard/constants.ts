import { AlertTriangle, Clock, Scale } from 'lucide-react';
import type { AlertPriority } from './types';

export const THEME_STYLES = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', badgeBg: 'bg-blue-500/20', badgeText: 'text-blue-300' },
    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-300' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', badgeBg: 'bg-purple-500/20', badgeText: 'text-purple-300' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', badgeBg: 'bg-red-500/20', badgeText: 'text-red-300' },
} as const;

export type ThemeKey = keyof typeof THEME_STYLES;
export type ThemeStyles = { bg: string; border: string; text: string; badgeBg: string; badgeText: string };

export const PRIORITY_ORDER: Record<AlertPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
export const DISMISSED_KEY = 'neural-alerts-dismissed';

export function getThemeStyles(theme: string): ThemeStyles {
    return THEME_STYLES[theme as ThemeKey] || THEME_STYLES.amber;
}

export function safeString(val: unknown, fallback = ''): string {
    if (typeof val === 'string' && val.trim()) return val.trim();
    return fallback;
}

export function safeDate(dateStr: string): number {
    const d = new Date(dateStr).getTime();
    return Number.isFinite(d) ? d : 0;
}

export function getDismissedIds(): string[] {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
        return [];
    }
}

export function addDismissedId(id: string): void {
    try {
        const ids = getDismissedIds();
        if (!ids.includes(id)) {
            ids.push(id);
            localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
        }
    } catch {
        // localStorage may be full or unavailable
    }
}
