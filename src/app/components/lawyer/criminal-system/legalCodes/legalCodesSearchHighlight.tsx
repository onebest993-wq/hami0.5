import React from 'react';

type LegalSearchHighlightSegment = {
    text: string;
    highlighted: boolean;
};

/** يقسّم النص إلى مقاطع مطابقة/غير مطابقة لكلمة البحث (نفس منطق includes في الفلتر). */
export function splitLegalSearchHighlightSegments(
    text: string,
    query: string,
): LegalSearchHighlightSegment[] {
    const source = String(text ?? '');
    const needle = String(query ?? '').trim();
    if (!needle || !source) return [{ text: source, highlighted: false }];

    const segments: LegalSearchHighlightSegment[] = [];
    let cursor = 0;
    while (cursor < source.length) {
        const matchIndex = source.indexOf(needle, cursor);
        if (matchIndex === -1) {
            segments.push({ text: source.slice(cursor), highlighted: false });
            break;
        }
        if (matchIndex > cursor) {
            segments.push({ text: source.slice(cursor, matchIndex), highlighted: false });
        }
        segments.push({
            text: source.slice(matchIndex, matchIndex + needle.length),
            highlighted: true,
        });
        cursor = matchIndex + needle.length;
    }
    return segments.length ? segments : [{ text: source, highlighted: false }];
}

export function LegalSearchHighlightedText({
    text,
    query,
    className,
}: {
    text: string;
    query: string;
    className?: string;
}) {
    const segments = splitLegalSearchHighlightSegments(text, query);
    return (
        <span className={className}>
            {segments.map((segment, index) =>
                segment.highlighted ? (
                    <mark
                        key={`${index}-${segment.text}`}
                        className="rounded bg-[#E6C673]/35 text-[#E6C673] font-black px-0.5"
                    >
                        {segment.text}
                    </mark>
                ) : (
                    <React.Fragment key={`${index}-${segment.text}`}>{segment.text}</React.Fragment>
                ),
            )}
        </span>
    );
}
