import type { ExecutionLawArticle } from '@/data/executionLaws';
import { normalizeLawSearchText } from '@/data/executionLawSearchNormalize';

export function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildArabicLooseSearchPattern(rawHighlight: string): string {
    const norm = normalizeLawSearchText(rawHighlight);
    const cleaned = norm.replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';
    const tokenToPattern = (token: string): string => {
        const letters = [...token].filter((ch) => ch.trim().length > 0);
        if (!letters.length) return '';
        const charToPattern = (ch: string): string => {
            if (ch === 'ا') return '[اأإآٱ]';
            if (ch === 'ه') return '[هة]';
            if (ch === 'ي') return '[يى]';
            return escapeRegExp(ch);
        };
        return letters.map(charToPattern).join('[\\u064B-\\u0652]*');
    };
    const tokens = cleaned.split(' ').map(tokenToPattern).filter(Boolean);
    return tokens.join('\\s+');
}

export function splitTextByArabicLooseHighlight(text: string, highlight: string): string[] {
    const raw = String(text ?? '');
    const pat = buildArabicLooseSearchPattern(highlight);
    if (!pat) return [raw];
    const splitRe = new RegExp(`(${pat})`, 'gi');
    return raw.split(splitRe);
}

export function isArabicLooseHighlightMatch(part: string, highlight: string): boolean {
    const pat = buildArabicLooseSearchPattern(highlight);
    if (!part || !pat) return false;
    return new RegExp(pat, 'i').test(part);
}

export function mergeLocalTitlesIntoExecutionArticles(
    articles: ExecutionLawArticle[],
    localSeed: ExecutionLawArticle[]
): ExecutionLawArticle[] {
    const titleByNum = new Map(localSeed.map((a) => [a.number, a.title]));
    return articles.map((a) => ({
        ...a,
        title: String(a.title || '').trim() || titleByNum.get(a.number) || '',
    }));
}
