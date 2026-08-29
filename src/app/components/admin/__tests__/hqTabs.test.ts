import { describe, expect, it } from 'vitest';
import { formatHqBadge, HQ_TABS, isHqShortcutBlocked, tabFromShortcut } from '../hqTabs';
import { formatHqFreezeUntil } from '../hqFormat';

describe('hq control-room tabs', () => {
    it('يغطي ستة أقسام بأرقام ١–٦', () => {
        expect(HQ_TABS).toHaveLength(6);
        expect(tabFromShortcut('1')).toBe('monitor');
        expect(tabFromShortcut('2')).toBe('users');
        expect(tabFromShortcut('3')).toBe('requests');
        expect(tabFromShortcut('4')).toBe('reports');
        expect(tabFromShortcut('5')).toBe('forum');
        expect(tabFromShortcut('6')).toBe('laws');
        expect(tabFromShortcut('7')).toBeNull();
    });

    it('لا يخطف الاختصار من حقول الإدخال', () => {
        const input = document.createElement('input');
        const wrap = document.createElement('div');
        wrap.appendChild(input);
        expect(isHqShortcutBlocked(input)).toBe(true);
        expect(isHqShortcutBlocked(document.createElement('div'))).toBe(false);
        expect(isHqShortcutBlocked(null)).toBe(false);
    });

    it('يعرض شارة العد حتى ٩٩+', () => {
        expect(formatHqBadge(0)).toBeNull();
        expect(formatHqBadge(3)).toBe('3');
        expect(formatHqBadge(100)).toBe('99+');
        expect(formatHqBadge('—')).toBe('—');
    });
});

describe('formatHqFreezeUntil', () => {
    it('يخفي التجميد المنتهي أو الفارغ', () => {
        expect(formatHqFreezeUntil(null)).toBeNull();
        expect(formatHqFreezeUntil(new Date(Date.now() - 60_000).toISOString())).toBeNull();
        expect(formatHqFreezeUntil(new Date(Date.now() + 3600_000).toISOString())).toBeTruthy();
    });
});

describe('formatHqFreezeCaption', () => {
    it('يعرض الموعد الساري أو دائماً للحساب الموقوف', async () => {
        const { formatHqFreezeCaption } = await import('../hqFormat');
        expect(formatHqFreezeCaption(null, false)).toBeNull();
        expect(formatHqFreezeCaption(null, true)).toBe('تجميد دائم');
        const until = formatHqFreezeCaption(new Date(Date.now() + 3600_000).toISOString(), true);
        expect(until).toMatch(/^حتى /);
    });
});
