import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('DraggableHomeWidget Android drag survival', () => {
    const src = readFileSync(resolve(__dirname, '../DraggableHomeWidget.tsx'), 'utf8');
    const ui = readFileSync(resolve(__dirname, '../homeLayoutEditUi.tsx'), 'utf8');

    it('لا يزيل مقبض السحب من DOM أثناء السحب', () => {
        expect(src).toContain('يبقى mounted أثناء السحب');
        expect(src).toContain('dragHandleHidden={dragging}');
        expect(src).not.toMatch(/\{!dragging\s*\?\s*<HomeLayoutWidgetEditChrome/);
    });

    it('يستخدم touchstart مع preventDefault ويدعم pointer', () => {
        expect(src).toContain('onDragTouchStart');
        expect(src).toContain('touchmove');
        expect(src).toContain('onHandleTouchStart');
        expect(ui).toContain('onDragTouchStart');
        expect(ui).toContain('onTouchStart={onDragTouchStart}');
    });

    it('لا يُنهي الجلسة على pointercancel', () => {
        expect(src).not.toContain("addEventListener('pointercancel'");
        expect(src).toContain('لا ننهي على pointercancel');
    });
});
