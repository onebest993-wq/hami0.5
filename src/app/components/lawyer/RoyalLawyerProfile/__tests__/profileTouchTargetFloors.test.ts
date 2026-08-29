import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * أهداف لمس حقيقية وُجدت أصغر من ٤٤px (Apple HIG / Material) — إما دائماً
 * (`sigil-follow`, `zoom-btn`) أو إن انكمش rem لأي سبب (`sigil`, `sigil--throne`).
 * html ثابت على 16px؛ مقياس القراءة عبر --hami-font-size على النص. هذا الاختبار
 * يقفل صمّام px الثابت فلا يعود أي منها للانكماش صمتاً في تعديل مستقبلي.
 */
describe('profilePageHeroFx.css — طوابق لمس ٤٤px', () => {
    const heroCss = readFileSync(
        resolve(__dirname, '../profilePageHeroFx.css'),
        'utf8',
    );

    it('.hami-profile-sigil (زر تعديل) لا ينكمش تحت ٤٤px', () => {
        const block = heroCss.slice(
            heroCss.indexOf('] .hami-profile-sigil {'),
            heroCss.indexOf('.hami-profile-sigil:active'),
        );
        expect(block).toContain('min-width: 44px');
        expect(block).toContain('min-height: 44px');
    });

    it('.hami-profile-sigil--throne (زر استوديو) لا ينكمش تحت ٤٤px', () => {
        const block = heroCss.slice(
            heroCss.indexOf('.hami-profile-sigil--throne {'),
            heroCss.indexOf('.hami-profile-sigil--throne .hami-profile-sigil-glyph'),
        );
        expect(block).toContain('min-width: 44px');
        expect(block).toContain('min-height: 44px');
    });

    it('.hami-profile-sigil-follow (زر متابعة) لا يقلّ عن ٤٤px حتى بالإعداد الافتراضي', () => {
        const block = heroCss.slice(
            heroCss.indexOf('.hami-profile-sigil-follow {'),
            heroCss.indexOf('.hami-profile-sigil-follow.is-following'),
        );
        expect(block).toMatch(/min-height:\s*max\(2\.5rem,\s*44px\)/);
    });

    it('.hami-profile-camera-btn هدف لمس 44px مع شارة أصغر', () => {
        const tokens = readFileSync(
            resolve(__dirname, '../profilePageTokensFx.css'),
            'utf8',
        );
        const block = tokens.slice(
            tokens.indexOf('.hami-profile-camera-btn {'),
            tokens.indexOf('.hami-profile-camera-btn__glyph'),
        );
        expect(block).toContain('min-width: 44px');
        expect(block).toContain('min-height: 44px');
        expect(tokens).toContain('.hami-profile-camera-btn__glyph');
        expect(tokens).toContain('width: 1.75rem');
    });
});

describe('profileImageFx.css — أزرار تكبير بؤرة الصورة', () => {
    const imageCss = readFileSync(
        resolve(__dirname, '../profileImageFx.css'),
        'utf8',
    );

    it('.profile-image-focus-picker__zoom-btn لم تعد ٢٨px ثابتة', () => {
        const block = imageCss.slice(
            imageCss.indexOf('.profile-image-focus-picker__zoom-btn {'),
            imageCss.indexOf('.profile-image-focus-picker__zoom-badge'),
        );
        expect(block).toContain('width: 44px');
        expect(block).toContain('height: 44px');
        expect(block).not.toMatch(/:\s*28px/);
    });
});
