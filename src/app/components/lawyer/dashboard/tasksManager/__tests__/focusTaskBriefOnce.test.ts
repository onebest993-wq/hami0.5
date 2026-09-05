import { describe, expect, it } from 'vitest';
import { consumeFocusTaskBrief } from '../focusTaskBriefOnce';

describe('consumeFocusTaskBrief', () => {
    it('يفتح الموجز مرة واحدة ثم يتجاهل تغيّر قائمة المهام', () => {
        const applied = { current: null as string | null };
        expect(consumeFocusTaskBrief('t1', applied, true)).toBe(true);
        expect(applied.current).toBe('t1');
        expect(consumeFocusTaskBrief('t1', applied, true)).toBe(false);
    });

    it('ينتظر ظهور المهمة ثم يسمح بتركيز جديد بعد زوال السابق', () => {
        const applied = { current: null as string | null };
        expect(consumeFocusTaskBrief('t1', applied, false)).toBe(false);
        expect(applied.current).toBeNull();
        expect(consumeFocusTaskBrief('t1', applied, true)).toBe(true);
        expect(consumeFocusTaskBrief(undefined, applied, false)).toBe(false);
        expect(applied.current).toBeNull();
        expect(consumeFocusTaskBrief('t2', applied, true)).toBe(true);
    });
});
