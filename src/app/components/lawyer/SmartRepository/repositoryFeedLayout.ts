import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import { isVoiceNote } from '@/app/components/lawyer/dashboard/notepadNoteUtils';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';

/** أنماط عرض خلاصة المستودع الحية — شبكة أو قائمة فقط */
export type RepositoryFeedLayoutId = 'grid' | 'list';

export type RepositoryCardVariant = 'manuscript' | 'voice' | 'dossier' | 'media' | 'document';

export type RepositoryCardInnerLayout = 'stack' | 'row';

const REPO_FEED_LAYOUT_STORAGE_KEY = 'hami:repository-feed-layout';

export const REPOSITORY_FEED_LAYOUT_DEFAULT: RepositoryFeedLayoutId = 'grid';

/** مفاتيح تخزين قديمة تُطبَّع إلى شبكة/قائمة دون كسر الحسابات المحفوظة */
const LEGACY_STORED_LAYOUT_IDS = new Set(['grid', 'list', 'compact', 'timeline', 'gallery']);

/** يحوّل التخطيطات القديمة (مدمج، زمني، معرض) إلى أقرب نمط أساسي */
export function normalizeRepositoryFeedLayout(id: string): RepositoryFeedLayoutId {
    return id === 'list' ? 'list' : 'grid';
}

export function loadRepositoryFeedLayout(): RepositoryFeedLayoutId {
    const stored = persistenceRepository.load<string>(REPO_FEED_LAYOUT_STORAGE_KEY);
    if (stored && LEGACY_STORED_LAYOUT_IDS.has(stored)) {
        return normalizeRepositoryFeedLayout(stored);
    }
    return REPOSITORY_FEED_LAYOUT_DEFAULT;
}

export function persistRepositoryFeedLayout(id: string): void {
    persistenceRepository.save(REPO_FEED_LAYOUT_STORAGE_KEY, normalizeRepositoryFeedLayout(id));
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
    return layoutId === 'list' ? 'row' : 'stack';
}

export function getRepositoryFeedContainerClass(layoutId: RepositoryFeedLayoutId): string {
    if (layoutId === 'list') {
        return 'flex flex-col gap-2.5 sm:gap-3 max-w-none';
    }
    return 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3 content-start';
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
};

export function resolveRepositoryCardArticleClass(args: {
    item: RepositoryFeedItem;
    layoutId: RepositoryFeedLayoutId;
    baseCardClass: string;
}): string {
    const variant = resolveRepositoryCardVariant(args.item);
    const inner = resolveRepositoryCardInnerLayout(args.layoutId);
    const height =
        args.layoutId === 'grid'
            ? 'h-full flex flex-col'
            : inner === 'row'
              ? 'hami-repo-card--row'
              : '';
    return [args.baseCardClass, VARIANT_SHELL[variant], LAYOUT_SHELL[args.layoutId], height]
        .filter(Boolean)
        .join(' ');
}
