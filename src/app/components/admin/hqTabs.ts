import type { LucideIcon } from '@/app/components/ui/lucideIcons';

export type AdminTabId =
    | 'monitor'
    | 'users'
    | 'requests'
    | 'reports'
    | 'forum'
    | 'laws';

export type HqTabGroupId = 'watch' | 'accounts' | 'content' | 'library';

export type HqTabSpec = {
    id: AdminTabId;
    label: string;
    group: HqTabGroupId;
    shortcut: string;
};

export const HQ_TAB_GROUPS: Array<{ id: HqTabGroupId; label: string }> = [
    { id: 'watch', label: 'المراقبة' },
    { id: 'accounts', label: 'الحسابات' },
    { id: 'content', label: 'المحتوى' },
    { id: 'library', label: 'المكتبة' },
];

export const HQ_TABS: HqTabSpec[] = [
    { id: 'monitor', label: 'الإحصائيات', group: 'watch', shortcut: '1' },
    { id: 'users', label: 'المستخدمين', group: 'accounts', shortcut: '2' },
    { id: 'requests', label: 'التوثيق', group: 'accounts', shortcut: '3' },
    { id: 'reports', label: 'البلاغات', group: 'content', shortcut: '4' },
    { id: 'forum', label: 'المنتدى', group: 'content', shortcut: '5' },
    { id: 'laws', label: 'القوانين', group: 'library', shortcut: '6' },
];

export function tabFromShortcut(key: string): AdminTabId | null {
    const hit = HQ_TABS.find((tab) => tab.shortcut === key);
    return hit?.id ?? null;
}

export function isHqShortcutBlocked(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (target.isContentEditable) return true;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

export function formatHqBadge(count: number | string): string | null {
    if (count === '—') return '—';
    if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return null;
    return count > 99 ? '99+' : String(Math.floor(count));
}

export type HqTabIconMap = Record<AdminTabId, LucideIcon>;
