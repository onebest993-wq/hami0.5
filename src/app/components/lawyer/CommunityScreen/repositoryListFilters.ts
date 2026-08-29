import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import { ArrowLeftRight } from '@/app/components/ui/icons/ArrowLeftRight';
import { ArrowDownAZ } from '@/app/components/ui/icons/ArrowDownAZ';
import { BookOpen } from '@/app/components/ui/icons/BookOpen';
import { Building2 } from '@/app/components/ui/icons/Building2';
import { Clock } from '@/app/components/ui/icons/Clock';
import { Clock3 } from '@/app/components/ui/icons/Clock3';
import { CreditCard } from '@/app/components/ui/icons/CreditCard';
import { FilePen } from '@/app/components/ui/icons/FilePen';
import { FileText } from '@/app/components/ui/icons/FileText';
import { FolderOpen } from '@/app/components/ui/icons/FolderOpen';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { Home } from '@/app/components/ui/icons/Home';
import { Landmark } from '@/app/components/ui/icons/Landmark';
import { Scale } from '@/app/components/ui/icons/Scale';
import { ScrollText } from '@/app/components/ui/icons/ScrollText';
import { Shield } from '@/app/components/ui/icons/Shield';
import { Sparkles } from '@/app/components/ui/icons/Sparkles';
import { Users } from '@/app/components/ui/icons/Users';
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
