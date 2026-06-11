import { FORUM_TOPIC_FILTERS } from './forumFilters';
import { deriveTagsFromContent, normalizeTagLabel } from './utils';

/** وسوم مقترحة للمستودع (نفس التخصصات القانونية في المنتدى) */
export const REPOSITORY_SUGGESTED_TAGS = [...FORUM_TOPIC_FILTERS] as const;

export function formatRepositoryTag(label: string): string {
    const core = normalizeTagLabel(label.replace(/^#/, ''));
    return core ? `#${core}` : '';
}

export function parseRepositoryTagsInput(raw: string, picked: string[] = []): string[] {
    const fromPicked = picked.map(formatRepositoryTag).filter(Boolean);
    const fromRaw = raw
        .split(/[,|\s]+/g)
        .map((x) => formatRepositoryTag(x))
        .filter(Boolean);
    return Array.from(new Set([...fromPicked, ...fromRaw])).slice(0, 12);
}

/** توحيد شكل الوسوم (# + مسافات → _) */
export function normalizeCommunityTags(tags: string[] | undefined): string[] {
    if (!tags?.length) return [];
    return Array.from(new Set(tags.map(formatRepositoryTag).filter(Boolean)));
}

/** دمج الوسوم المحفوظة مع المستنتجة من النص — للمنتدى */
export function resolveCommunityPostTags(content: string, tags?: string[]): string[] {
    return normalizeCommunityTags([...(tags ?? []), ...deriveTagsFromContent(content)]);
}

/** دمج وسوم المستند مع المستنتجة من العنوان والوصف */
export function resolveRepositoryDocTags(
    title: string,
    description: string,
    tags?: string[],
): string[] {
    return normalizeCommunityTags([
        ...(tags ?? []),
        ...deriveTagsFromContent(`${title} ${description}`),
    ]);
}

/** مطابقة تصنيف/وسم — للمنتدى والمستودع */
export function communityTagMatchesFilter(
    tags: string[] | undefined,
    filterLabel: string | null | undefined,
): boolean {
    return repositoryDocMatchesTag(tags, filterLabel ?? null);
}

export function repositoryDocMatchesTag(docTags: string[] | undefined, selectedTag: string | null): boolean {
    if (!selectedTag) return true;
    const normalized = formatRepositoryTag(selectedTag);
    if (!normalized) return true;
    return (docTags ?? []).some((t) => formatRepositoryTag(t) === normalized);
}

/** بحث نصي في عنوان/نوع/وصف/وسوم المستند */
export function repositoryDocMatchesSearch(
    doc: {
        title: string;
        description: string;
        type: string;
        authorName?: string;
        tags?: string[];
    },
    query: string,
): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const docTags = resolveRepositoryDocTags(doc.title, doc.description, doc.tags);
    const parts = [
        doc.title,
        doc.description,
        doc.type,
        doc.authorName ?? '',
        ...docTags,
        ...docTags.map((t) => t.replace(/^#/, '').replace(/_/g, ' ')),
    ];
    return parts.some((part) => part.toLowerCase().includes(q));
}
