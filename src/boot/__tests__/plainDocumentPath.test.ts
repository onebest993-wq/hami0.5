import { afterEach, describe, expect, it } from 'vitest';
import {
    applyPlainDocumentSurface,
    clearPlainDocumentSurface,
    isPlainDocumentPath,
    isPlainDocumentSurface,
    setPlainDocumentCoverForTests,
} from '@/boot/plainDocumentPath';

describe('plainDocumentPath', () => {
    afterEach(() => {
        setPlainDocumentCoverForTests(false);
        document.documentElement.removeAttribute('data-hami-app');
        document.documentElement.className = '';
        document.title = 'Hami';
    });

    it('يتعرّف على مسار /admin فقط', () => {
        expect(isPlainDocumentPath('/admin')).toBe(true);
        expect(isPlainDocumentPath('/admin/library')).toBe(true);
        expect(isPlainDocumentPath('/hq.html')).toBe(true);
        expect(isPlainDocumentPath('/')).toBe(false);
        expect(isPlainDocumentPath('/lawyer')).toBe(false);
    });

    it('لا يضع بصمة data-plain على html', () => {
        window.history.pushState({}, '', '/admin');
        applyPlainDocumentSurface();
        expect(document.documentElement.getAttribute('data-plain')).toBeNull();
        expect(isPlainDocumentSurface()).toBe(true);
        expect(document.title).toBe('');
        clearPlainDocumentSurface();
        expect(isPlainDocumentSurface()).toBe(false);
        window.history.pushState({}, '', '/');
    });
});
