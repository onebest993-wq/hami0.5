import { describe, expect, it } from 'vitest';
import { queryHomeHubOverlayFocusable } from '../homeHubOverlayFocusTrap';

describe('homeHubOverlayFocusTrap', () => {
    it('يستبعد روابط javascript/data/vbscript من حلقة التبويب', () => {
        const sheet = document.createElement('div');
        const js = document.createElement('a');
        js.setAttribute('href', 'javascript:alert(1)');
        js.textContent = 'js';
        const data = document.createElement('a');
        data.setAttribute('href', 'data:text/html,phish');
        data.textContent = 'data';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'إغلاق';
        sheet.append(js, data, btn);
        document.body.append(sheet);

        expect(queryHomeHubOverlayFocusable(sheet)).toEqual([btn]);
        sheet.remove();
    });
});
