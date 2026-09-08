import { describe, expect, it } from 'vitest';
import {
    CALENDAR_DANGEROUS_BLOCK_TAGS,
    CALENDAR_STRIP_HTML_TAGS,
    stripCalendarHtml,
    calendarInputGuard,
} from '@/app/services/calendar/calendarInputSecurity';
import { mapEventFormToCalendarFields, EMPTY_FORM } from '@/app/services/calendar/calendarEventForm';
import { sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';

describe('calendarInputSecurity — 2-Phase HTML Strip Stack', () => {
    it('TR-5.2 Phase0 CALENDAR_DANGEROUS_BLOCK_TAGS يزيل 8 وسوم خطيرة بمحتواها (backreference)', () => {
        const samples = [
            ['<script>alert(1)</script>عادي', 'عادي'],
            ['<iframe src="x"></iframe>نص', 'نص'],
            ['<object data="x"></object>باقي', 'باقي'],
            ['<embed src="x"></embed>هنا', 'هنا'],
            ['<style>body{color:red}</style>نص', 'نص'],
            ['<link href="x"></link>abc', 'abc'],
            ['<meta charset="utf-8"></meta>n', 'n'],
            ['<base href="x"></base>آخر', 'آخر'],
        ];
        for (const [input, expected] of samples) {
            const out = input.replace(CALENDAR_DANGEROUS_BLOCK_TAGS, '');
            expect(out).toBe(expected);
        }
    });

    it('TR-5.2 Phase1 CALENDAR_STRIP_HTML_TAGS يزيل أقواس الوسوم المتبقية فقط', () => {
        expect('<div>أ</div>'.replace(CALENDAR_STRIP_HTML_TAGS, '')).toBe('أ');
        expect('<p class="x"><span>ب</span></p>'.replace(CALENDAR_STRIP_HTML_TAGS, '')).toBe('ب');
        expect('<br/>'.replace(CALENDAR_STRIP_HTML_TAGS, '')).toBe('');
        expect('<img src="x" />'.replace(CALENDAR_STRIP_HTML_TAGS, '')).toBe('');
    });

    it('TR-5.2 stripCalendarHtml() chains Phase0 ثم Phase1 بالترتيب الصحيح', () => {
        const mixed =
            '<script>alert(1)</script>هذا <b>نص</b> داخل <style>x{}</style><div>مختلط</div>.';
        expect(stripCalendarHtml(mixed)).toBe('هذا نص داخل مختلط.');
        expect(stripCalendarHtml(null)).toBe('');
        expect(stripCalendarHtml(undefined)).toBe('');
        expect(stripCalendarHtml(123 as unknown as string)).toBe('');
        expect(stripCalendarHtml({} as unknown as string)).toBe('');
    });

    it('TR-5.1 calendarInputGuard يرفض non-string values opcode throw', () => {
        expect(() => calendarInputGuard(null, '', '', '', '', '')).toThrow(
            /\[calendar:input_security:non_string\]/,
        );
        expect(() => calendarInputGuard(123, '', '', '', '', '')).toThrow(
            /\[calendar:input_security:non_string\]/,
        );
        expect(() => calendarInputGuard('', {}, '', '', '', '')).toThrow(
            /\[calendar:input_security:non_string\]/,
        );
        expect(() => calendarInputGuard('', '', [], '', '', '')).toThrow(
            /\[calendar:input_security:non_string\]/,
        );
    });

    it('TR-5.1 calendarInputGuard يزيل أحرف التحكم (control chars) قبل الحفظ', () => {
        const r = calendarInputGuard(
            'a\u0000b\u0001c\u007Fd',
            'x\u000By',
            'l\u000C',
            'c\u000Ec',
            'lr\u000F',
            'n\u0010',
        );
        expect(r.title).toBe('abcd');
        expect(r.description).toBe('xy');
        expect(r.location).toBe('l');
        expect(r.contact).toBe('cc');
        expect(r.legalRef).toBe('lr');
        expect(r.notes).toBe('n');
    });

    it('TR-5.1 calendarInputGuard يرفض envelope أطوال هجومية قبل clamp', () => {
        const big = 'x'.repeat(25_000);
        expect(() => calendarInputGuard('x'.repeat(6000), '', '', '', '', '')).toThrow(
            /\[calendar:input_security:title_length_envelope\]/,
        );
        expect(() => calendarInputGuard('', big, '', '', '', '')).toThrow(
            /\[calendar:input_security:desc_length_envelope\]/,
        );
        expect(() => calendarInputGuard('', '', big, '', '', '')).toThrow(
            /\[calendar:input_security:location_length_envelope\]/,
        );
        expect(() => calendarInputGuard('', '', '', 'x'.repeat(3000), '', '')).toThrow(
            /\[calendar:input_security:contact_length_envelope\]/,
        );
        expect(() => calendarInputGuard('', '', '', '', big, '')).toThrow(
            /\[calendar:input_security:legalref_length_envelope\]/,
        );
        expect(() => calendarInputGuard('', '', '', '', '', big)).toThrow(
            /\[calendar:input_security:notes_length_envelope\]/,
        );
    });
});

describe('calendarEventForm — 6-Field Strict Clamp Lengths (XS-5.3)', () => {
    it('TR-5.3 clamp-field: title 1→120 حرفاً مع strip أولي', () => {
        const data = { ...EMPTY_FORM, title: '<script>a</script>' + 'ب'.repeat(200), date: '2026-01-01' };
        const out = mapEventFormToCalendarFields(data);
        expect(out.title.length).toBeLessThanOrEqual(120);
        expect(out.title).not.toContain('<script>');
    });

    it('TR-5.3 clamp-field: description 0→2000 / notes 0→1000 / location 0→200 / contact 0→100 / legalRef 0→200', () => {
        const data = {
            ...EMPTY_FORM,
            title: 'T',
            date: '2026-01-01',
            location: 'L'.repeat(500),
            notes: 'N'.repeat(3000),
            clientName: 'C'.repeat(500),
            clientPhone: 'P'.repeat(300),
        };
        const out = mapEventFormToCalendarFields(data);
        expect((out.location ?? '').length).toBeLessThanOrEqual(200);
        expect((out.notes ?? '').length).toBeLessThanOrEqual(1000);
        expect((out.clientName ?? '').length).toBeLessThanOrEqual(200);
        expect((out.clientPhone ?? '').length).toBeLessThanOrEqual(100);
        expect((out.description ?? '').length).toBeLessThanOrEqual(2000);
    });
});

describe('sanitizeProfilePlainText outbound paths (XS-5.4 integration)', () => {
    it('sanitizeProfilePlainText موجود ويعمل بنفس توقيع forum/profile', () => {
        const r = sanitizeProfilePlainText('<script>alert(1)</script>أحمد', 80);
        expect(r).toBe('أحمد');
        expect(r.length).toBeLessThanOrEqual(80);
    });

    it('sanitizeProfilePlainText يحد الطول ويزيل وسوم nested', () => {
        const nested = '<div><p><span>x</span></p></div>' + 'y'.repeat(500);
        const r = sanitizeProfilePlainText(nested, 50);
        expect(r).not.toContain('<div>');
        expect(r).not.toContain('<p>');
        expect(r.length).toBeLessThanOrEqual(50);
    });
});
