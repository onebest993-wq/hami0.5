type TextPhraseToken = {
    text: string;
    start: number;
    end: number;
};

/** يقسّم سطراً إلى كلمات/مقاطع غير فارغة مع فهارس المصدر. */
export function tokenizeTextPhrases(line: string): TextPhraseToken[] {
    const tokens: TextPhraseToken[] = [];
    const re = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(line)) !== null) {
        tokens.push({ text: match[0], start: match.index, end: match.index + match[0].length });
    }
    return tokens;
}
