import { describe, expect, it, vi } from 'vitest';
import { compressForumImageFile } from '../forumImageCompression';

function makeFile(name: string, type: string, size: number): File {
    const blob = new Blob([new Uint8Array(Math.max(1, size))], { type });
    return new File([blob], name, { type });
}

describe('compressForumImageFile', () => {
    it('يعيد الملف كما هو لغير الصور', async () => {
        const pdf = makeFile('doc.pdf', 'application/pdf', 2_000_000);
        expect(await compressForumImageFile(pdf)).toBe(pdf);
    });

    it('يتجاوز GIF المتحركة', async () => {
        const gif = makeFile('anim.gif', 'image/gif', 5_000_000);
        expect(await compressForumImageFile(gif)).toBe(gif);
    });

    it('يتجاوز SVG المتجهة', async () => {
        const svg = makeFile('vector.svg', 'image/svg+xml', 3_000_000);
        expect(await compressForumImageFile(svg)).toBe(svg);
    });

    it('يعيد الملف الأصلي عند فشل فك الترميز (بيئة بلا canvas)', async () => {
        // في jsdom لا يوجد ImageBitmap/canvas.toBlob فعّال — يجب ألا يفشل النشر
        const jpg = makeFile('photo.jpg', 'image/jpeg', 4_000_000);
        vi.stubGlobal('createImageBitmap', undefined);
        const result = await compressForumImageFile(jpg);
        expect(result).toBe(jpg);
        vi.unstubAllGlobals();
    });
});
