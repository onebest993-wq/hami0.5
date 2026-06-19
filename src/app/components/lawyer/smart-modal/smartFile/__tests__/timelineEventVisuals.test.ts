import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '../../../LawyerShared';
import { resolveTimelineVisual } from '../timelineEventVisuals';

function cardBorderClass(event: TimelineEvent) {
    return resolveTimelineVisual(event).card;
}

describe('timelineEventVisuals', () => {
    it('assigns distinct palettes per procedural event family', () => {
        const correspondence: TimelineEvent = {
            id: '1',
            type: 'note',
            date: '2026-06-16',
            title: 'مخاطبة — جهة',
            tags: ['#مخاطبة'],
        };
        const cassation: TimelineEvent = {
            id: '2',
            type: 'decision',
            date: '2026-06-16',
            title: 'طعن تمييزي في قرار إعدادي (مادة 216)',
            tags: ['#طعن_تمييزي'],
        };
        const thirdParty: TimelineEvent = {
            id: '3',
            type: 'decision',
            date: '2026-06-16',
            title: 'دخول شخص ثالث — أحمد',
            tags: ['#دعوى_حادثة', '#شخص_ثالث'],
        };
        const joined: TimelineEvent = {
            id: '4',
            type: 'decision',
            date: '2026-06-16',
            title: 'دعوى منضمة — دعوى منضمة',
            tags: ['#دعوى_حادثة', '#دعوى_منضمة'],
        };

        const c1 = cardBorderClass(correspondence);
        const c2 = cardBorderClass(cassation);
        const c3 = cardBorderClass(thirdParty);
        const c4 = cardBorderClass(joined);

        expect(c1).toContain('orange');
        expect(c2).toContain('purple');
        expect(c3).toContain('cyan');
        expect(c4).toContain('lime');
        expect(new Set([c1, c2, c3, c4]).size).toBe(4);
    });

    it('does not paint every decision event gold', () => {
        const procedural: TimelineEvent = {
            id: '5',
            type: 'decision',
            date: '2026-06-16',
            title: 'قرار استئخار الدعوى',
            isPause: true,
        };
        const judgment: TimelineEvent = {
            id: '6',
            type: 'decision',
            date: '2026-06-16',
            title: 'حكم بـ قبول الدعوى (حضوري)',
        };

        expect(cardBorderClass(procedural)).toContain('amber');
        expect(cardBorderClass(judgment)).toContain('E6C673');
    });

    it('maps event types to distinct base colors', () => {
        const appointment: TimelineEvent = {
            id: '7',
            type: 'appointment',
            subType: 'pleading',
            date: '2026-06-16',
            title: 'جلسة مرافعة',
        };
        const alert: TimelineEvent = {
            id: '8',
            type: 'alert',
            date: '2026-06-16',
            title: 'تحذير',
        };
        const document: TimelineEvent = {
            id: '9',
            type: 'document',
            docCategory: 'evidence',
            date: '2026-06-16',
            title: 'مستند',
        };

        expect(cardBorderClass(appointment)).toContain('blue');
        expect(cardBorderClass(alert)).toContain('red');
        expect(cardBorderClass(document)).toContain('emerald');
    });
});
