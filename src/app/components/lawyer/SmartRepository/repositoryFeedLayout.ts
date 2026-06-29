import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import { isVoiceNote } from '@/app/components/lawyer/dashboard/notepadNoteUtils';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';

/** أنماط عرض خلاصة المستودع — مستقلة عن عرض الخزنة */
export type RepositoryFeedLayoutId = 'grid' | 'list' | 'compact' | 'timeline' | 'gallery';

export type RepositoryCardVariant = 'manuscript' | 'voice' | 'dossier' | 'media' | 'document';

export type RepositoryCardInnerLayout = 'stack' | 'row' | 'compact' | 'timeline';

const REPO_FEED_LAYOUT_STORAGE_KEY = 'hami:repository-feed-layout';

export const REPOSITORY_FEED_LAYOUT_DEFAULT: RepositoryFeedLayoutId = 'grid';

export interface RepositoryFeedLayoutOption {
    id: RepositoryFeedLayoutId;
    label: string;
    shortLabel: string;
    hint: string;
}

export const REPOSITORY_FEED_LAYOUT_OPTIONS: RepositoryFeedLayoutOption[] = [
    {
        id: 'grid',
        label: 'شبكة بطاقات',
        shortLabel: 'شبكة',
        hint: 'بطاقات متوازنة — مناسبة للملاحظات والملفات معاً',
    },
    {
        id: 'list',
        label: 'قائمة أفقية',
        shortLabel: 'قائمة',
        hint: 'صف واحد لكل عنصر — قراءة سريعة للنصوص الطويلة',
    },
    {
        id: 'compact',
        label: 'مدمج',
        shortLabel: 'مدمج',
        hint: 'صفوف كثيفة — أقصى عدد في الشاشة',
    },
    {
        id: 'timeline',
        label: 'خط زمني',
        shortLabel: 'زمني',
        hint: 'ترتيب زمني بصري — ممتاز للملاحظات الكتابية',
    },
    {
        id: 'gallery',
        label: 'معرض',
        shortLabel: 'معرض',
        hint: 'إبراز الصور والملفات — نصوص بعرض مركزي أنيق',
    },
];

const VALID_LAYOUT_IDS = new Set<string>(REPOSITORY_FEED_LAYOUT_OPTIONS.map((o) => o.id));

export function loadRepositoryFeedLayout(): RepositoryFeedLayoutId {
    const stored = persistenceRepository.load<string>(REPO_FEED_LAYOUT_STORAGE_KEY);
    if (stored && VALID_LAYOUT_IDS.has(stored)) {
        return stored as RepositoryFeedLayoutId;
    }
    return REPOSITORY_FEED_LAYOUT_DEFAULT;
}

export function persistRepositoryFeedLayout(id: RepositoryFeedLayoutId): void {
    persistenceRepository.save(REPO_FEED_LAYOUT_STORAGE_KEY, id);
}

export function resolveRepositoryCardVariant(item: RepositoryFeedItem): RepositoryCardVariant {
    if (item.kind === 'dossier') return 'dossier';
    if (item.kind === 'vault_doc') {
        return item.doc.type === 'image' ? 'media' : 'document';
    }
    if (item.kind === 'global' && isVoiceNote(item.note)) return 'voice';
    return 'manuscript';
}

export function resolveRepositoryCardInnerLayout(layoutId: RepositoryFeedLayoutId): RepositoryCardInnerLayout {
    if (layoutId === 'list') return 'row';
    if (layoutId === 'compact') return 'compact';
    if (layoutId === 'timeline') return 'timeline';
    return 'stack';
}

export function getRepositoryFeedContainerClass(layoutId: RepositoryFeedLayoutId): string {
    switch (layoutId) {
        case 'grid':
            return 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3 content-start';
        case 'list':
            return 'flex flex-col gap-2.5 sm:gap-3 max-w-none';
        case 'compact':
            return 'flex flex-col gap-1.5';
        case 'timeline':
            return 'flex flex-col gap-0 relative pr-3 sm:pr-4';
        case 'gallery':
            return 'columns-1 sm:columns-2 xl:columns-3 gap-2.5 sm:gap-3 [column-fill:balance]';
        default:
            return 'flex flex-col gap-3';
    }
}

export function getRepositoryFeedItemClass(layoutId: RepositoryFeedLayoutId): string {
    if (layoutId === 'gallery') {
        return 'break-inside-avoid mb-2.5 sm:mb-3';
    }
    if (layoutId === 'timeline') {
        return 'relative pb-4 last:pb-0';
    }
    return '';
}

const VARIANT_SHELL: Record<RepositoryCardVariant, string> = {
    manuscript: 'hami-repo-card--manuscript',
    voice: 'hami-repo-card--voice',
    dossier: 'hami-repo-card--dossier',
    media: 'hami-repo-card--media',
    document: 'hami-repo-card--document',
};

const LAYOUT_SHELL: Record<RepositoryFeedLayoutId, string> = {
    grid: 'hami-repo-layout--grid',
    list: 'hami-repo-layout--list',
    compact: 'hami-repo-layout--compact',
    timeline: 'hami-repo-layout--timeline',
    gallery: 'hami-repo-layout--gallery',
};

export function resolveRepositoryCardArticleClass(args: {
    item: RepositoryFeedItem;
    layoutId: RepositoryFeedLayoutId;
    baseCardClass: string;
}): string {
    const variant = resolveRepositoryCardVariant(args.item);
    const inner = resolveRepositoryCardInnerLayout(args.layoutId);
    const height =
        args.layoutId === 'grid' || args.layoutId === 'gallery'
            ? 'h-full flex flex-col'
            : inner === 'row'
              ? 'hami-repo-card--row'
              : '';
    return [
        args.baseCardClass,
        VARIANT_SHELL[variant],
        LAYOUT_SHELL[args.layoutId],
        height,
    ]
        .filter(Boolean)
        .join(' ');
}

export function repositoryFeedLayoutLabel(id: RepositoryFeedLayoutId): string {
    return REPOSITORY_FEED_LAYOUT_OPTIONS.find((o) => o.id === id)?.shortLabel ?? 'العرض';
}
