import { describe, expect, it } from 'vitest';
import {
    safeProfileCssBackgroundImage,
    sanitizeProfileCanvasColor,
    sanitizeProfileMediaUrl,
    sanitizeProfilePlainText,
} from '../profileUrlSanitize';

const SAMPLE_JPEG_DATA_URL =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

describe('sanitizeProfileMediaUrl', () => {
    it('allows https URLs', () => {
        expect(sanitizeProfileMediaUrl('https://cdn.example.com/a.jpg')).toBe(
            'https://cdn.example.com/a.jpg',
        );
    });

    it('preserves full data:image URLs (no 2048 truncation)', () => {
        const longPayload = 'A'.repeat(4000);
        const longDataUrl = `data:image/jpeg;base64,/9j/${longPayload}`;
        expect(sanitizeProfileMediaUrl(longDataUrl)).toBe(longDataUrl);
    });

    it('allows valid jpeg data URLs', () => {
        expect(sanitizeProfileMediaUrl(SAMPLE_JPEG_DATA_URL)).toBe(SAMPLE_JPEG_DATA_URL);
    });

    it('rejects truncated or corrupt data URLs', () => {
        expect(sanitizeProfileMediaUrl('data:image/jpeg;base64,abc')).toBeUndefined();
        expect(sanitizeProfileMediaUrl('data:image/jpeg;base64,')).toBeUndefined();
    });

    it('rejects javascript and file schemes', () => {
        expect(sanitizeProfileMediaUrl('javascript:alert(1)')).toBeUndefined();
        expect(sanitizeProfileMediaUrl('file:///etc/passwd')).toBeUndefined();
    });

    it('rejects URLs with embedded credentials', () => {
        expect(sanitizeProfileMediaUrl('https://evil@hami.iq')).toBeUndefined();
    });

    it('rejects CSS injection in url field', () => {
        expect(sanitizeProfileMediaUrl("x'); background:url(")).toBeUndefined();
    });

    it('rejects blob, data-html, and relative paths — العرض يولّد blob بعد التنقية فقط', () => {
        expect(sanitizeProfileMediaUrl('blob:http://localhost:8080/abc')).toBeUndefined();
        expect(sanitizeProfileMediaUrl('data:text/html;base64,PHNjcmlwdD4=')).toBeUndefined();
        expect(sanitizeProfileMediaUrl('/local/avatar.jpg')).toBeUndefined();
        expect(sanitizeProfileMediaUrl('')).toBeUndefined();
        expect(sanitizeProfileMediaUrl('   ')).toBeUndefined();
    });

    it('rejects remote SVG paths', () => {
        expect(sanitizeProfileMediaUrl('https://cdn.example.com/x.svg')).toBeUndefined();
        expect(sanitizeProfileMediaUrl('https://cdn.example.com/x.svgz')).toBeUndefined();
    });
});

describe('sanitizeProfileCanvasColor', () => {
    it('allows hex and rgba', () => {
        expect(sanitizeProfileCanvasColor('#E6C673')).toBe('#E6C673');
        expect(sanitizeProfileCanvasColor('rgba(10,15,28,0.62)')).toBe('rgba(10,15,28,0.62)');
    });

    it('rejects injection payloads', () => {
        expect(sanitizeProfileCanvasColor('red);background:url(')).toBeUndefined();
    });
});

describe('safeProfileCssBackgroundImage', () => {
    it('wraps validated URLs in quoted url()', () => {
        expect(safeProfileCssBackgroundImage('https://cdn.example.com/bg.png')).toBe(
            'url("https://cdn.example.com/bg.png")',
        );
    });

    it('returns undefined for unsafe values', () => {
        expect(safeProfileCssBackgroundImage('not-a-url')).toBeUndefined();
    });
});


describe('sanitizeProfilePlainText', () => {
    it('strips tags and control chars', () => {
        expect(sanitizeProfilePlainText('<script>alert(1)</script>أحمد', 80)).toBe('أحمد');
        expect(sanitizeProfilePlainText('أ\u0007حمد', 80)).toBe('أحمد');
    });
});
