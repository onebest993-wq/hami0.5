import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import {
    ArrowLeftRight,
    ArrowDownAZ,
    BookOpen,
    Building2,
    Clock,
    Clock3,
    CreditCard,
    FilePen,
    FileText,
    FolderOpen,
    Gavel,
    Home,
    Landmark,
    Scale,
    ScrollText,
    Shield,
    Sparkles,
    Users,
} from '@/app/components/ui/lucideIcons';
import { FORUM_TOPIC_FILTERS } from './forumFilters';

export const REPOSITORY_DOCUMENT_TYPES = ['الكل', 'عقد', 'قرار حكم', 'عريضة', 'بحث قانوني', 'أخرى'] as const;

export const REPOSITORY_SORT_OPTIONS = [
    { value: 'newest', label: 'الأحدث أولاً', icon: Sparkles },
    { value: 'oldest', label: 'الأقدم أولاً', icon: Clock },
    { value: 'name', label: 'الاسم أ-ي', icon: ArrowDownAZ },
] as const satisfies ReadonlyArray<{ value: string; label: string; icon: LucideIcon }>;

export type RepositorySortKey = (typeof REPOSITORY_SORT_OPTIONS)[number]['value'];

export const REPOSITORY_TYPE_ICONS: Record<string, LucideIcon> = {
    الكل: FolderOpen,
    عقد: FileText,
    'قرار حكم': Scale,
    عريضة: FilePen,
    'بحث قانوني': BookOpen,
    أخرى: FolderOpen,
};

export function repositorySortLabel(sortBy: string): string {
    return REPOSITORY_SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'الأحدث أولاً';
}

/** التخصصات القانونية — نفس وسوم المنتدى (تنفيذ، جنائي، …) */
export const REPOSITORY_TOPIC_FILTERS = [...FORUM_TOPIC_FILTERS] as const;

export const REPOSITORY_TOPIC_ICONS: Record<string, LucideIcon> = {
    تنفيذ: Gavel,
    مدني: Scale,
    جنائي: Shield,
    'أحوال شخصية': Users,
    شركات: Building2,
    عقاري: Home,
    معاملات: ArrowLeftRight,
    تقاعد: Clock3,
    مصارف: Landmark,
    قروض: CreditCard,
    'كاتب العدل': ScrollText,
};

export function repositoryFilterSummary(
    selectedType: string,
    sortBy: string,
    selectedTag: string | null,
): string {
    if (selectedTag) return selectedTag.replace(/^#/, '');
    if (selectedType !== 'الكل') return selectedType;
    return repositorySortLabel(sortBy);
}

export function repositoryHasActiveListFilters(
    selectedType: string,
    sortBy: string,
    selectedTag: string | null = null,
): boolean {
    return selectedType !== 'الكل' || sortBy !== 'newest' || selectedTag !== null;
}
