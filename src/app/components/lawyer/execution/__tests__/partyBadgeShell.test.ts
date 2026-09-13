/**
 * شكلُ الشارة وهيكلُ انتظارها من صندوقٍ واحد — فلا ينفصل ارتفاعُ الهيكل عن ارتفاع الشارة.
 */
import { describe, expect, it } from 'vitest';
import { PARTY_BADGE_PILL_BOX_CLASS, PARTY_BADGE_PILL_CLASS } from '../partyBadgeShell';

const classes = (s: string) => s.split(/\s+/).filter(Boolean);

describe('partyBadgeShell', () => {
    it('شكلُ الشارة يحمل صندوقَها كاملاً', () => {
        const pill = new Set(classes(PARTY_BADGE_PILL_CLASS));
        for (const c of classes(PARTY_BADGE_PILL_BOX_CLASS)) expect(pill.has(c)).toBe(true);
    });

    it('الصندوقُ يحمل كلَّ ما يُحدّد الارتفاع: الحدّ والحشو العموديّ وحجم الخطّ والمحاذاة', () => {
        expect(classes(PARTY_BADGE_PILL_BOX_CLASS)).toEqual(
            expect.arrayContaining(['inline-flex', 'items-center', 'border', 'py-1', 'text-[10px]']),
        );
    });

    it('التفكيكُ لم يُغيّر الشارة: مجموعةُ أصنافها هي نفسُها قبل اشتقاقها من الصندوق', () => {
        const before =
            'group inline-flex shrink-0 flex-row-reverse items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all hover:brightness-110 hover:shadow-[0_0_16px_rgba(0,0,0,0.2)] cursor-pointer';
        expect(new Set(classes(PARTY_BADGE_PILL_CLASS))).toEqual(new Set(classes(before)));
    });
});
