export const CALENDAR_DANGEROUS_BLOCK_TAGS =
    /<(script|iframe|object|embed|style|link|meta|base)\b[\s\S]*?<\/\1>/gi;

export const CALENDAR_STRIP_HTML_TAGS = /<\/?[^>]+(>|$)/gi;

const CONTROL_CHAR_STRIP = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function stripCalendarHtml(input: unknown): string {
    if (typeof input !== 'string') return '';
    let safe = input.replace(CALENDAR_DANGEROUS_BLOCK_TAGS, '');
    safe = safe.replace(CALENDAR_STRIP_HTML_TAGS, '');
    return safe;
}

type CalendarInputGuardResult = {
    title: string;
    description: string;
    location: string;
    contact: string;
    legalRef: string;
    notes: string;
};

export function calendarInputGuard(
    title: unknown,
    description: unknown,
    location: unknown,
    contact: unknown,
    legalRef: unknown,
    notes: unknown,
): CalendarInputGuardResult {
    const asStr = (v: unknown, field: string): string => {
        if (typeof v !== 'string') {
            throw new Error(
                '[calendar:input_security:non_string] Non-string value for calendar field: ' +
                    field,
            );
        }
        return v;
    };

    const t = asStr(title, 'title').replace(CONTROL_CHAR_STRIP, '');
    const d = asStr(description, 'description').replace(CONTROL_CHAR_STRIP, '');
    const l = asStr(location, 'location').replace(CONTROL_CHAR_STRIP, '');
    const c = asStr(contact, 'contact').replace(CONTROL_CHAR_STRIP, '');
    const lr = asStr(legalRef, 'legalRef').replace(CONTROL_CHAR_STRIP, '');
    const n = asStr(notes, 'notes').replace(CONTROL_CHAR_STRIP, '');

    if (t.length > 5000) {
        throw new Error(
            '[calendar:input_security:title_length_envelope] Calendar title envelope exceeded (max 5000 chars before clamp)',
        );
    }
    if (d.length > 20_000) {
        throw new Error(
            '[calendar:input_security:desc_length_envelope] Calendar description envelope exceeded (max 20000 chars before clamp)',
        );
    }
    if (l.length > 5000) {
        throw new Error(
            '[calendar:input_security:location_length_envelope] Calendar location envelope exceeded (max 5000 chars before clamp)',
        );
    }
    if (c.length > 2000) {
        throw new Error(
            '[calendar:input_security:contact_length_envelope] Calendar contact envelope exceeded (max 2000 chars before clamp)',
        );
    }
    if (lr.length > 5000) {
        throw new Error(
            '[calendar:input_security:legalref_length_envelope] Calendar legalRef envelope exceeded (max 5000 chars before clamp)',
        );
    }
    if (n.length > 20_000) {
        throw new Error(
            '[calendar:input_security:notes_length_envelope] Calendar notes envelope exceeded (max 20000 chars before clamp)',
        );
    }

    return {
        title: stripCalendarHtml(t),
        description: stripCalendarHtml(d),
        location: stripCalendarHtml(l),
        contact: stripCalendarHtml(c),
        legalRef: stripCalendarHtml(lr),
        notes: stripCalendarHtml(n),
    };
}
