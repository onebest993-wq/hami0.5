import { normalizeArabic } from '@/app/components/lawyer/LawyerShared';

const MIN_TOKEN_LEN = 2;

function norm(value: string): string {
    return normalizeArabic(value).toLowerCase().replace(/\s+/g, ' ').trim();
}

export function clusterTextIncludes(needle: string, haystack: string): boolean {
    const n = norm(needle);
    const h = norm(haystack);
    if (n.length < MIN_TOKEN_LEN) return false;
    return h.includes(n);
}

export type { ClusterMatchReason } from './clusterMatchRules';
export { clusterMatchReason } from './clusterMatchRules';
